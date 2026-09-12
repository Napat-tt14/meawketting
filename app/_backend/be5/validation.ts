import { be1Error } from "../be1/errors";
import { validateId } from "../be1/validation";
import { choice, integer, object, string } from "../shared/validation";
import type { Be5Operation, GuardianGrantInput } from "./contracts";

export function scanToken(value: string) {
  let token = value.trim();
  if (token.includes("/")) {
    try {
      const url = new URL(token, "https://meawketting.invalid");
      token = /^\/temporary-access\/(tb_[A-Za-z0-9_-]{43})\/?$/.exec(url.pathname)?.[1] ?? "";
      if (url.search || url.hash || !["https:", "http:"].includes(url.protocol)) token = "";
    } catch { token = ""; }
  }
  // Neither Quick Passport nor Public Safety identifiers are Business credentials.
  if (!/^tb_[A-Za-z0-9_-]{43}$/.test(token)) throw be1Error("INVALID_INPUT");
  return token;
}
export function parseBe5Operation(value: unknown): Be5Operation {
  const o = object(value), type = choice(o.type, ["access.scan", "intake.start", "intake.get", "intake.update", "intake.correct", "intake.receive"] as const);
  const scope = { businessId: validateId(o.businessId), branchId: validateId(o.branchId) };
  if (type === "access.scan") return { ...scope, type, value: scanToken(string(o.value, 1000)) };
  if (type === "intake.start") return { ...scope, type, value: scanToken(string(o.value, 1000)), executionId: o.executionId == null ? null : validateId(o.executionId), requestKey: validateId(o.requestKey) };
  const target = { ...scope, intakeId: validateId(o.intakeId) };
  if (type === "intake.get") return { ...target, type };
  const mutation = { ...target, expectedRevision: integer(o.expectedRevision, 1, 2147483647), requestKey: validateId(o.requestKey) };
  if (type === "intake.receive") return { ...mutation, type };
  if (type === "intake.correct") return { ...mutation, type, topic: choice(o.topic, ["name", "species", "passport-reference"] as const), suggestedValue: string(o.suggestedValue, 500, true), note: string(o.note, 1000) };
  if (!Array.isArray(o.belongings) || o.belongings.length > 4) throw be1Error("INVALID_INPUT");
  return { ...mutation, type, belongings: [...new Set(o.belongings.map((v) => choice(v, ["กระเป๋าหรือกรง", "สายจูง", "อาหารหรือขนม", "ของเล่น"] as const)))],
    businessNote: string(o.businessNote, 4000), taskState: choice(o.taskState, ["allowed-data", "intake", "review"] as const) };
}
export function parseGrantInput(value: unknown): GuardianGrantInput {
  const o = object(value);
  if (!Array.isArray(o.scope) || o.scope.length > 3 || !o.scope.includes("basicIdentity") || typeof o.pending !== "boolean") throw be1Error("INVALID_INPUT");
  const durationMinutes = integer(o.durationMinutes, 120, 1440);
  if (![120, 480, 1440].includes(durationMinutes)) throw be1Error("INVALID_INPUT");
  return { businessId: validateId(o.businessId), branchId: validateId(o.branchId), petId: validateId(o.petId),
    purpose: string(o.purpose, 500, true), durationMinutes, pending: o.pending,
    scope: [...new Set(o.scope.map((s) => choice(s, ["basicIdentity", "photo", "passportReference"] as const)))] };
}
