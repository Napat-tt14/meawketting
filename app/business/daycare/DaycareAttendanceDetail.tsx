"use client";

import { type FormEvent, useState } from "react";
import {
  DAYCARE_ATTENDANCE_STATUS_LABELS,
  getPrototypeDaycareZoneAvailability,
  type BusinessLocalPetRelationship,
  type DaycareAttendanceStatus,
  type DemoBookingResource,
  type DemoBusinessContext,
  type PrototypeCustomer,
  type PrototypeDaycareAttendance,
  type PrototypeDaycareCareKind,
  type PrototypeTeamMember,
} from "../../_prototype/businessState";
import { addPrototypeDaycareCareEvent, assignPrototypeDaycareStaff, assignPrototypeDaycareZone, transitionPrototypeDaycareAttendance, updatePrototypeDaycareNote } from "../../_backend/be4/facade";
import {
  CalendarDays,
  CheckCircle,
  CircleAlert,
  Clock,
  MapPin,
  MessageCircle,
  PawPrint,
  Save,
  Scan,
  UserRound,
  Wallet,
} from "../../_components/icons";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";
import { BusinessModal } from "../_components/BusinessModal";
import { calendarDateLabel } from "../calendar/calendarPresentation";

const NEXT_DAYCARE_ACTION: Partial<Record<DaycareAttendanceStatus, { status: DaycareAttendanceStatus; label: string }>> = {
  booked: { status: "checked-in", label: "รับเข้า Daycare" },
  "checked-in": { status: "active", label: "เริ่มดูแล" },
  active: { status: "ready-for-pickup", label: "พร้อมรับกลับ" },
  "ready-for-pickup": { status: "checked-out", label: "ยืนยันรับกลับแล้ว" },
  "checked-out": { status: "completed", label: "ปิดงานวันนี้" },
};

const CARE_KIND_OPTIONS: readonly { value: PrototypeDaycareCareKind; label: string }[] = [
  { value: "meal", label: "ให้อาหาร" },
  { value: "water", label: "เติมน้ำ" },
  { value: "activity", label: "กิจกรรม / เล่น" },
  { value: "rest", label: "พักผ่อน" },
  { value: "note", label: "บันทึกการดูแล" },
];

type DaycareDetailNotice = { tone: "success" | "error"; message: string } | null;

function transitionFailureMessage(reason: string) {
  if (reason === "zone-required") return "เลือกโซนก่อนรับน้องเข้า Daycare";
  if (reason === "capacity") return "โซนนี้เต็มแล้ว กรุณาเลือกโซนที่ยังว่าง";
  if (reason === "invalid-transition") return "ไม่สามารถเปลี่ยนไปสถานะนี้จากขั้นตอนปัจจุบัน";
  if (reason === "wrong-context") return "รายการนี้ไม่ได้อยู่ในสาขาปัจจุบัน";
  return "อัปเดตสถานะไม่สำเร็จ ลองอีกครั้ง";
}

function eventTime(value: string) {
  return value.length >= 16 ? value.slice(11, 16) : value;
}

