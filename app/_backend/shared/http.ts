import { asBe1Error, be1Error } from "../be1/errors";
import { DevTestIdentityAdapter } from "../be1/identity";
import { createRequestMetadata, type RequestMetadata } from "../be1/metadata";
import { BackendConflict } from "./errors";

/** Reads a bounded body before parsing. Does not log credentials, notes or tokens. */
export async function readJson(request: Request, limit = 65536): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw be1Error("INVALID_INPUT");
  if (Number(request.headers.get("content-length") ?? 0) > limit) throw be1Error("INVALID_INPUT");
  const reader = request.body?.getReader();
  if (!reader) throw be1Error("INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw be1Error("INVALID_INPUT"); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { throw be1Error("INVALID_INPUT"); }
  finally { reader.releaseLock(); }
}

export async function businessRequest(request: Request, authMode: string | undefined,
  execute: (personId: string, body: unknown, metadata: RequestMetadata) => Promise<unknown>) {
  const metadata = createRequestMetadata(request.headers);
  const headers = { "cache-control": "no-store", "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff",
    "x-request-id": metadata.requestId, "x-correlation-id": metadata.correlationId };
  const meta = { requestId: metadata.requestId, correlationId: metadata.correlationId };
  try {
    const identity = await new DevTestIdentityAdapter(authMode).resolve(request);
    const data = await execute(identity.personId, await readJson(request), metadata);
    return new Response(JSON.stringify({ ok: true, data, meta }), { headers });
  } catch (error) {
    const failure = asBe1Error(error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof BackendConflict
      ? { code: "CONFLICT", reason: error.reason, message: "ข้อมูลเปลี่ยนแปลงหรือไม่พร้อมใช้งาน กรุณาโหลดข้อมูลล่าสุดแล้วลองอีกครั้ง" }
      : { code: failure.code, message: failure.message }, meta }), { status: error instanceof BackendConflict ? 409 : failure.status, headers });
  }
}
