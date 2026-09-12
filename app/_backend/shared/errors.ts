export type BackendConflictReason = "version-conflict" | "idempotency" | "capacity" | "invalid-transition" | "invalid-resource" | "invalid-staff" | "unavailable" | "room-required" | "zone-required" | "care-incomplete" | "intake-required" | "expired" | "revoked" | "not-connected" | "overpayment" | "over-refund" | "invalid-total" | "has-payments" | "cancelled";

export class BackendConflict extends Error {
  readonly status = 409;
  constructor(readonly reason: BackendConflictReason) {
    super(reason);
    this.name = "BackendConflict";
  }
}

export function conflict(reason: BackendConflictReason): never { throw new BackendConflict(reason); }
