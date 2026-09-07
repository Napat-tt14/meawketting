import type { BookingConflictCode } from "./contracts";

export class Be3WriteConflict extends Error {
  readonly code: BookingConflictCode;

  constructor(code: BookingConflictCode, cause?: unknown) {
    super(code, cause === undefined ? undefined : { cause });
    this.name = "Be3WriteConflict";
    this.code = code;
  }
}

export function be3WriteConflict(code: BookingConflictCode, cause?: unknown) {
  return new Be3WriteConflict(code, cause);
}
