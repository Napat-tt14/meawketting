import type { AuthorizedMutation, PreparedStatement } from "../be1/repository";
import type { DemoBookingResource } from "../../_prototype/businessState";
import type { MutationReceipt } from "../shared/database";
import type { ExecutionView, ServiceRecordView, StaffView } from "./contracts";

export type ExecutionWrite = {
  before: ExecutionView | null; after: ExecutionView; context: AuthorizedMutation;
  receipt: MutationReceipt | null; serviceRecord?: ServiceRecordView;
  checkedStaff?: { id: string; revision: number }[];
  requireActiveSource?: boolean;
};
export interface Be4Repository {
  receipt(businessId: string, command: string, requestKey: string): Promise<{ branchId: string; requestHash: string; targetId: string } | null>;
  list(businessId: string, branchId: string, afterId: string, limit: number): Promise<ExecutionView[]>;
  get(businessId: string, branchId: string, id: string): Promise<ExecutionView | null>;
  forBooking(businessId: string, branchId: string, bookingId: string): Promise<ExecutionView[]>;
  save(write: ExecutionWrite, additionalStatements?: PreparedStatement[]): Promise<void>;
  rooms(businessId: string, branchId: string): Promise<DemoBookingResource[]>;
  staff(businessId: string, branchId: string): Promise<StaffView[]>;
  records(businessId: string, branchId: string, executionIds?: string[]): Promise<ServiceRecordView[]>;
  saveStaff(before: StaffView | null, after: StaffView, context: AuthorizedMutation, branchId: string, receipt: MutationReceipt): Promise<void>;
  correctRecord(before: ServiceRecordView, after: ServiceRecordView, context: AuthorizedMutation, receipt: MutationReceipt): Promise<void>;
}
