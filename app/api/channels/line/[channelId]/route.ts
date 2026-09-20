import { env } from "cloudflare:workers";
import { asBe1Error } from "../../../../_backend/be1/errors";
import { database as getDatabase } from "../../../../_backend/runtime";
import { validateId } from "../../../../_backend/be1/validation";
import { lineSecretResolver } from "../../../../_backend/be6/lineSecrets";
import { InboxTransport } from "../../../../_backend/be6/transport";
import { BackendConflict } from "../../../../_backend/shared/errors";

export async function POST(request: Request, context: { params: Promise<{ channelId: string }> }) {
  const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
  const signature = request.headers.get("x-line-signature") ?? "";
  // Reject unauthenticated probes before PostgreSQL; do not reveal channel provisioning.
  if (!/^[A-Za-z0-9+/]{43}=$/.test(signature) || !env.MEAWKETTING_LINE_CREDENTIALS) return new Response(null, { status: 401, headers });
  try {
    const reader = request.body?.getReader(); if (!reader) return new Response(null, { status: 400, headers });
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 65536) { await reader.cancel(); return new Response(null, { status: 413, headers }); } chunks.push(part.value); }
    } finally { reader.releaseLock(); }
    const raw = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.length; }
    const transport = new InboxTransport(getDatabase(), lineSecretResolver(env.MEAWKETTING_LINE_CREDENTIALS));
    await transport.webhook(validateId((await context.params).channelId), raw, signature);
    return new Response(null, { status: 200, headers });
  } catch (error) {
    const status = error instanceof BackendConflict ? 409 : asBe1Error(error).status;
    return new Response(null, { status: [401, 404, 501].includes(status) ? 401 : status, headers });
  }
}
