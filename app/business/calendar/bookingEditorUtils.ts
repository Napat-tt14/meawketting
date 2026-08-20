import type {
  BookingResourceKind,
  DemoBookingResource,
  DemoBookingService,
  PrototypeBookingDraft,
} from "../../_prototype/businessState";

export function resourcesForKind(resources: readonly DemoBookingResource[], kind: BookingResourceKind) {
  return resources.filter((resource) => resource.kind === kind);
}

export function assignedResourceId(
  draft: PrototypeBookingDraft,
  resources: readonly DemoBookingResource[],
  kind: BookingResourceKind,
) {
  return resources.find((resource) => resource.kind === kind && draft.assignedResourceIds.includes(resource.id))?.id ?? "";
}

export function withAssignedResource(
  draft: PrototypeBookingDraft,
  resources: readonly DemoBookingResource[],
  kind: BookingResourceKind,
  resourceId: string,
) {
  const otherIds = draft.assignedResourceIds.filter((id) => !resources.some((resource) => resource.id === id && resource.kind === kind));
  return { ...draft, assignedResourceIds: resourceId ? [...otherIds, resourceId] : otherIds };
}

function dateAndTime(value: string) {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
}

function dateTimeValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function appointmentParts(value: string) {
  return dateAndTime(value);
}

export function appointmentDurationMinutes(draft: PrototypeBookingDraft, service: DemoBookingService) {
  if (draft.end) {
    const start = new Date(`${draft.start}:00`).getTime();
    const end = new Date(`${draft.end}:00`).getTime();
    const minutes = Math.round((end - start) / 60_000);
    if (Number.isFinite(minutes) && minutes > 0) return minutes;
  }
  return service.defaultDurationMinutes ?? 60;
}

export function withAppointmentStart(
  draft: PrototypeBookingDraft,
  service: DemoBookingService,
  nextDate: string,
  nextTime: string,
) {
  const duration = appointmentDurationMinutes(draft, service);
  const start = `${nextDate}T${nextTime}`;
  const startDate = new Date(`${start}:00`);
  const endDate = new Date(startDate.getTime() + duration * 60_000);
  return { ...draft, start, end: Number.isNaN(endDate.getTime()) ? draft.end : dateTimeValue(endDate) };
}

export function resourceSummary(resources: readonly DemoBookingResource[], ids: readonly string[]) {
  return resources.filter((resource) => ids.includes(resource.id)).map((resource) => resource.label);
}
