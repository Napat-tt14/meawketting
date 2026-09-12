import { validateId } from "../be1/validation";
import { choice, integer, object, string } from "../shared/validation";
import type { Be7Operation } from "./contracts";

export function parseBe7Operation(raw: unknown): Be7Operation {
  const v = object(raw), type = choice(v.type, ["charges.list", "payments.list", "charge.get", "charge.checkout", "charge.adjust", "charge.cancel", "payment.record", "refund.record", "attempt.create"] as const);
  const scope = { businessId: validateId(v.businessId), branchId: validateId(v.branchId) };
  if (type === "charges.list" || type === "payments.list") return { ...scope, type, afterId: v.afterId == null ? "" : string(v.afterId, 100), limit: v.limit == null ? 50 : integer(v.limit, 1, 50), customerId: v.customerId == null ? undefined : validateId(v.customerId) };
  if (type === "charge.get") return { ...scope, type, chargeId: validateId(v.chargeId) };
  const write = { ...scope, requestKey: validateId(v.requestKey) };
  if (type === "charge.checkout") return { ...write, type, executionId: validateId(v.executionId) };
  const versioned = { ...write, chargeId: validateId(v.chargeId), expectedRevision: integer(v.expectedRevision, 1, 2147483647) };
  if (type === "charge.cancel") return { ...versioned, type, reason: string(v.reason, 1000, true) };
  const amount = integer(v.amount, 1, 10000000);
  if (type === "charge.adjust") return { ...versioned, type, amount, kind: choice(v.kind, ["manual-adjustment", "discount"] as const), label: string(v.label, 160, true), reason: string(v.reason, 1000, true) };
  if (type === "refund.record") return { ...versioned, type, amount, paymentId: validateId(v.paymentId), reason: string(v.reason, 1000, true) };
  if (type === "attempt.create") return { ...versioned, type, amount, accountId: validateId(v.accountId) };
  return { ...versioned, type, amount, method: choice(v.method, ["cash", "bank-transfer", "other"] as const), note: string(v.note, 2000) };
}
