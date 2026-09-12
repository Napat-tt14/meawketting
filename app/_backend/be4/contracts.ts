import type {
  PrototypeServiceJob, PrototypeHotelStay, PrototypeDaycareAttendance,
  PrototypeServiceRecord, PrototypeTeamMember, PrototypeTeamMemberDraft,
  PrototypeDaycareCareKind, DemoBookingResource,
  ServiceJobStatus, HotelStayStatus, DaycareAttendanceStatus,
} from "../../_prototype/businessState";

export type ExecutionSource = { revision: number; serviceId: string; serviceLabel: string };
export type JobView = PrototypeServiceJob & ExecutionSource;
export type StayView = PrototypeHotelStay & ExecutionSource;
export type AttendanceView = PrototypeDaycareAttendance & ExecutionSource;
export type ServiceRecordView = PrototypeServiceRecord & { revision: number };
export type StaffView = PrototypeTeamMember & { revision: number };
export type ExecutionView =
  | { kind: "grooming"; record: JobView }
  | { kind: "hotel"; record: StayView }
  | { kind: "daycare"; record: AttendanceView };
export type ExecutionChange =
  | { type: "transition"; status: ServiceJobStatus | HotelStayStatus | DaycareAttendanceStatus }
  | { type: "note"; note: string }
  | { type: "grooming-resources"; resourceIds: string[] }
  | { type: "hotel-room"; roomId: string; effectiveDate: string | null; reason: string }
  | { type: "hotel-care-complete"; taskId: string }
  | { type: "hotel-care-staff"; taskId: string; staffId: string | null }
  | { type: "hotel-incident"; summary: string; severity: "attention" | "info" }
  | { type: "hotel-incident-resolve"; incidentId: string }
  | { type: "daycare-zone"; zoneId: string }
  | { type: "daycare-staff"; staffId: string | null }
  | { type: "daycare-care"; kind: PrototypeDaycareCareKind; note: string };
export type MutationInput = {
  businessId: string; branchId: string; executionId: string; expectedRevision: number; requestKey: string; change: ExecutionChange;
};
export type OperationDirectory = {
  executions: ExecutionView[]; records: ServiceRecordView[]; staff: StaffView[]; rooms: DemoBookingResource[];
};
export type Be4Operation =
  | { type: "operations.list"; businessId: string; branchId: string; afterId?: string; limit?: number }
  | { type: "operations.get"; businessId: string; branchId: string; executionId: string }
  | { type: "operations.change"; input: MutationInput }
  | { type: "staff.save"; businessId: string; branchId: string; draft: PrototypeTeamMemberDraft; expectedRevision: number | null; requestKey: string }
  | { type: "record.correct"; businessId: string; branchId: string; recordId: string; field: "summary" | "business-note"; value: string; reason: string; expectedRevision: number; requestKey: string };
export type Be4Result<T extends Be4Operation> = T extends { type: "operations.list" } ? OperationDirectory
  : T extends { type: "staff.save" } ? StaffView
    : T extends { type: "record.correct" } ? ServiceRecordView : ExecutionView;
