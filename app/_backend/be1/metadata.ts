import type { Be1ResponseMetadata } from "./contracts";

export type RequestMetadata = Be1ResponseMetadata & {
  receivedAt: string;
};

const SAFE_CORRELATION_ID = /^[A-Za-z0-9._:-]{8,128}$/;

export function createRequestMetadata(headers: Headers, now = new Date().toISOString()): RequestMetadata {
  const supplied = headers.get("x-correlation-id")?.trim() ?? "";
  return {
    requestId: crypto.randomUUID(),
    correlationId: SAFE_CORRELATION_ID.test(supplied) ? supplied : crypto.randomUUID(),
    receivedAt: now,
  };
}
