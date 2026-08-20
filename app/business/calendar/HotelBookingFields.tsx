import type { FormEvent } from "react";
import type { BookingServiceFieldsProps } from "./bookingFieldTypes";
import { assignedResourceId, resourcesForKind, withAssignedResource } from "./bookingEditorUtils";
import { addCalendarDays, calendarDateLabel } from "./calendarPresentation";

export function HotelBookingFields({ draft, resources, describedBy, onDraftChange }: BookingServiceFieldsProps) {
  const roomOptions = resourcesForKind(resources, "hotel-room-type");
  const selectedRoomId = assignedResourceId(draft, resources, "hotel-room-type");
  const selectedRoom = roomOptions.find((resource) => resource.id === selectedRoomId) ?? null;

  const updateCheckIn = (event: FormEvent<HTMLInputElement>) => {
    const start = event.currentTarget.value;
    const end = draft.end && draft.end > start ? draft.end : addCalendarDays(start, 1);
    onDraftChange({ ...draft, start, end });
  };

  return (
    <section className="booking-fields booking-fields--hotel" aria-labelledby="hotel-fields-title">
      <div className="booking-section-heading">
        <p>สำหรับบริการนี้</p>
        <h3 id="hotel-fields-title">วันเข้าพักและพื้นที่ที่ต้องใช้</h3>
      </div>
      <div className="booking-form-grid">
        <label className="booking-field">
          <span>วันเช็กอิน</span>
          <input id="booking-start-date" type="date" value={draft.start} onInput={updateCheckIn} aria-describedby={describedBy} required />
        </label>
        <label className="booking-field">
          <span>วันเช็กเอาต์</span>
          <input type="date" min={addCalendarDays(draft.start, 1)} value={draft.end} onInput={(event) => onDraftChange({ ...draft, end: event.currentTarget.value })} aria-describedby={describedBy} required />
          <small>วันออกไม่นับเป็นคืนพัก</small>
        </label>
      </div>
      <label className="booking-field">
        <span>พื้นที่พักที่ต้องใช้</span>
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
      </label>
      <div className="booking-capacity-summary" aria-live="polite">
        <strong>สรุปพื้นที่</strong>
        {selectedRoom
          ? <span>{selectedRoom.label} · รองรับได้ {selectedRoom.capacity} ตัวในต้นแบบ</span>
          : <span>เลือกพื้นที่พักเพื่อดูความพร้อม</span>}
        {draft.start && draft.end ? <small>{calendarDateLabel(draft.start, { day: "numeric", month: "short" })} – {calendarDateLabel(draft.end, { day: "numeric", month: "short" })}</small> : null}
      </div>
    </section>
  );
}
