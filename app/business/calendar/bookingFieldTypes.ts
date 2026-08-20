import type {
  DemoBookingResource,
  DemoBookingService,
  PrototypeBookingDraft,
} from "../../_prototype/businessState";

export type BookingServiceFieldsProps = {
  draft: PrototypeBookingDraft;
  service: DemoBookingService;
  resources: readonly DemoBookingResource[];
  describedBy: string;
  onDraftChange: (next: PrototypeBookingDraft) => void;
};
