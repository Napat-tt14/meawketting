import type { BusinessIntakeRecord, CorrectionTopic, IntakeTaskState } from "../../_prototype/businessState";
import type { ShareableScopeKey, TemporaryAccess } from "../../_prototype/sharingState";

export type AccessView = Omit<TemporaryAccess, "petSlug" | "fallbackCode" | "events"> & {
  revision: number; checkedAt: string;
  events: { id: string; kind: string; occurredAt: string; actor: "guardian" | "business" }[];
};
export type GrantedPassport = { name: string; species: "cat" | "dog"; passportLabel?: string; photoSrc: string | null };
export type IntakeView = BusinessIntakeRecord & { revision: number };
export type IntakeResult = { record: IntakeView; access: AccessView; passport: GrantedPassport | null };
export type Be5Scope = { businessId: string; branchId: string };
export type Be5Operation = Be5Scope & (
  | { type: "access.scan"; value: string }
  | { type: "intake.start"; value: string; executionId: string | null; requestKey: string }
  | { type: "intake.get"; intakeId: string }
  | { type: "intake.update"; intakeId: string; expectedRevision: number; requestKey: string; belongings: string[]; businessNote: string; taskState: Exclude<IntakeTaskState, "complete"> }
  | { type: "intake.correct"; intakeId: string; expectedRevision: number; requestKey: string; topic: CorrectionTopic; suggestedValue: string; note: string }
  | { type: "intake.receive"; intakeId: string; expectedRevision: number; requestKey: string }
);
export type GuardianGrantInput = Be5Scope & { petId: string; scope: ShareableScopeKey[]; purpose: string; durationMinutes: number; pending: boolean };
