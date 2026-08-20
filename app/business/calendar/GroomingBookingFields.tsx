import { type FormEvent } from "react";
import { type BookingResourceKind } from "../../_prototype/businessState";
import type { BookingServiceFieldsProps } from "./bookingFieldTypes";
import {
  appointmentDurationMinutes,
  appointmentParts,
  assignedResourceId,
  resourcesForKind,
  withAppointmentStart,
  withAssignedResource,
} from "./bookingEditorUtils";

const fieldLabels: Record<BookingResourceKind, string> = {
  groomer: "ช่างที่รับงาน",
  "grooming-station": "จุดบริการที่ใช้",
  dryer: "เครื่องเป่าที่ใช้",
  "hotel-room-type": "ประเภทห้อง",
  "daycare-zone": "โซนดูแล",
};

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${minutes} นาที`;
  return remainder ? `${hours} ชั่วโมง ${remainder} นาที` : `${hours} ชั่วโมง`;
}

export function GroomingBookingFields({ draft, service, resources, describedBy, onDraftChange }: BookingServiceFieldsProps) {
  const { date, time } = appointmentParts(draft.start);
  const duration = appointmentDurationMinutes(draft, service);

  const updateDate = (event: FormEvent<HTMLInputElement>) => onDraftChange(withAppointmentStart(draft, service, event.currentTarget.value, time || "09:00"));
  const updateTime = (event: FormEvent<HTMLInputElement>) => onDraftChange(withAppointmentStart(draft, service, date || "2026-08-18", event.currentTarget.value));

  return (
    <section className="booking-fields booking-fields--grooming" aria-labelledby="grooming-fields-title">
      <div className="booking-section-heading">
        <p>สำหรับบริการนี้</p>
        <h3 id="grooming-fields-title">วัน เวลา และทีมที่รับงาน</h3>
      </div>
      <div className="booking-form-grid">
        <label className="booking-field">
          <span>วันที่ให้บริการ</span>
          <input id="booking-start-date" type="date" value={date} onInput={updateDate} aria-describedby={describedBy} required />
        </label>
        <label className="booking-field">
          <span>เวลาเริ่ม</span>
          <input id="booking-start-time" type="time" value={time} onInput={updateTime} aria-describedby={describedBy} required />
        </label>
        <div className="booking-field booking-field--readout">
          <span>ระยะเวลาที่คาดไว้</span>
          <output>{durationLabel(duration)}</output>
        </div>
      </div>
      <div className="booking-resource-fields">
        {(["groomer", "grooming-station", "dryer"] as const).map((kind) => {
          const options = resourcesForKind(resources, kind);
          const selectedId = assignedResourceId(draft, resources, kind);
          return (
            <label className="booking-field" key={kind}>
              <span>{fieldLabels[kind]}</span>
              <select
                id={kind === "groomer" ? "booking-primary-resource" : undefined}
                value={selectedId}
                onChange={(event) => onDraftChange(withAssignedResource(draft, resources, kind, event.target.value))}
                aria-describedby={describedBy}
                required
              >
                <option value="">เลือก{fieldLabels[kind]}</option>
                {options.map((resource) => <option key={resource.id} value={resource.id}>{resource.label}</option>)}
              </select>
            </label>
          );
        })}
      </div>
    </section>
  );
}
