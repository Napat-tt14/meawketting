import type { DragEvent, PointerEvent } from "react";
import type { PrototypeBooking } from "../../_prototype/businessState";
import { CalendarDays } from "../../_components/icons";
import { BookingItem } from "./BookingItem";
import type { BookingDropTarget, CalendarDragOperation } from "./bookingMutation";
import { bookingDropTargetKey } from "./bookingMutation";
import { bookingOccursOnDate, bookingPetLabel, calendarDateLabel, calendarWeekdayLabel } from "./calendarPresentation";

type DragState = { bookingId: string; operation: CalendarDragOperation; copy: boolean } | null;
type DropPreview = { key: string; available: boolean } | null;

export function CalendarAgenda({
  date,
  days = [],
  bookings,
  dragState,
  dropPreview,
  onSelect,
  onDateChange,
  onDragStart,
  onPreviewDrop,
  onCommitDrop,
  onDragEnd,
  onPointerDragStart,
  settledBookingId = null,
}: {
  date: string;
  days?: readonly string[];
  bookings: readonly PrototypeBooking[];
  dragState: DragState;
  dropPreview: DropPreview;
  onSelect: (booking: PrototypeBooking) => void;
  onDateChange?: (date: string) => void;
  onDragStart: (booking: PrototypeBooking, operation: CalendarDragOperation, event: DragEvent<HTMLElement>) => void;
  onPreviewDrop: (target: BookingDropTarget) => void;
  onCommitDrop: (target: BookingDropTarget) => void;
  onDragEnd: () => void;
  onPointerDragStart?: (booking: PrototypeBooking, operation: CalendarDragOperation, event: PointerEvent<HTMLElement>) => void;
  settledBookingId?: string | null;
}) {
  const agendaBookings = bookings.filter((booking) => bookingOccursOnDate(booking, date));

  function dropClass(target: BookingDropTarget) {
    if (!dragState || dropPreview?.key !== bookingDropTargetKey(target)) return "";
    return dropPreview.available ? " is-drop-valid" : " is-drop-invalid";
  }

  return (
    <section className="calendar-agenda" aria-labelledby="calendar-agenda-title">
      <header className="calendar-agenda__heading">
        <div>
          <span className="calendar-agenda__eyebrow">ตารางงาน</span>
          <h2 id="calendar-agenda-title">{calendarDateLabel(date)}</h2>
        </div>
        <strong>{agendaBookings.length} งาน</strong>
      </header>
      {days.length > 0 && onDateChange ? (
        <div className="calendar-agenda__days" role="tablist" aria-label="เลือกวันที่">
          {days.map((day) => {
            const target = { date: day } satisfies BookingDropTarget;
            return (
              <button
                className={dropClass(target)}
                key={day}
                type="button"
                role="tab"
                aria-selected={day === date}
                data-calendar-drop-date={day}
                onClick={() => onDateChange(day)}
                onDragOver={(event) => {
                  if (!dragState) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = dragState.copy ? "copy" : "move";
                  onPreviewDrop(target);
                }}
                onDrop={(event) => { event.preventDefault(); onCommitDrop(target); }}
              >
                <span>{calendarWeekdayLabel(day)}</span>
                <strong>{calendarDateLabel(day, { day: "numeric" })}</strong>
              </button>
            );
          })}
        </div>
      ) : null}
      {agendaBookings.length > 0 ? (
        <ol className="calendar-agenda__list">
          {agendaBookings.map((booking) => {
            const draggable = booking.status !== "cancelled";
            const stay = booking.timeModel === "date-range";
            const petLabel = bookingPetLabel(booking);
            return (
              <li className={`calendar-agenda__booking${stay ? " calendar-agenda__booking--stay" : ""}`} key={booking.bookingId}>
                {stay && draggable ? (
                  <button
                    className="calendar-agenda__resize is-start"
                    type="button"
                    draggable
                    data-booking-id={booking.bookingId}
                    aria-label={`ปรับวันเริ่มเข้าพักของ ${petLabel}`}
                    title="กดค้างแล้วลากเพื่อปรับวันเริ่ม"
                    onClick={(event) => event.stopPropagation()}
                    onDragStart={(event) => onDragStart(booking, "resize-start", event)}
                    onDragEnd={onDragEnd}
                    onPointerDown={(event) => onPointerDragStart?.(booking, "resize-start", event)}
                  />
                ) : null}
                <BookingItem
                  booking={booking}
                  compact
                  draggable={draggable}
                  dragging={dragState?.bookingId === booking.bookingId}
                  settled={settledBookingId === booking.bookingId}
                  onSelect={onSelect}
                  onDragStart={(event) => onDragStart(booking, "move", event)}
                  onDragEnd={onDragEnd}
                  onPointerDown={(event) => onPointerDragStart?.(booking, "move", event)}
                />
                {stay && draggable ? (
                  <button
                    className="calendar-agenda__resize is-end"
                    type="button"
                    draggable
                    data-booking-id={booking.bookingId}
                    aria-label={`ปรับวันเช็กเอาต์ของ ${petLabel}`}
                    title="กดค้างแล้วลากเพื่อปรับวันเช็กเอาต์"
                    onClick={(event) => event.stopPropagation()}
                    onDragStart={(event) => onDragStart(booking, "resize-end", event)}
                    onDragEnd={onDragEnd}
                    onPointerDown={(event) => onPointerDragStart?.(booking, "resize-end", event)}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="calendar-empty-state">
          <CalendarDays size={24} />
          <div><strong>ยังไม่มีการจองในวันนี้</strong><span>เพิ่มการจอง หรือเลือกวันอื่นเพื่อตรวจตาราง</span></div>
        </div>
      )}
    </section>
  );
}
