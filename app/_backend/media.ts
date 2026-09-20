import { createClient } from "@supabase/supabase-js";
import { PostgresBe1Repository } from "./be1/postgresRepository";
import { BusinessApplication } from "./shared/application";
import { be1Error } from "./be1/errors";
import { createRequestMetadata } from "./be1/metadata";
import { resolveIdentity } from "./be1/identity";
import { backendContext, database } from "./runtime";
import { authorizationGuard, batch, deleteGuard } from "./shared/database";
import { requireSameOrigin } from "./shared/requestSecurity";

export const MEDIA_BUCKET = "business-media";
export const MEDIA_LIMIT = 10 * 1024 * 1024;
const kinds = ["business-logo", "pet-photo", "grooming-before", "grooming-after", "hotel", "daycare"] as const;
type Media = { id: string; business_id: string; branch_id: string | null; kind: typeof kinds[number]; pet_id: string | null; execution_id: string | null; object_path: string };

export function imageType(bytes: Uint8Array) {
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.subarray(0,4)) === "RIFF" && new TextDecoder().decode(bytes.subarray(8,12)) === "WEBP") return "image/webp";
  throw be1Error("INVALID_INPUT");
}
function storage() {
  const { env } = backendContext();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || new URL(env.SUPABASE_URL).protocol !== "https:") throw be1Error("AUTHENTICATION_NOT_CONFIGURED");
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(MEDIA_BUCKET);
}
async function authorize(request: Request, target: Media, write: boolean) {
  const db = database(), app = new BusinessApplication(new PostgresBe1Repository(db));
  const identity = await resolveIdentity(request, backendContext().env.MEAWKETTING_AUTH_MODE, db);
  const actor = await app.resolvePerson(identity.personId), metadata = createRequestMetadata(request.headers), occurredAt = new Date().toISOString();
  if (target.kind === "business-logo") {
    const { membership } = await app.resolveMembership(actor, target.business_id);
    if (write && membership.role !== "OWNER") throw be1Error("FORBIDDEN");
    return { actor, membership, metadata, occurredAt };
  }
  if (!target.branch_id) throw be1Error("INVALID_INPUT");
  const scope = await app.scope(actor, target.business_id, target.branch_id, metadata, occurredAt, write);
  if (target.kind === "pet-photo") {
    if (!target.pet_id || !await db.prepare("SELECT 1 FROM business_pet_profiles WHERE business_id=? AND pet_id=? AND status='active'").bind(target.business_id, target.pet_id).first()) throw be1Error("NOT_FOUND");
  } else {
    const serviceModule = target.kind.startsWith("grooming") ? "grooming" : target.kind;
    if (!target.execution_id || !target.pet_id || !await db.prepare("SELECT 1 FROM service_executions WHERE business_id=? AND branch_id=? AND id=? AND pet_id=? AND module=?")
      .bind(target.business_id, target.branch_id, target.execution_id, target.pet_id, serviceModule).first()) throw be1Error("NOT_FOUND");
  }
  return scope;
}

export async function uploadMedia(request: Request) {
  requireSameOrigin(request);
  const params = new URL(request.url).searchParams, kind = params.get("kind") as Media["kind"];
  if (!kinds.includes(kind) || !request.body) throw be1Error("INVALID_INPUT");
  const id = crypto.randomUUID();
  const target: Media = { id, kind, business_id: params.get("businessId") ?? "", branch_id: params.get("branchId"), pet_id: params.get("petId"), execution_id: params.get("executionId"), object_path: `${crypto.randomUUID()}/${id}` };
  if (kind === "business-logo" && (target.branch_id || target.pet_id || target.execution_id)) throw be1Error("INVALID_INPUT");
  await authorize(request, target, true);
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > MEDIA_LIMIT) { await reader.cancel(); throw be1Error("INVALID_INPUT"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (!size) throw be1Error("INVALID_INPUT");
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const contentType = imageType(bytes);
  if (request.headers.get("content-type") !== contentType) throw be1Error("INVALID_INPUT");
  const bucket = storage();
  const { error } = await bucket.upload(target.object_path, bytes, { contentType, upsert: false });
  if (error) throw be1Error("PERSISTENCE_ERROR");
  try {
    const context = await authorize(request, target, true), db = database(), token = crypto.randomUUID();
    const guard = target.branch_id ? authorizationGuard(db, context, target.branch_id, token) : db.prepare(`INSERT INTO backend_guards(id,allowed)
      SELECT ?, (EXISTS(SELECT 1 FROM persons p JOIN business_memberships m ON m.person_id=p.id JOIN businesses b ON b.id=m.business_id
      WHERE p.id=? AND p.status='active' AND m.id=? AND m.business_id=? AND m.role='OWNER' AND m.status='active' AND b.status='active'))::integer`)
      .bind(token, context.actor.id, context.membership.id, target.business_id);
    await batch(db, [guard, db.prepare(`INSERT INTO media_objects(id,business_id,branch_id,kind,pet_id,execution_id,object_path,content_type,byte_size,created_by)
      VALUES(?::uuid,?,?,?,?,?,?,?,?,?)`).bind(id, target.business_id, target.branch_id, kind, target.pet_id, target.execution_id, target.object_path, contentType, size, context.actor.id), deleteGuard(db, token)]);
  } catch (error) { await bucket.remove([target.object_path]); throw error; }
  return Response.json({ id }, { status: 201, headers: { "cache-control": "no-store" } });
}
export async function readMedia(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) throw be1Error("INVALID_INPUT");
  const target = await database().prepare("SELECT * FROM media_objects WHERE id=?::uuid").bind(id).first<Media>();
  if (!target) throw be1Error("NOT_FOUND");
  await authorize(request, target, false);
  const { data, error } = await storage().createSignedUrl(target.object_path, 60);
  if (error || !data.signedUrl) throw be1Error("PERSISTENCE_ERROR");
  return Response.json({ url: data.signedUrl, expiresIn: 60 }, { headers: { "cache-control": "private, no-store" } });
}
