import type { PrototypeCharge, PrototypeChargeBalance, PrototypePayment, PrototypePaymentMethod } from "../../_prototype/businessState";

export type ChargeView = PrototypeCharge & { revision: number };
export type RefundView = { refundId: string; paymentId: string; businessId: string; branchId: string; amount: number; reason: string; recordedAt: string; allocations: { chargeId: string; amount: number }[] };
export type PaymentView = PrototypePayment & { source: "manual" | "provider"; refunded: number; unallocated: number; status: "recorded" | "partial-refunded" | "refunded" };
export type AttemptState = "created" | "pending" | "retry" | "failed" | "succeeded" | "reconciliation";
export type AttemptView = { attemptId: string; chargeId: string; amount: number; state: AttemptState; attempts: number; failureCode: string | null; revision: number; createdAt: string; updatedAt: string };
export type ChargeBalanceView = Omit<PrototypeChargeBalance, "charge"> & { charge: ChargeView; refunded: number; reserved: number; availableToCollect: number; attempts: AttemptView[] };
export type FinancialPage = { balances: ChargeBalanceView[]; nextAfterId: string | null };
export type PaymentPage = { payments: PaymentView[]; refunds: RefundView[]; nextAfterId: string | null };
export type BillingMutationResult = { balance: ChargeBalanceView; created: boolean; reconciled: boolean; replayed: boolean };
type Scope = { businessId: string; branchId: string };
type Write = Scope & { requestKey: string };
type Versioned = Write & { chargeId: string; expectedRevision: number };
export type Be7Operation =
  | (Scope & { type: "charges.list"; afterId?: string; limit?: number; customerId?: string })
  | (Scope & { type: "payments.list"; afterId?: string; limit?: number; customerId?: string })
  | (Scope & { type: "charge.get"; chargeId: string })
  | (Write & { type: "charge.checkout"; executionId: string })
  | (Versioned & { type: "charge.adjust"; kind: "manual-adjustment" | "discount"; label: string; amount: number; reason: string })
  | (Versioned & { type: "charge.cancel"; reason: string })
  | (Versioned & { type: "payment.record"; amount: number; method: PrototypePaymentMethod; note: string })
  | (Versioned & { type: "refund.record"; paymentId: string; amount: number; reason: string })
  | (Versioned & { type: "attempt.create"; accountId: string; amount: number });

/** A server-selected Business merchant account, never browser credentials. */
export type ProviderAccount = { id: string; businessId: string; provider: string; externalAccountId: string; secretRef: string; source: "dev-test" | "verified-provider"; revision: number };
export type PaymentIntent = { attemptId: string; idempotencyKey: string; accountId: string; amountMinor: number; currency: "THB" };
export type ProviderOutcome =
  | { state: "pending"; providerReference: string }
  | { state: "succeeded"; providerReference: string; amountMinor: number; currency: "THB"; occurredAt: string }
  | { state: "failed"; code: string }
  | { state: "unknown"; code: string };
export type PaymentProviderEvent = { eventId: string; externalAccountId: string; attemptId: string; outcome: Exclude<ProviderOutcome, { state: "unknown" }> };
export interface PaymentProvider {
  readonly provider: string;
  /** Must identify the same provider intent on retries and reject changed payloads. */
  create(intent: PaymentIntent): Promise<ProviderOutcome>;
  /** An authoritative lookup is required after an ambiguous response. */
  reconcile(intent: PaymentIntent, providerReference: string | null): Promise<ProviderOutcome>;
  verify(raw: Uint8Array, signature: string): Promise<boolean>;
  decode(raw: Uint8Array): PaymentProviderEvent[];
}
export type PaymentProviderResolver = (account: ProviderAccount) => Promise<PaymentProvider | null>;
