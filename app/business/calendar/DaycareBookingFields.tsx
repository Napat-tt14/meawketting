import type { BookingServiceFieldsProps } from "./bookingFieldTypes";
import { assignedResourceId, resourcesForKind, withAssignedResource } from "./bookingEditorUtils";

export function DaycareBookingFields({ draft, resources, describedBy, onDraftChange }: BookingServiceFieldsProps) {
  const zoneOptions = resourcesForKind(resources, "daycare-zone");
  const selectedZoneId = assignedResourceId(draft, resources, "daycare-zone");

  return (
    <section className="booking-fields booking-fields--daycare" aria-label="วันและโซนที่ดูแล">
      <div className="booking-form-grid">
        <label className="booking-field">
          <span>วันที่ใช้บริการ</span>
          <input id="booking-start-date" type="date" value={draft.start} onInput={(event) => onDraftChange({ ...draft, start: event.currentTarget.value })} aria-describedby={describedBy} required />
        </label>
        <div className="booking-field booking-field--readout">
          <span>รูปแบบการดูแล</span>
          <output>เต็มวัน</output>
        </div>
      </div>
      <label className="booking-field">
        <span>โซนดูแล</span>
        <select
          id="booking-primary-resource"
          value={selectedZoneId}
          onChange={(event) => onDraftChange(withAssignedResource(draft, resources, "daycare-zone", event.target.value))}
          aria-describedby={describedBy}
          required
        >
          <option value="">เลือกโซนดูแล</option>
          {zoneOptions.map((resource) => <option key={resource.id} value={resource.id}>{resource.label}</option>)}
        </select>
      </label>
    </section>
  );
}
