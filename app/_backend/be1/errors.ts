import type { Be1ApiErrorCode } from "./contracts";

const SAFE_MESSAGES: Record<Be1ApiErrorCode, string> = {
  AUTHENTICATION_NOT_CONFIGURED: "Production authentication is not configured.",
  UNAUTHENTICATED: "Authentication is required.",
  PERSON_INACTIVE: "This identity is not active.",
  MEMBERSHIP_INACTIVE: "This Business membership is not active.",
  FORBIDDEN: "This action is not permitted.",
  NOT_FOUND: "The requested record is unavailable.",
  INVALID_INPUT: "The request contains invalid data.",
  CONFLICT: "The requested change conflicts with existing data.",
  LAST_ACTIVE_BRANCH: "A Business must keep at least one active Branch.",
  PERSISTENCE_ERROR: "The change could not be persisted.",
};

export class Be1Error extends Error {
  readonly code: Be1ApiErrorCode;
  readonly status: number;

  constructor(code: Be1ApiErrorCode, status: number, cause?: unknown) {
    super(SAFE_MESSAGES[code], cause === undefined ? undefined : { cause });
    this.name = "Be1Error";
    this.code = code;
    this.status = status;
  }
}

export function be1Error(code: Be1ApiErrorCode, cause?: unknown) {
  const status = code === "AUTHENTICATION_NOT_CONFIGURED" ? 501
    : code === "UNAUTHENTICATED" ? 401
      : code === "PERSON_INACTIVE" || code === "MEMBERSHIP_INACTIVE" || code === "FORBIDDEN" ? 403
        : code === "NOT_FOUND" ? 404
          : code === "INVALID_INPUT" ? 400
            : code === "CONFLICT" || code === "LAST_ACTIVE_BRANCH" ? 409
              : 500;
  return new Be1Error(code, status, cause);
}

export function asBe1Error(error: unknown) {
  return error instanceof Be1Error ? error : be1Error("PERSISTENCE_ERROR", error);
}