export function DaycareAttendanceDetail({
  attendance,
  customer,
  pet,
  context,
  zones,
  staff,
  onClose,
  onChanged,
}: {
  attendance: PrototypeDaycareAttendance;
  customer: PrototypeCustomer;
  pet: BusinessLocalPetRelationship;
  context: DemoBusinessContext;
  zones: readonly DemoBookingResource[];
  staff: readonly PrototypeTeamMember[];
  onClose: () => void;
  onChanged: (notice: string) => void;
}) {
  const [careKind, setCareKind] = useState<PrototypeDaycareCareKind>("activity");
  const [careNote, setCareNote] = useState("");
  const [businessNote, setBusinessNote] = useState(attendance.businessNote);
  const [notice, setNotice] = useState<DaycareDetailNotice>(null);
  const nextAction = NEXT_DAYCARE_ACTION[attendance.status] ?? null;
  const canRecordCare = ["checked-in", "active", "ready-for-pickup"].includes(attendance.status);
  const canReassign = !["checked-out", "completed", "cancelled"].includes(attendance.status);
  const canCancel = ["booked", "checked-in", "active"].includes(attendance.status);
  const showBilling = ["ready-for-pickup", "checked-out", "completed"].includes(attendance.status);

  function publish(message: string, ok: boolean) {
    setNotice({ tone: ok ? "success" : "error", message });
    if (ok) onChanged(message);
  }

  async function advanceLifecycle() {
    if (!nextAction) return;
    const result = await transitionPrototypeDaycareAttendance(attendance.daycareAttendanceId, nextAction.status, context);
    if (!result.ok) {
      publish(transitionFailureMessage(result.reason), false);
      return;
    }
    publish(result.duplicate ? "สถานะนี้ถูกบันทึกไว้แล้ว" : `เปลี่ยนสถานะเป็น ${DAYCARE_ATTENDANCE_STATUS_LABELS[nextAction.status]} แล้ว`, true);
  }

  async function cancelAttendance() {
    if (!window.confirm(`ยกเลิกรายการ Daycare ของ ${pet.name} ใช่ไหม`)) return;
    const result = await transitionPrototypeDaycareAttendance(attendance.daycareAttendanceId, "cancelled", context);
    if (!result.ok) {
      publish(transitionFailureMessage(result.reason), false);
      return;
    }
    publish("ยกเลิกรายการ Daycare แล้ว", true);
  }

  async function changeZone(zoneId: string) {
    if (!zoneId) return;
    const result = await assignPrototypeDaycareZone(attendance.daycareAttendanceId, zoneId, context);
    if (!result.ok) {
      publish(result.message ?? (result.reason === "capacity" ? "โซนนี้เต็มแล้ว" : "บันทึกโซนไม่สำเร็จ"), false);
      return;
    }
    const zone = zones.find((item) => item.id === zoneId);
    publish(result.duplicate ? "รายการอยู่ในโซนนี้แล้ว" : `ย้ายไป${zone?.label ?? "โซนที่เลือก"}แล้ว`, true);
  }

  async function changeStaff(staffId: string) {
    const result = await assignPrototypeDaycareStaff(attendance.daycareAttendanceId, staffId || null, context);
    if (!result.ok) {
      publish(result.message ?? "มอบหมายผู้ดูแลไม่สำเร็จ", false);
      return;
    }
    const member = staff.find((item) => item.staffId === staffId);
    publish(result.duplicate ? "ผู้ดูแลตรงกับรายการเดิม" : member ? `มอบหมายให้ ${member.name} แล้ว` : "นำผู้ดูแลออกจากรายการแล้ว", true);
  }

  async function recordCare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const updated = await addPrototypeDaycareCareEvent(attendance.daycareAttendanceId, careKind, careNote, context);
    if (!updated) {
      publish("บันทึกกิจกรรมได้เมื่อรับน้องเข้า Daycare แล้ว", false);
      return;
    }
    setCareNote("");
    publish(`บันทึก${CARE_KIND_OPTIONS.find((item) => item.value === careKind)?.label ?? "กิจกรรม"}แล้ว`, true);
  }

  async function saveBusinessNote() {
    const updated = await updatePrototypeDaycareNote(attendance.daycareAttendanceId, businessNote, context);
    publish(updated ? "บันทึกหมายเหตุของร้านแล้ว" : "บันทึกหมายเหตุไม่สำเร็จ", Boolean(updated));
  }

  const intakeHref = attendance.intakeId
    ? `/business/intake/${encodeURIComponent(attendance.intakeId)}`
    : `/business/scan?daycareAttendanceId=${encodeURIComponent(attendance.daycareAttendanceId)}`;
  const inboxHref = `/business/inbox?customerId=${encodeURIComponent(attendance.customerId)}&petId=${encodeURIComponent(attendance.petId)}&bookingId=${encodeURIComponent(attendance.bookingId)}`;
  const billingHref = `/business/billing?daycareAttendanceId=${encodeURIComponent(attendance.daycareAttendanceId)}`;

  return (
    <BusinessModal
      open
      size="large"
      className="daycare-detail"
      title={`${pet.name} · Daycare`}
      description={`${customer.name} · ${DAYCARE_ATTENDANCE_STATUS_LABELS[attendance.status]}`}
      closeLabel={`ปิดรายละเอียด Daycare ของ ${pet.name}`}
      onClose={onClose}
      footer={(
        <>
          <Link className="button button--business-ghost" href={`/business/customers/${encodeURIComponent(customer.id)}`}><UserRound size={17} />ดูลูกค้า</Link>
          <button className="button button--business" type="button" onClick={onClose}>ปิด</button>
        </>
      )}
    >
      <div className="daycare-detail__content">
        <section className="daycare-detail__identity" aria-label="ข้อมูลน้องและสถานะ">
          <BusinessPetAvatar pet={pet} size="large" />
          <div>
            <span className={`daycare-status daycare-status--${attendance.status}`}>{DAYCARE_ATTENDANCE_STATUS_LABELS[attendance.status]}</span>
            <strong>{pet.name}</strong>
            <small>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</small>
          </div>
        </section>

        {notice ? <p className={`daycare-detail__notice is-${notice.tone}`} role="status" aria-live="polite"><CircleAlert size={17} />{notice.message}</p> : null}

        <section className="daycare-detail-section" aria-labelledby="daycare-lifecycle-title">
          <header><div><span>ขั้นตอนวันนี้</span><h3 id="daycare-lifecycle-title">สถานะ Daycare</h3></div><CheckCircle size={20} /></header>
          <div className="daycare-detail__facts">
            <div><CalendarDays size={17} /><span><small>วันที่</small><strong>{calendarDateLabel(attendance.attendanceDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</strong></span></div>
            <div><Clock size={17} /><span><small>รับเข้า</small><strong>{attendance.dropOffWindow ?? "ไม่ระบุ"}</strong></span></div>
            <div><Clock size={17} /><span><small>รับกลับ</small><strong>{attendance.pickupWindow ?? "ไม่ระบุ"}</strong></span></div>
          </div>
          <div className="daycare-detail__lifecycle-actions">
            {attendance.status === "booked" || attendance.intakeId ? <Link href={intakeHref}><Scan size={17} />{attendance.intakeId ? "ดู Intake" : "ทำ Intake"}</Link> : null}
            {nextAction ? <button className="is-primary" type="button" onClick={advanceLifecycle}><CheckCircle size={17} />{nextAction.label}</button> : null}
            {showBilling ? <Link href={billingHref}><Wallet size={17} />ตรวจยอด / รับชำระ</Link> : null}
            <Link href={inboxHref}><MessageCircle size={17} />เปิดข้อความ</Link>
            <Link href={`/business/calendar?bookingId=${encodeURIComponent(attendance.bookingId)}`}><CalendarDays size={17} />ดูการจอง</Link>
            {canCancel ? <button className="is-critical" type="button" onClick={cancelAttendance}>ยกเลิกรายการ</button> : null}
          </div>
          {attendance.status === "checked-out" || attendance.status === "completed" ? <p className="daycare-detail__hint">บันทึกประวัติบริการแล้ว เปิดดูรายละเอียดได้จากหน้าลูกค้าและสัตว์เลี้ยง</p> : null}
          <p className="daycare-detail__hint">การเปลี่ยนสถานะมีผลเฉพาะน้องตัวนี้</p>
        </section>

        <section className="daycare-detail-section" aria-labelledby="daycare-assignment-title">
          <header><div><span>พื้นที่และทีม</span><h3 id="daycare-assignment-title">โซนและผู้ดูแล</h3></div><MapPin size={20} /></header>
          <fieldset className="daycare-detail__assignment" disabled={!canReassign}>
            <legend className="sr-only">กำหนดโซนและผู้ดูแล</legend>
            <label>
              <span>โซน Daycare</span>
              <select value={attendance.zoneId ?? ""} onChange={(event) => changeZone(event.currentTarget.value)} aria-label={`เลือกโซนให้ ${pet.name}`}>
                <option value="" disabled>เลือกโซน</option>
                {zones.map((zone) => {
                  const availability = getPrototypeDaycareZoneAvailability(context, zone.id, attendance.attendanceDate, attendance.daycareAttendanceId);
                  return <option key={zone.id} value={zone.id} disabled={!availability.available && attendance.zoneId !== zone.id}>{zone.label} · {availability.message}</option>;
                })}
              </select>
            </label>
            <label>
              <span>ผู้ดูแลรับผิดชอบ</span>
              <select value={attendance.responsibleStaffId ?? ""} onChange={(event) => changeStaff(event.currentTarget.value)} aria-label={`เลือกผู้ดูแลให้ ${pet.name}`}>
                <option value="">ยังไม่มอบหมาย</option>
                {staff.map((member) => <option key={member.staffId} value={member.staffId} disabled={!member.active}>{member.name}{member.active ? "" : " · ปิดใช้งาน"}</option>)}
              </select>
            </label>
          </fieldset>
          {!canReassign ? <p className="daycare-detail__hint">รายการที่รับกลับหรือปิดงานแล้วจะเก็บโซนและผู้ดูแลเดิมไว้ในประวัติ</p> : null}
        </section>

        <section className="daycare-detail-section" aria-labelledby="daycare-care-title">
          <header><div><span>ดูแลระหว่างวัน</span><h3 id="daycare-care-title">กิจกรรมการดูแล</h3></div><PawPrint size={20} /></header>
          <form className="daycare-care-compose" onSubmit={recordCare}>
            <label>
              <span>ประเภทกิจกรรม</span>
              <select value={careKind} onChange={(event) => setCareKind(event.currentTarget.value as PrototypeDaycareCareKind)} disabled={!canRecordCare}>
                {CARE_KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>รายละเอียด (ถ้ามี)</span>
              <input value={careNote} maxLength={160} onInput={(event) => setCareNote(event.currentTarget.value)} placeholder="เช่น ทานครบ เล่นได้ตามปกติ" disabled={!canRecordCare} />
            </label>
            <button type="submit" disabled={!canRecordCare}>บันทึกกิจกรรม</button>
          </form>
          {attendance.careEvents.length > 0 ? (
            <ol className="daycare-care-log">
              {attendance.careEvents.slice().reverse().map((event) => {
                const member = staff.find((item) => item.staffId === event.staffId);
                return <li key={event.id}><time dateTime={event.occurredAt}>{eventTime(event.occurredAt)}</time><span><strong>{event.label}</strong><small>{event.note ?? "ไม่มีรายละเอียดเพิ่ม"}{member ? ` · ${member.name}` : ""}</small></span><CheckCircle size={17} /></li>;
              })}
            </ol>
          ) : <p className="daycare-detail__empty">ยังไม่มีกิจกรรมการดูแลที่บันทึกไว้</p>}
          {!canRecordCare ? <p className="daycare-detail__hint">บันทึกกิจกรรมได้ตั้งแต่รับน้องเข้า จนถึงพร้อมรับกลับ</p> : null}
        </section>

        <section className="daycare-detail-section" aria-labelledby="daycare-note-title">
          <header><div><span>ใช้ภายในทีม</span><h3 id="daycare-note-title">หมายเหตุของร้าน</h3></div><Save size={20} /></header>
          <label className="daycare-note-field">
            <span>รายละเอียดที่ทีมควรรู้</span>
            <textarea rows={3} maxLength={360} value={businessNote} onInput={(event) => setBusinessNote(event.currentTarget.value)} placeholder="เช่น แยกพักหลังอาหาร หรือชอบเล่นกลุ่มเล็ก" />
          </label>
          <button className="daycare-note-save" type="button" onClick={saveBusinessNote}><Save size={17} />บันทึกหมายเหตุ</button>
        </section>

        <section className="daycare-detail-section" aria-labelledby="daycare-history-title">
          <header><div><span>ประวัติการเปลี่ยนแปลง</span><h3 id="daycare-history-title">กิจกรรมรายการ</h3></div></header>
          <ol className="daycare-history-list">
            {attendance.history.slice().reverse().map((item) => <li key={item.id}><time dateTime={item.at}>{item.at.slice(0, 10)} · {eventTime(item.at)}</time><span>{item.summary}</span></li>)}
          </ol>
        </section>
      </div>
    </BusinessModal>
  );
}
