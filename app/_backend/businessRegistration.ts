import { authClient } from "./supabaseAuth";
import { database } from "./runtime";
import { asBe1Error, be1Error } from "./be1/errors";
import { readJson } from "./shared/http";
import { requireSameOrigin } from "./shared/requestSecurity";
import { normalizeBranchNameKey } from "./be1/validation";

async function identity() {
  const { data, error } = await authClient().auth.getUser();
  if (error || !data.user || data.user.is_anonymous) throw be1Error("UNAUTHENTICATED");
  if (!["google", "custom:line"].includes(data.user.app_metadata.provider ?? "")) throw be1Error("FORBIDDEN");
  return data.user;
}

function validate(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw be1Error("INVALID_INPUT");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["displayName", "businessName", "branchName", "phone", "email", "modules", "confirmed"].includes(key)) || input.confirmed !== true) throw be1Error("INVALID_INPUT");
  const field = (key: string, max: number, optional = false) => {
    const v = input[key];
    if (typeof v !== "string" || v.trim().length > max || (!optional && !v.trim()) || [...v].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw be1Error("INVALID_INPUT");
    return v.trim();
  };
  const displayName = field("displayName", 120), businessName = field("businessName", 160), branchName = field("branchName", 160);
  const phone = field("phone", 30), email = field("email", 254, true);
  if (!/^\+?[0-9 ()-]{8,30}$/.test(phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw be1Error("INVALID_INPUT");
  if (!Array.isArray(input.modules) || !input.modules.length || input.modules.length > 3 || input.modules.some(m => !["grooming", "hotel", "daycare"].includes(m)) || new Set(input.modules).size !== input.modules.length) throw be1Error("INVALID_INPUT");
  return { displayName, businessName, branchName, phone, email, modules: [...input.modules as string[]].sort(), confirmed: true };
}

/** Account-scoped transaction lock serializes retries before any authority is created. */
export async function registerBusiness(value: unknown) {
  const user = await identity();
  const input = validate(value);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)))), b => b.toString(16).padStart(2,"0")).join("");
  const db = database();
  return db.sql.begin(async tx => {
    await tx.unsafe(`SET LOCAL search_path TO "${db.schema}", pg_catalog`);
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${user.id}, 0))`;
    const [receipt] = await tx`SELECT r.*, p.status person_status, b.status business_status, m.status membership_status
      FROM business_registrations r JOIN auth_person_links l USING(auth_user_id)
      JOIN persons p ON p.id=l.person_id JOIN businesses b ON b.id=r.business_id
      JOIN business_memberships m ON m.person_id=p.id AND m.business_id=b.id WHERE r.auth_user_id=${user.id}::uuid`;
    if (receipt) {
      if ([receipt.person_status, receipt.business_status, receipt.membership_status].some(s => s !== "active")) throw be1Error("FORBIDDEN");
      if (receipt.request_hash !== hash) throw be1Error("CONFLICT");
      return { businessId: receipt.business_id as string, branchId: receipt.branch_id as string };
    }
    if ((await tx`SELECT 1 FROM auth_person_links WHERE auth_user_id=${user.id}::uuid`).length) throw be1Error("FORBIDDEN");
    const personId = crypto.randomUUID(), businessId = crypto.randomUUID(), branchId = crypto.randomUUID(), membershipId = crypto.randomUUID();
    const now = new Date().toISOString();
    await tx`INSERT INTO persons(id,display_name,primary_email,created_at,updated_at) VALUES(${personId},${input.displayName},${user.email ?? null},${now},${now})`;
    await tx`INSERT INTO businesses(id,name,contact_name,phone,email,created_at,updated_at,created_by_person_id,updated_by_person_id)
      VALUES(${businessId},${input.businessName},${input.displayName},${input.phone},${input.email},${now},${now},${personId},${personId})`;
    await tx`INSERT INTO branches(id,business_id,name,name_key,phone,email,created_at,updated_at,created_by_person_id,updated_by_person_id)
      VALUES(${branchId},${businessId},${input.branchName},${normalizeBranchNameKey(input.branchName)},${input.phone},${input.email},${now},${now},${personId},${personId})`;
    await tx`INSERT INTO business_memberships(id,person_id,business_id,role,created_at,updated_at,created_by_person_id,updated_by_person_id)
      VALUES(${membershipId},${personId},${businessId},'OWNER',${now},${now},${personId},${personId})`;
    for (const service of input.modules) await tx`INSERT INTO branch_enabled_modules(business_id,branch_id,module,created_at,created_by_person_id) VALUES(${businessId},${branchId},${service},${now},${personId})`;
    for (const day of ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]) {
      await tx`INSERT INTO branch_operating_hours(business_id,branch_id,weekday,closed,opens_at,closes_at,updated_at,updated_by_person_id)
        VALUES(${businessId},${branchId},${day},1,'09:00','18:00',${now},${personId})`;
    }
    await tx`INSERT INTO auth_person_links(auth_user_id,person_id) VALUES(${user.id}::uuid,${personId})`;
    await tx`INSERT INTO business_registrations(auth_user_id,business_id,branch_id,request_hash) VALUES(${user.id}::uuid,${businessId},${branchId},${hash})`;
    const requestId = crypto.randomUUID();
    await tx`INSERT INTO audit_events(id,actor_person_id,actor_membership_id,business_id,branch_id,request_id,correlation_id,action,target_type,target_id,after_json,occurred_at)
      VALUES(${crypto.randomUUID()},${personId},${membershipId},${businessId},${branchId},${requestId},${requestId},'business.register','business',${businessId},${JSON.stringify({ confirmed: true, policy: "self-service-2026-09-20", modules: input.modules })},${now})`;
    return { businessId, branchId };
  });
}

export async function registrationRequest(request: Request) {
  const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
  try {
    if (request.method === "GET") {
      const user = await identity();
      const linked = await database().prepare("SELECT person_id FROM auth_person_links WHERE auth_user_id=?::uuid").bind(user.id).first();
      return Response.json({ authenticated: true, registered: !!linked }, { headers });
    }
    requireSameOrigin(request);
    const result = await registerBusiness(await readJson(request, 4096));
    return Response.json(result, { headers });
  } catch (error) {
    const failure = asBe1Error(error);
    return Response.json({ error: failure.code }, { status: failure.status, headers });
  }
}
