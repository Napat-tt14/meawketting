import { type FormEvent } from "react";
import {
  evaluatePrototypeTeamMemberAvailability,
  getBookingInterval,
  getBookingResourceStaffMember,
  type BookingResourceKind,
} from "../../_prototype/businessState";
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
  const assignmentInterval = getBookingInterval("appointment", draft.start, draft.end);

  const updateDate = (event: FormEvent<HTMLInputElement>) => onDraftChange(withAppointmentStart(draft, service, event.currentTarget.value, time || "09:00"));
  const updateTime = (event: FormEvent<HTMLInputElement>) => onDraftChange(withAppointmentStart(draft, service, date || "2026-08-18", event.currentTarget.value));

  function staffOptionState(resourceId: string) {
    const staff = getBookingResourceStaffMember(resourceId);
    if (!staff) return { enabled: true, suffix: "" };
    if (!staff.active) return { enabled: false, suffix: " · ปิดใช้งาน" };
    if (!staff.capabilities.includes("grooming")) return { enabled: false, suffix: " · รับงานนี้ไม่ได้" };
    const availability = assignmentInterval ? evaluatePrototypeTeamMemberAvailability(staff, assignmentInterval) : null;
    return availability?.available === false
      ? { enabled: false, suffix: ` · ${availability.conflicts[0]?.message ?? "ไม่พร้อม"}` }
      : { enabled: true, suffix: "" };
  }

  return (
    <section className="booking-fields booking-fields--grooming" aria-label="วัน เวลา และทีมที่รับงาน">
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
                {options.map((resource) => {
                  const staffState = staffOptionState(resource.id);
                  return <option key={resource.id} value={resource.id} disabled={!staffState.enabled}>{resource.label}{staffState.suffix}</option>;
                })}
              </select>
            </label>
          );
        })}
      </div>
      <p className="booking-fields__team-hint">ช่างที่ปิดใช้งานหรือไม่พร้อมในช่วงเวลานี้จะเลือกไม่ได้ · ระบบตรวจซ้ำก่อนยืนยัน</p>
    </section>
  );
}
