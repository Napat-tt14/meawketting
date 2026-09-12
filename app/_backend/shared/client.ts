import { BE1_DEV_ACTOR_HEADER, BE1_DEV_OWNER_PERSON_ID } from "../be1/contracts";

export class BusinessRequestError extends Error {
  constructor(readonly code: string, readonly reason: string | undefined, message: string) { super(message); }
}
export async function businessCommand<T>(path: string, operation: unknown): Promise<T> {
  const headers = new Headers({ "content-type": "application/json", "x-correlation-id": crypto.randomUUID() });
  if (process.env.NODE_ENV !== "production") headers.set(BE1_DEV_ACTOR_HEADER, BE1_DEV_OWNER_PERSON_ID);
  const response = await fetch(path, { method: "POST", headers, body: JSON.stringify(operation), credentials: "same-origin", cache: "no-store" });
  const body = await response.json() as { ok: true; data: T } | { ok: false; error: { code: string; reason?: string; message: string } };
  if (!body.ok) throw new BusinessRequestError(body.error.code, body.error.reason, body.error.message);
  if (!response.ok) throw new BusinessRequestError("TRANSPORT_ERROR", undefined, "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
  return body.data;
}
