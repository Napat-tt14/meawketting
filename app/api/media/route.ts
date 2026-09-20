import { readMedia, uploadMedia } from "../../_backend/media";
import { asBe1Error } from "../../_backend/be1/errors";
export const dynamic = "force-dynamic";
async function handle(request: Request, action: (request: Request) => Promise<Response>) {
  try { return await action(request); }
  catch (error) { const failure = asBe1Error(error); return Response.json({ ok: false, error: { code: failure.code, message: failure.message } }, { status: failure.status, headers: { "cache-control": "no-store" } }); }
}
export const POST = (request: Request) => handle(request, uploadMedia);
export const GET = (request: Request) => handle(request, readMedia);
