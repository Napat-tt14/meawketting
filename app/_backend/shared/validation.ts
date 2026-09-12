import { be1Error } from "../be1/errors";
import { validateId } from "../be1/validation";

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw be1Error("INVALID_INPUT");
  return value as Record<string, unknown>;
}

export function string(value: unknown, maximum = 4000, required = false): string {
  if (typeof value !== "string") throw be1Error("INVALID_INPUT");
  const normalized = value.trim();
  if (normalized.length > maximum || (required && !normalized)) throw be1Error("INVALID_INPUT");
  return normalized;
}

export function integer(value: unknown, minimum = 0, maximum = 1000000): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum || value > maximum) throw be1Error("INVALID_INPUT");
  return value;
}

export function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== "string" || !choices.includes(value as T)) throw be1Error("INVALID_INPUT");
  return value as T;
}

export function ids(value: unknown, maximum = 30): string[] {
  if (!Array.isArray(value) || value.length > maximum) throw be1Error("INVALID_INPUT");
  const result = value.map(validateId);
  if (new Set(result).size !== result.length) throw be1Error("INVALID_INPUT");
  return result;
}

export function nullableId(value: unknown): string | null {
  return value === null ? null : validateId(value);
}

export function date(value: unknown): string {
  const result = string(value, 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw be1Error("INVALID_INPUT");
  return result;
}

export async function hash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function opaqueId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}
