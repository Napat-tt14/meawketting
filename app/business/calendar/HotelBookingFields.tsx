import type { FormEvent } from "react";
import type { BookingServiceFieldsProps } from "./bookingFieldTypes";
import { assignedResourceId, resourcesForKind, withAssignedResource } from "./bookingEditorUtils";
import { addCalendarDays } from "./calendarPresentation";

export function HotelBookingFields({ draft, resources, describedBy, onDraftChange }: BookingServiceFieldsProps) {
  // Booking reserves aggregate Hotel capacity. A specific room or zone is an
  // execution-time decision in Hotel Operations, so Calendar never forces a
  // room lock before Intake/check-in.
  const roomOptions = resourcesForKind(resources, "hotel-room-type").filter((resource) => resource.hotelRole !== "room" && resource.hotelRole !== "zone");
  const selectedRoomId = assignedResourceId(draft, resources, "hotel-room-type");
  const checkInDate = draft.start.slice(0, 10);
  const checkOutDate = draft.end.slice(0, 10);
  const minimumCheckOutDate = checkInDate ? addCalendarDays(checkInDate, 1) : "";

  const updateCheckIn = (event: FormEvent<HTMLInputElement>) => {
    const start = event.currentTarget.value;
    const end = checkOutDate && checkOutDate > start ? checkOutDate : start ? addCalendarDays(start, 1) : "";
    onDraftChange({ ...draft, start, end });
  };

  return (
    <section className="booking-fields booking-fields--hotel" aria-label="รายละเอียดการเข้าพัก">
      <div className="booking-form-grid">
        <label className="booking-field">
          <span>วันเช็กอิน</span>
          <input id="booking-start-date" type="date" value={checkInDate} onInput={updateCheckIn} aria-describedby={describedBy} required />
        </label>
        <label className="booking-field">
          <span>วันเช็กเอาต์</span>
          <input id="booking-end-date" type="date" min={minimumCheckOutDate} value={checkOutDate} onInput={(event) => onDraftChange({ ...draft, start: checkInDate, end: event.currentTarget.value })} aria-describedby={describedBy} required />
          <small>วันเช็กเอาต์ไม่นับเป็นคืนพัก</small>
        </label>
      </div>
      <label className="booking-field">
        <span>พื้นที่พักตามเงื่อนไข</span>
        <select
          id="booking-primary-resource"
          value={selectedRoomId}
          onChange={(event) => onDraftChange(withAssignedResource(draft, resources, "hotel-room-type", event.target.value))}
          aria-describedby={describedBy}
          required
        >
          <option value="">เลือกพื้นที่พัก</option>
          {roomOptions.map((resource) => <option key={resource.id} value={resource.id}>{resource.label}</option>)}
        </select>
        <small>ระบุห้องหรือโซนจริงตอนรับเข้าในหน้าโรงแรม</small>
      </label>
    </section>
  );
}
