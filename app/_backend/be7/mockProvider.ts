import { be1Error } from "../be1/errors";
import { hash } from "../shared/validation";
import type { PaymentIntent, PaymentProvider, PaymentProviderEvent, ProviderOutcome } from "./contracts";
import { parseProviderEvent } from "./providerService";

/** Explicit DEV/TEST adapter; never configured by the production API or Worker. */
export class MockPaymentProvider implements PaymentProvider {
  readonly provider = "mock";
  readonly intents = new Map<string, { hash: string; outcome: ProviderOutcome }>();
  readonly outcomes: ProviderOutcome[] = [];
  createCalls = 0; reconcileCalls = 0;
  constructor(private readonly secret: string, private readonly clock = () => new Date().toISOString()) {}
  async create(intent: PaymentIntent): Promise<ProviderOutcome> {
    this.createCalls += 1; const digest = await hash(intent), old = this.intents.get(intent.idempotencyKey);
    if (old) { if (old.hash !== digest) throw be1Error("INVALID_INPUT"); return old.outcome; }
    const outcome = this.outcomes.shift() ?? { state: "succeeded", providerReference: `mock-${intent.attemptId}`, amountMinor: intent.amountMinor, currency: "THB", occurredAt: this.clock() };
    this.intents.set(intent.idempotencyKey, { hash: digest, outcome }); return outcome;
  }
  async reconcile(intent: PaymentIntent): Promise<ProviderOutcome> {
    this.reconcileCalls += 1; const old = this.intents.get(intent.idempotencyKey);
    if (old && old.hash !== await hash(intent)) throw be1Error("INVALID_INPUT");
    const next = this.outcomes.shift(); if (next && old) old.outcome = next;
    return next ?? old?.outcome ?? { state: "unknown", code: "mock-not-found" };
  }
  async sign(raw: Uint8Array) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(this.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, new Uint8Array(raw)))));
  }
  async verify(raw: Uint8Array, signature: string) {
    try {
      const bytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0)); if (bytes.length !== 32) return false;
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(this.secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
      return crypto.subtle.verify("HMAC", key, bytes, new Uint8Array(raw));
    } catch { return false; }
  }
  decode(raw: Uint8Array): PaymentProviderEvent[] {
    try { const v: unknown = JSON.parse(new TextDecoder().decode(raw)); if (!Array.isArray(v) || v.length > 100) throw new Error(); return v.map(parseProviderEvent); }
    catch { throw be1Error("INVALID_INPUT"); }
  }
}
