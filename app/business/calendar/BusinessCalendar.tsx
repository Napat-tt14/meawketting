"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { BookingStatus, BusinessServiceModule, PrototypeBooking } from "../../_prototype/businessState";
import {
  BOOKING_DEMO_DATE,
  BOOKING_STATUS_LABELS,
  getDemoBusinessContextDetails,
  getEnabledBusinessModules,
  listPrototypeBookingFixtures,
  listPrototypeBookings,
} from "../../_prototype/businessState";
import { ArrowLeft, ArrowRight, CalendarDays, Info, Plus } from "../../_components/icons";
import { useBusinessContext } from "../_components/useBusinessContext";
import { BookingEditor } from "./BookingEditor";
import { CalendarAgenda } from "./CalendarAgenda";
import { CalendarWeekView } from "./CalendarWeekView";
import { addCalendarDays, daysForCalendarWeek } from "./calendarPresentation";

type CalendarView = "day" | "week";
type StatusFilter = "active" | "all" | BookingStatus;
type EditorState = { kind: "new" } | { kind: "edit"; booking: PrototypeBooking } | null;

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const moduleFilterOptions: readonly { value: "all" | BusinessServiceModule; label: string }[] = [
  { value: "all", label: "ทุกบริการ" },
  { value: "grooming", label: "อาบน้ำ / ตัดขน" },
  { value: "hotel", label: "โรงแรม" },
  { value: "daycare", label: "Daycare" },
];

export function BusinessCalendar() {
  const { context } = useBusinessContext();
  const [selectedDate, setSelectedDate] = useState(BOOKING_DEMO_DATE);
  const [view, setView] = useState<CalendarView>("week");
  const [moduleFilter, setModuleFilter] = useState<"all" | BusinessServiceModule>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<EditorState>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const bookingStateReady = useIsClient();
  const details = getDemoBusinessContextDetails(context);

  useEffect(() => {
    const sync = () => setRevision((current) => current + 1);
    window.addEventListener("meawketting:business-state", sync);
    return () => window.removeEventListener("meawketting:business-state", sync);
  }, []);

  const enabledModuleList = getEnabledBusinessModules(context);
  const effectiveModuleFilter = moduleFilter === "all" || enabledModuleList.includes(moduleFilter) ? moduleFilter : "all";

  void revision;
  const bookings = bookingStateReady
    ? listPrototypeBookings(context, { includeCancelled: true })
    : listPrototypeBookingFixtures(context, { includeCancelled: true });
  const enabledModules = new Set(enabledModuleList);
  const filteredBookings = bookings.filter((booking) => (
    (effectiveModuleFilter === "all" || booking.serviceModule === effectiveModuleFilter)
    && (statusFilter === "all" || (statusFilter === "active" ? booking.status !== "cancelled" : booking.status === statusFilter))
  ));
  const filterModules = moduleFilterOptions.filter((option) => option.value === "all" || enabledModules.has(option.value));
  const displayedDays = view === "week" ? daysForCalendarWeek(selectedDate) : [selectedDate];
  const changeBy = view === "week" ? 7 : 1;

  function openEdit(booking: PrototypeBooking) {
    setConfirmation(null);
    setEditor({ kind: "edit", booking });
  }

  function completeSave(booking: PrototypeBooking, created: boolean) {
    setEditor(null);
    setConfirmation(created ? `เพิ่มการจองของ ${booking.pets[0]?.name ?? "น้อง"} แล้ว` : booking.status === "cancelled" ? "ยกเลิกการจองแล้ว โดยเก็บประวัติไว้" : "บันทึกการเปลี่ยนแปลงแล้ว");
  }

  return (
    <div className="business-calendar shell">
      <header className="business-calendar__heading">
        <div>
          <span className="business-demo-label"><Info size={16} /> ข้อมูลตัวอย่าง</span>
          <p>{details.business?.name ?? "ร้านตัวอย่าง"} · {details.branch?.name ?? "สาขาตัวอย่าง"}</p>
          <h1>ปฏิทิน</h1>
          <strong>ดูว่างานของสาขานี้เกิดขึ้นเมื่อไร</strong>
        </div>
        <button className="button button--business business-calendar__add" type="button" onClick={() => { setConfirmation(null); setEditor({ kind: "new" }); }}>
          <Plus size={19} />เพิ่มการจอง
        </button>
      </header>

      <section className="calendar-toolbar" aria-label="เครื่องมือปฏิทิน">
        <div className="calendar-toolbar__date">
          <button type="button" aria-label="ย้อนวัน" onClick={() => setSelectedDate((current) => addCalendarDays(current, -changeBy))}><ArrowLeft size={18} /></button>
          <label>
            <span>วันที่ที่ดู</span>
            <input type="date" value={selectedDate} onInput={(event) => setSelectedDate(event.currentTarget.value)} />
          </label>
          <button type="button" aria-label="ไปวันถัดไป" onClick={() => setSelectedDate((current) => addCalendarDays(current, changeBy))}><ArrowRight size={18} /></button>
          <button className="calendar-toolbar__demo-day" type="button" onClick={() => setSelectedDate(BOOKING_DEMO_DATE)}>วันตัวอย่าง</button>
        </div>
        <div className="calendar-toolbar__filters">
          <label>
            <span>บริการ</span>
            <select value={effectiveModuleFilter} onChange={(event) => setModuleFilter(event.target.value as "all" | BusinessServiceModule)}>
              {filterModules.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>สถานะ</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="active">ไม่รวมรายการยกเลิก</option>
              <option value="all">ทุกสถานะ</option>
              {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="calendar-toolbar__view" aria-label="มุมมองปฏิทิน">
            <button type="button" aria-pressed={view === "day"} onClick={() => setView("day")}>วัน</button>
            <button type="button" aria-pressed={view === "week"} onClick={() => setView("week")}>สัปดาห์</button>
          </div>
        </div>
      </section>

      {confirmation ? <p className="business-calendar__confirmation" role="status"><CalendarDays size={18} />{confirmation}</p> : null}

      <div className="business-calendar__surface">
        <div className="business-calendar__desktop-view">
          <CalendarWeekView days={displayedDays} selectedDate={selectedDate} bookings={filteredBookings} onSelect={openEdit} />
        </div>
        <div className="business-calendar__mobile-view">
          <CalendarAgenda date={selectedDate} bookings={filteredBookings} onSelect={openEdit} />
        </div>
      </div>

      <p className="business-calendar__boundary">ปฏิทินนี้เป็นแกนกลางการวางแผนของสาขา ไม่ใช่ตารางงานเฉพาะบริการใดบริการหนึ่ง ข้อมูลการจองและความพร้อมเป็นต้นแบบในเบราว์เซอร์</p>

      {editor ? (
        <BookingEditor
          key={editor.kind === "edit" ? editor.booking.bookingId : "new"}
          context={context}
          initialBooking={editor.kind === "edit" ? editor.booking : null}
          selectedDate={selectedDate}
          onClose={() => setEditor(null)}
          onSaved={completeSave}
        />
      ) : null}
    </div>
  );
}
