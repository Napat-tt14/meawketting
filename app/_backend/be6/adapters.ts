import { be1Error } from "../be1/errors";
import { integer, object, string } from "../shared/validation";
import type { ChannelAdapter, IncomingMessage, SendEnvelope, SendOutcome } from "./contracts";

async function hmacKey(secret: string) { return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify", "sign"]); }
export async function verifySignature(secret: string, raw: Uint8Array, signature: string) {
  if (!secret || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  try { return await crypto.subtle.verify("HMAC", await hmacKey(secret), Uint8Array.from(atob(signature), (s) => s.charCodeAt(0)), new Uint8Array(raw)); } catch { return false; }
}
export async function testSignature(secret: string, raw: Uint8Array) { return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), new Uint8Array(raw))))); }

/** Text transport only. OA credentials are supplied by a server secret resolver, never by a Business request. */
export class LineChannelAdapter implements ChannelAdapter {
  readonly provider = "line" as const;
  constructor(private readonly secret: string, private readonly accessToken: string, private readonly transport: typeof fetch = fetch) {}
  verify(raw: Uint8Array, signature: string) { return verifySignature(this.secret, raw, signature); }
  decode(raw: Uint8Array, accountId: string): IncomingMessage[] {
    let value: unknown; try { value = JSON.parse(new TextDecoder().decode(raw)); } catch { throw be1Error("INVALID_INPUT"); }
    const body = object(value);
    if (body.destination !== accountId || !Array.isArray(body.events) || body.events.length > 100) throw be1Error("INVALID_INPUT");
    return body.events.flatMap((item) => {
      const event = object(item);
      if (event.type !== "message") return [];
      const message = object(event.message), source = object(event.source);
      // Group identities, postbacks and attachment permissions require separate product/channel work.
      if (message.type !== "text" || source.type !== "user") return [];
      return [{ eventId: string(event.webhookEventId, 100, true), providerMessageId: string(message.id, 100, true), externalSubject: string(source.userId, 200, true), text: string(message.text, 5000, true), occurredAt: new Date(integer(event.timestamp, 0, 8640000000000000)).toISOString() }];
    });
  }
  async send(envelope: SendEnvelope): Promise<SendOutcome> {
    if (!this.accessToken) return { state: "not-connected", code: "credentials-unavailable" };
    try {
      const response = await this.transport("https://api.line.me/v2/bot/message/push", { method: "POST", headers: { authorization: `Bearer ${this.accessToken}`, "content-type": "application/json", "X-Line-Retry-Key": envelope.retryKey },
        body: JSON.stringify({ to: envelope.recipient, messages: [{ type: "text", text: envelope.text }] }), signal: AbortSignal.timeout(15000), redirect: "error" });
      if (response.ok || (response.status === 409 && response.headers.has("x-line-accepted-request-id"))) {
        const body = await response.json().catch(() => ({})) as { sentMessages?: { id?: unknown }[] };
        const id = body.sentMessages?.[0]?.id;
        return { state: "accepted", providerMessageId: typeof id === "string" ? id.slice(0, 200) : null, providerRequestId: (response.headers.get("x-line-accepted-request-id") ?? response.headers.get("x-line-request-id"))?.slice(0, 200) ?? null };
      }
      return { state: response.status >= 500 ? "retry" : "failed", code: `provider-http-${response.status}` };
    } catch { return { state: "retry", code: "provider-network" }; }
  }
}

/** Explicit test provider. It cannot be selected by the production secret resolver. */
export class MockChannelAdapter implements ChannelAdapter {
  readonly provider = "mock" as const;
  readonly accepted = new Map<string, SendEnvelope>();
  failures: SendOutcome[] = [];
  constructor(private readonly secret = "fictional-test-channel-secret") {}
  verify(raw: Uint8Array, signature: string) { return verifySignature(this.secret, raw, signature); }
  decode(raw: Uint8Array, accountId: string) { return new LineChannelAdapter(this.secret, "").decode(raw, accountId); }
  async send(envelope: SendEnvelope): Promise<SendOutcome> {
    const failure = this.failures.shift(); if (failure) return failure;
    const previous = this.accepted.get(envelope.retryKey);
    if (previous && JSON.stringify(previous) !== JSON.stringify(envelope)) return { state: "failed", code: "test-idempotency-mismatch" };
    this.accepted.set(envelope.retryKey, structuredClone(envelope));
    return { state: "accepted", providerMessageId: `mock-${envelope.retryKey}`, providerRequestId: `test-request-${envelope.retryKey}` };
  }
}
