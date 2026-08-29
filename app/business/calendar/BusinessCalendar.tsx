"use client";

import { type DragEvent, type PointerEvent as ReactPointerEvent, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import type { BookingStatus, BusinessServiceModule, PrototypeBooking } from "../../_prototype/businessState";
import {
  BOOKING_DEMO_DATE,
  BOOKING_STATUS_LABELS,
  evaluatePrototypeBookingAvailability,
  getEnabledBusinessModules,
  listPrototypeBookingFixtures,
  listPrototypeBookings,
  readPrototypeBooking,
  savePrototypeBooking,
} from "../../_prototype/businessState";
import { ArrowLeft, ArrowRight, CalendarDays, CircleAlert, Plus } from "../../_components/icons";
import { useBusinessContext } from "../_components/useBusinessContext";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { BookingEditor } from "./BookingEditor";
import { CalendarAgenda } from "./CalendarAgenda";
import { CalendarDayTimeline } from "./CalendarDayTimeline";
import { CalendarPlanningBoard } from "./CalendarPlanningBoard";
import {
  type BookingDropTarget,
  type CalendarDragOperation,
  bookingDropTargetKey,
  buildBookingCopyDraft,
  buildBookingMutationDraft,
} from "./bookingMutation";
import {
  addCalendarDays,
  addCalendarMonths,
  calendarDateLabel,
  calendarRangeLabel,
  daysForCalendarMonth,
  daysForCalendarWeek,
  daysForCustomRange,
} from "./calendarPresentation";

export type CalendarView = "day" | "week" | "month" | "custom";
type CustomRangeDays = 28 | 35 | 42;
type StatusFilter = "active" | "all" | BookingStatus;
type EditorState = { kind: "new"; customerId?: string | null; petId?: string | null } | { kind: "edit"; booking: PrototypeBooking } | null;
type DragState = { booking: PrototypeBooking; operation: CalendarDragOperation; copy: boolean } | null;
type DropPreview = { key: string; available: boolean } | null;
type InteractionConflict = { booking: PrototypeBooking; messages: readonly string[]; allowAlternative: boolean } | null;
export type CalendarLaunchRequest = { key: string; customerId: string | null; petId: string | null; bookingId: string | null };

export const CUSTOM_CALENDAR_RANGE_OPTIONS = [28, 35, 42] as const satisfies readonly CustomRangeDays[];

const CALENDAR_VIEW_COOKIE_PREFIX = "meawketting_business_calendar_view";

function isCalendarView(value: string | undefined): value is CalendarView {
  return value === "day" || value === "week" || value === "month" || value === "custom";
}

function calendarViewCookieName(businessId: string, branchId: string) {
  return `${CALENDAR_VIEW_COOKIE_PREFIX}_${businessId}_${branchId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function readCalendarViewPreference(name: string) {
  const entry = document.cookie.split("; ").find((item) => item.startsWith(`${name}=`));
  const value = entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
  return isCalendarView(value) ? value : null;
}

function writeCalendarViewPreference(name: string, view: CalendarView) {
  document.cookie = `${name}=${encodeURIComponent(view)}; Max-Age=31536000; Path=/business; SameSite=Lax`;
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable);
}

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

export function BusinessCalendar({ launchRequest = null }: { launchRequest?: CalendarLaunchRequest | null }) {
  const { context } = useBusinessContext();
  const launchKey = launchRequest?.key ?? null;
  const launchCustomerId = launchRequest?.customerId ?? null;
  const launchPetId = launchRequest?.petId ?? null;
  const launchBookingId = launchRequest?.bookingId ?? null;
  const [selectedDate, setSelectedDate] = useState<string>(BOOKING_DEMO_DATE);
  const [view, setView] = useState<CalendarView>("week");
  const [customRangeDays, setCustomRangeDays] = useState<CustomRangeDays>(28);
  const [moduleFilter, setModuleFilter] = useState<"all" | BusinessServiceModule>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<EditorState>(() => (
    launchKey && !launchBookingId
      ? { kind: "new", customerId: launchCustomerId, petId: launchPetId }
      : null
  ));
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [dragState, setDragState] = useState<DragState>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview>(null);
  const [settledBookingId, setSettledBookingId] = useState<string | null>(null);
  const [interactionConflict, setInteractionConflict] = useState<InteractionConflict>(null);
  const handledLaunchRef = useRef<string | null>(launchBookingId ? null : launchKey);
  const pointerDragRef = useRef<{ dispose: () => void } | null>(null);
  const settledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressSelectRef = useRef(false);
  const suppressSelectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedBookingRef = useRef<PrototypeBooking | null>(null);
  const bookingStateReady = useIsClient();
  const viewPreferenceName = calendarViewCookieName(context.businessId, context.branchId);

  useEffect(() => {
    const sync = () => setRevision((current) => current + 1);
    window.addEventListener("meawketting:business-state", sync);
    return () => window.removeEventListener("meawketting:business-state", sync);
  }, []);

  useEffect(() => {
    const rememberedView = readCalendarViewPreference(viewPreferenceName);
    if (!rememberedView) return;
    const frame = window.requestAnimationFrame(() => setView(rememberedView));
    return () => window.cancelAnimationFrame(frame);
  }, [viewPreferenceName]);

  useEffect(() => () => {
    pointerDragRef.current?.dispose();
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    if (confirmationTimerRef.current) clearTimeout(confirmationTimerRef.current);
    if (suppressSelectTimerRef.current) clearTimeout(suppressSelectTimerRef.current);
  }, []);

  useEffect(() => {
    if (!launchKey) {
      handledLaunchRef.current = null;
      return;
    }
    if (launchBookingId) {
      if (!bookingStateReady || handledLaunchRef.current === launchKey) return;
      handledLaunchRef.current = launchKey;
      const booking = readPrototypeBooking(launchBookingId);
      if (!booking || booking.businessId !== context.businessId || booking.branchId !== context.branchId) {
        const frame = window.requestAnimationFrame(() => setConfirmation("การจองนี้อยู่คนละสาขาหรือไม่พบในบริบทปัจจุบัน"));
        return () => window.cancelAnimationFrame(frame);
      }
      const frame = window.requestAnimationFrame(() => {
        setSelectedDate(booking.start.slice(0, 10));
        setEditor({ kind: "edit", booking });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    if (editor || handledLaunchRef.current === launchKey) return;
    handledLaunchRef.current = launchKey;
    const frame = window.requestAnimationFrame(() => {
      setEditor({ kind: "new", customerId: launchCustomerId, petId: launchPetId });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [bookingStateReady, context.branchId, context.businessId, editor, launchBookingId, launchCustomerId, launchKey, launchPetId]);

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
  const displayedDays = view === "day"
    ? [selectedDate]
    : view === "week"
      ? daysForCalendarWeek(selectedDate)
      : view === "month"
        ? daysForCalendarMonth(selectedDate)
        : daysForCustomRange(selectedDate, customRangeDays);

  function moveDate(direction: -1 | 1) {
    if (view === "month") setSelectedDate((current) => addCalendarMonths(current, direction));
    else setSelectedDate((current) => addCalendarDays(current, direction * (view === "day" ? 1 : view === "week" ? 7 : customRangeDays)));
  }

  function chooseView(nextView: CalendarView) {
    setView(nextView);
    writeCalendarViewPreference(viewPreferenceName, nextView);
  }

  function suppressNextSelect() {
    suppressSelectRef.current = true;
    if (suppressSelectTimerRef.current) clearTimeout(suppressSelectTimerRef.current);
    suppressSelectTimerRef.current = window.setTimeout(() => {
      suppressSelectRef.current = false;
      suppressSelectTimerRef.current = null;
    }, 360);
  }

  function openEdit(booking: PrototypeBooking) {
    if (suppressSelectRef.current) {
      suppressSelectRef.current = false;
      return;
    }
    setConfirmation(null);
    setInteractionConflict(null);
    setEditor({ kind: "edit", booking });
  }

  function clearLaunchQuery() {
    const params = new URLSearchParams(window.location.search);
    params.delete("customerId");
    params.delete("petId");
    params.delete("new");
    params.delete("bookingId");
    window.history.replaceState(null, "", `${window.location.pathname}${params.size > 0 ? `?${params.toString()}` : ""}`);
  }

  function closeEditor() {
    clearLaunchQuery();
    setEditor(null);
  }

  function completeSave(booking: PrototypeBooking, created: boolean) {
    clearLaunchQuery();
    setEditor(null);
    if (confirmationTimerRef.current) clearTimeout(confirmationTimerRef.current);
    setConfirmation(created ? `เพิ่มการจองของ ${booking.pets[0]?.name ?? "น้อง"} แล้ว` : booking.status === "cancelled" ? "ยกเลิกการจองแล้ว โดยเก็บประวัติไว้" : "บันทึกการเปลี่ยนแปลงแล้ว");
    confirmationTimerRef.current = window.setTimeout(() => {
      setConfirmation(null);
      confirmationTimerRef.current = null;
    }, 2800);
  }

  function beginDrag(booking: PrototypeBooking, operation: CalendarDragOperation, event: DragEvent<HTMLElement>) {
    const copy = operation === "move" && event.altKey;
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setData("text/plain", `${booking.bookingId}:${operation}:${copy ? "copy" : "move"}`);
    setConfirmation(null);
    setInteractionConflict(null);
    setDropPreview(null);
    setDragState({ booking, operation, copy });
  }

  function previewDropFor(booking: PrototypeBooking, operation: CalendarDragOperation, target: BookingDropTarget) {
    const draft = buildBookingMutationDraft(booking, operation, target);
    const availability = evaluatePrototypeBookingAvailability(draft, context);
    const preview = { key: bookingDropTargetKey(target), available: availability.available };
    setDropPreview((current) => current?.key === preview.key && current.available === preview.available ? current : preview);
  }

  function previewDrop(target: BookingDropTarget) {
    if (!dragState) return;
    previewDropFor(dragState.booking, dragState.operation, target);
  }

  function endDrag() {
    setDragState(null);
    setDropPreview(null);
  }

  function markBookingSettled(bookingId: string) {
    if (settledTimerRef.current) clearTimeout(settledTimerRef.current);
    setSettledBookingId(bookingId);
    settledTimerRef.current = window.setTimeout(() => {
      setSettledBookingId(null);
      settledTimerRef.current = null;
    }, 300);
  }

  function commitDropFor(booking: PrototypeBooking, operation: CalendarDragOperation, target: BookingDropTarget, copy = false) {
    setConfirmation(null);
    setInteractionConflict(null);
    const draft = copy
      ? buildBookingCopyDraft(booking, target)
      : buildBookingMutationDraft(booking, operation, target);
    const availability = evaluatePrototypeBookingAvailability(draft, context);
    if (!availability.available) {
      setInteractionConflict({
        booking,
        messages: availability.conflicts.map((conflict) => conflict.message),
        allowAlternative: availability.conflicts.some((conflict) => conflict.recovery === "change-resource"),
      });
      endDrag();
      return;
    }
    const result = savePrototypeBooking(draft, context);
    if (!result.ok) {
      setInteractionConflict({ booking, messages: result.availability.conflicts.map((conflict) => conflict.message), allowAlternative: true });
      endDrag();
      return;
    }
    setRevision((current) => current + 1);
    markBookingSettled(result.booking.bookingId);
    setAnnouncement(copy
      ? `คัดลอกการจองของ ${result.booking.pets[0]?.name ?? "น้อง"} ไปช่วงใหม่แล้ว`
      : operation === "move"
        ? `${result.booking.pets[0]?.name ?? "น้อง"} ย้ายไปช่วงใหม่แล้ว`
        : result.booking.timeModel === "date-range"
          ? `ปรับ${operation === "resize-start" ? "วันเริ่ม" : "วันเช็กเอาต์"}ของ ${result.booking.pets[0]?.name ?? "น้อง"} แล้ว`
          : `ปรับระยะเวลาของ ${result.booking.pets[0]?.name ?? "น้อง"} แล้ว`);
    endDrag();
  }

  function commitDrop(target: BookingDropTarget) {
    if (!dragState) return;
    commitDropFor(dragState.booking, dragState.operation, target, dragState.copy);
  }

  function pointerDropTarget(clientX: number, clientY: number): BookingDropTarget | null {
    const zone = [...document.querySelectorAll<HTMLElement>("[data-calendar-drop-date]")].find((element) => {
      const bounds = element.getBoundingClientRect();
      return clientX >= bounds.left && clientX <= bounds.right && clientY >= bounds.top && clientY <= bounds.bottom;
    });
    const date = zone?.dataset.calendarDropDate;
    return date ? { date, time: zone?.dataset.calendarDropTime || undefined } : null;
  }

  function beginPointerDrag(booking: PrototypeBooking, operation: CalendarDragOperation, event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" || event.button !== 0) return;
    pointerDragRef.current?.dispose();

    const pointerId = event.pointerId;
    const origin = { x: event.clientX, y: event.clientY };
    const source = event.currentTarget;
    const copy = operation === "move" && event.altKey;
    let active = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const dispose = () => {
      if (timer) clearTimeout(timer);
      if (source.hasPointerCapture(pointerId)) source.releasePointerCapture(pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      if (pointerDragRef.current?.dispose === dispose) pointerDragRef.current = null;
    };
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if (!active) {
        if (Math.hypot(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y) > 8) dispose();
        return;
      }
      if (moveEvent.cancelable) moveEvent.preventDefault();
      const target = pointerDropTarget(moveEvent.clientX, moveEvent.clientY);
      if (target) previewDropFor(booking, operation, target);
    };
    const finish = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId !== pointerId) return;
      const target = active && finishEvent.type !== "pointercancel" ? pointerDropTarget(finishEvent.clientX, finishEvent.clientY) : null;
      const shouldCommit = active && target;
      dispose();
      if (active) suppressNextSelect();
      if (shouldCommit && target) {
        if (finishEvent.cancelable) finishEvent.preventDefault();
        commitDropFor(booking, operation, target, copy);
      } else if (active) {
        endDrag();
      }
    };

    timer = window.setTimeout(() => {
      active = true;
      if (source.isConnected) source.setPointerCapture(pointerId);
      setConfirmation(null);
      setInteractionConflict(null);
      setDropPreview(null);
      setDragState({ booking, operation, copy });
    }, 240);
    pointerDragRef.current = { dispose };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }

  const handleCalendarShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((!event.ctrlKey && !event.metaKey) || event.altKey || event.repeat) return;
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement) || isEditableTarget(activeElement)) return;

    const key = event.key.toLowerCase();
    if (key === "c") {
      const bookingId = activeElement.closest<HTMLElement>("[data-booking-id]")?.dataset.bookingId;
      const booking = bookingId ? bookings.find((item) => item.bookingId === bookingId) ?? null : null;
      if (!booking || booking.status === "cancelled") return;
      event.preventDefault();
      copiedBookingRef.current = booking;
      setAnnouncement(`คัดลอกการจองของ ${booking.pets[0]?.name ?? "น้อง"} แล้ว เลือกวันและกด Control V เพื่อวาง`);
      return;
    }

    if (key !== "v" || !copiedBookingRef.current) return;
    const targetElement = activeElement.closest<HTMLElement>("[data-calendar-drop-date]");
    const targetDate = targetElement?.dataset.calendarDropDate ?? selectedDate;
    const targetTime = targetElement?.dataset.calendarDropTime;
    event.preventDefault();
    commitDropFor(copiedBookingRef.current, "move", { date: targetDate, time: targetTime || undefined }, true);
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleCalendarShortcut(event);
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const boardDragState = dragState ? { bookingId: dragState.booking.bookingId, operation: dragState.operation, copy: dragState.copy } : null;

  return (
    <div className={`business-calendar shell${dragState ? " is-dragging" : ""}`} aria-keyshortcuts="Control+C Control+V Meta+C Meta+V">
      <BusinessPageHeader
        title="ปฏิทิน"
        actions={<button className="button button--business business-calendar__add" type="button" onClick={() => { setConfirmation(null); setEditor({ kind: "new" }); }}>
          <Plus size={19} />เพิ่มการจอง
        </button>}
      />

      <section className="calendar-toolbar" aria-label="เครื่องมือปฏิทิน">
        <div className="calendar-toolbar__date">
          <button type="button" aria-label="ดูช่วงก่อนหน้า" onClick={() => moveDate(-1)}><ArrowLeft size={18} /></button>
          <label>
            <span>วันที่</span>
            <input type="date" value={selectedDate} onInput={(event) => setSelectedDate(event.currentTarget.value)} />
          </label>
          <button type="button" aria-label="ดูช่วงถัดไป" onClick={() => moveDate(1)}><ArrowRight size={18} /></button>
          <button className="calendar-toolbar__demo-day" type="button" aria-label={`ไปวันนี้ ${calendarDateLabel(BOOKING_DEMO_DATE, { day: "numeric", month: "short" })}`} onClick={() => setSelectedDate(BOOKING_DEMO_DATE)}>
            <strong>วันนี้</strong>
            <span>{calendarDateLabel(BOOKING_DEMO_DATE, { day: "numeric", month: "short" })}</span>
          </button>
        </div>
        <div className="calendar-toolbar__view" aria-label="มุมมองปฏิทิน">
          <button type="button" aria-pressed={view === "day"} onClick={() => chooseView("day")}>วัน</button>
          <button type="button" aria-pressed={view === "week"} onClick={() => chooseView("week")}>สัปดาห์</button>
          <button type="button" aria-pressed={view === "month"} onClick={() => chooseView("month")}>เดือน</button>
          <button type="button" aria-pressed={view === "custom"} onClick={() => chooseView("custom")}>กำหนดเอง</button>
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
          {view === "custom" ? (
            <label>
              <span>จำนวนวัน</span>
              <select value={customRangeDays} onChange={(event) => setCustomRangeDays(Number(event.target.value) as CustomRangeDays)}>
                {CUSTOM_CALENDAR_RANGE_OPTIONS.map((days) => <option key={days} value={days}>{days} วัน</option>)}
              </select>
            </label>
          ) : null}
        </div>
        <p className="calendar-toolbar__range"><CalendarDays size={16} />{calendarRangeLabel(displayedDays)}</p>
      </section>

      {confirmation ? <p className="business-calendar__confirmation" role="status" aria-live="polite">{confirmation}</p> : null}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
      {interactionConflict ? (
        <section className="calendar-interaction-conflict" role="alert">
          <CircleAlert size={20} />
          <div>
            <strong>ยังย้ายรายการนี้ไม่ได้</strong>
            <ul>{interactionConflict.messages.map((message) => <li key={message}>{message}</li>)}</ul>
            <div>
              <button type="button" onClick={() => setInteractionConflict(null)}>กลับตำแหน่งเดิม</button>
              <button type="button" onClick={() => { setInteractionConflict(null); openEdit(interactionConflict.booking); }}>เลือกวัน/เวลาใหม่</button>
              {interactionConflict.allowAlternative ? <button type="button" onClick={() => { setInteractionConflict(null); openEdit(interactionConflict.booking); }}>เลือกตัวเลือกอื่น</button> : null}
            </div>
          </div>
        </section>
      ) : null}

      <div className="business-calendar__surface">
        <div className="business-calendar__desktop-view">
          {view === "day" ? (
            <CalendarDayTimeline
              date={selectedDate}
              bookings={filteredBookings}
              dragState={boardDragState}
              dropPreview={dropPreview}
              onSelect={openEdit}
              onDragStart={beginDrag}
              onPreviewDrop={previewDrop}
              onCommitDrop={commitDrop}
              onDragEnd={endDrag}
              onPointerDragStart={beginPointerDrag}
              settledBookingId={settledBookingId}
            />
          ) : (
            <CalendarPlanningBoard
              days={displayedDays}
              selectedDate={selectedDate}
              variant={view}
              bookings={filteredBookings}
              dragState={boardDragState}
              dropPreview={dropPreview}
              onSelect={openEdit}
              onDragStart={beginDrag}
              onPreviewDrop={previewDrop}
              onCommitDrop={commitDrop}
              onDragEnd={endDrag}
              onPointerDragStart={beginPointerDrag}
              settledBookingId={settledBookingId}
            />
          )}
        </div>
        <div className="business-calendar__mobile-view">
          <CalendarAgenda
            date={selectedDate}
            days={daysForCalendarWeek(selectedDate)}
            bookings={filteredBookings}
            dragState={boardDragState}
            dropPreview={dropPreview}
            onSelect={openEdit}
            onDateChange={setSelectedDate}
            onDragStart={beginDrag}
            onPreviewDrop={previewDrop}
            onCommitDrop={commitDrop}
            onDragEnd={endDrag}
            onPointerDragStart={beginPointerDrag}
            settledBookingId={settledBookingId}
          />
        </div>
      </div>

      <details id="calendar-shortcut-guide" className="calendar-interaction-guide">
        <summary>วิธีจัดการตารางและคีย์ลัด</summary>
        <div>
          <p>ลากรายการเพื่อย้าย · กดค้างแล้วลากบนจอสัมผัส · ใช้ขอบซ้าย/ขวาเพื่อย่อหรือขยายวันพัก และขอบบน/ล่างเพื่อปรับเวลา</p>
          <ul aria-label="คีย์ลัดปฏิทิน">
            <li><kbd>Ctrl</kbd><span>+</span><kbd>C</kbd><span>คัดลอก</span></li>
            <li><kbd>Ctrl</kbd><span>+</span><kbd>V</kbd><span>วางในวันที่เลือก</span></li>
            <li><kbd>Alt</kbd><span>+</span><span>ลาก</span><span>ทำสำเนา</span></li>
          </ul>
        </div>
      </details>

      {editor ? (
        <BookingEditor
          key={editor.kind === "edit" ? editor.booking.bookingId : "new"}
          context={context}
          initialBooking={editor.kind === "edit" ? editor.booking : null}
          selectedDate={selectedDate}
          preselectedCustomerId={editor.kind === "new" ? editor.customerId : null}
          preselectedPetId={editor.kind === "new" ? editor.petId : null}
          onClose={closeEditor}
          onSaved={completeSave}
        />
      ) : null}
    </div>
  );
}
