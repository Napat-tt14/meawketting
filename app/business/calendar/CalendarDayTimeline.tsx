import type { CSSProperties, DragEvent, PointerEvent } from "react";
import type { PrototypeBooking } from "../../_prototype/businessState";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import { BookingItem, BookingStatusBadge } from "./BookingItem";
import type { BookingDropTarget, CalendarDragOperation } from "./bookingMutation";
import { bookingDropTargetKey } from "./bookingMutation";
import { bookingOccursOnDate, bookingPetLabel, bookingStatusLabel, bookingTimeLabel, calendarDateLabel } from "./calendarPresentation";

const START_HOUR = 8;
const END_HOUR = 20;
const SNAP_MINUTES = 30;
const TIME_SLOTS = Array.from({ length: ((END_HOUR - START_HOUR) * 60) / SNAP_MINUTES }, (_, index) => {
  const minutes = START_HOUR * 60 + index * SNAP_MINUTES;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

function minutesInDay(value: string) {
  const [hours, minutes] = value.slice(11, 16).split(":").map(Number);
  return hours * 60 + minutes;
}

export function CalendarDayTimeline({
  date,
  bookings,
  dragState,
  dropPreview,
  onSelect,
  onDragStart,
  onPreviewDrop,
  onCommitDrop,
  onDragEnd,
  onPointerDragStart,
  onOpen,
  selectedBookingId = null,
  settledBookingId = null,
}: {
  date: string;
  bookings: readonly PrototypeBooking[];
  dragState: { bookingId: string; operation: CalendarDragOperation; copy: boolean } | null;
  dropPreview: { key: string; available: boolean } | null;
  onSelect: (booking: PrototypeBooking) => void;
  onDragStart: (booking: PrototypeBooking, operation: CalendarDragOperation, event: DragEvent<HTMLElement>) => void;
  onPreviewDrop: (target: BookingDropTarget) => void;
  onCommitDrop: (target: BookingDropTarget) => void;
  onDragEnd: () => void;
  onPointerDragStart?: (booking: PrototypeBooking, operation: CalendarDragOperation, event: PointerEvent<HTMLElement>) => void;
  onOpen?: (booking: PrototypeBooking) => void;
  selectedBookingId?: string | null;
  settledBookingId?: string | null;
}) {
  const dateBookings = bookings.filter((booking) => bookingOccursOnDate(booking, date));
  const appointments = dateBookings.filter((booking) => booking.timeModel === "appointment");
  const allDayBookings = dateBookings.filter((booking) => booking.timeModel !== "appointment");

  return (
    <section className={`calendar-day-view${dragState ? " is-dragging" : ""}`} aria-labelledby="calendar-day-view-title">
      <header className="calendar-day-view__heading">
        <h2 id="calendar-day-view-title">{calendarDateLabel(date, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</h2>
        <span>{dateBookings.length} งาน</span>
      </header>

      {allDayBookings.length > 0 ? (
        <div className="calendar-day-view__all-day">
          <span>เต็มวัน / เข้าพัก</span>
          <div>{allDayBookings.map((booking) => (
            <BookingItem
              key={booking.bookingId}
              booking={booking}
              onSelect={onSelect}
              onOpen={onOpen}
              compact
              draggable={booking.status !== "cancelled"}
              selected={selectedBookingId === booking.bookingId}
              dragging={dragState?.bookingId === booking.bookingId}
              settled={settledBookingId === booking.bookingId}
              onDragStart={(event) => onDragStart(booking, "move", event)}
              onDragEnd={onDragEnd}
              onPointerDown={(event) => onPointerDragStart?.(booking, "move", event)}
            />
          ))}</div>
        </div>
      ) : null}

      <div className="calendar-day-timeline" style={{ gridTemplateRows: `repeat(${TIME_SLOTS.length}, 48px)` }}>
        {TIME_SLOTS.map((time, index) => {
          const target = { date, time } satisfies BookingDropTarget;
          const active = dropPreview?.key === bookingDropTargetKey(target);
          const style = { gridColumn: 2 } satisfies CSSProperties;
          return (
            <div key={time} className="calendar-day-timeline__slot" style={{ gridColumn: "1 / -1", gridRow: index + 1 }}>
              <time>{time.endsWith(":00") ? time : ""}</time>
              <span />
              <button
                type="button"
                className={`calendar-day-timeline__drop-zone${active ? dropPreview?.available ? " is-drop-valid" : " is-drop-invalid" : ""}`}
                style={style}
                aria-label={`เลือก ${calendarDateLabel(date)} เวลา ${time}`}
                data-calendar-drop-date={date}
                data-calendar-drop-time={time}
                data-calendar-date={date}
                data-calendar-keyboard="cell"
                onDragOver={(event) => {
                  if (!dragState) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = dragState.copy ? "copy" : "move";
                  onPreviewDrop(target);
                }}
                onDrop={(event) => { event.preventDefault(); onCommitDrop(target); }}
              />
            </div>
          );
        })}

        {appointments.map((booking) => {
          const start = minutesInDay(booking.start);
          const end = booking.end ? minutesInDay(booking.end) : start + 60;
          const startRow = Math.max(1, Math.floor((start - START_HOUR * 60) / SNAP_MINUTES) + 1);
          const span = Math.max(1, Math.ceil((end - start) / SNAP_MINUTES));
          const style = { gridColumn: 2, gridRow: `${startRow} / span ${span}` } satisfies CSSProperties;
          const petLabel = bookingPetLabel(booking);
          const draggable = booking.status !== "cancelled";
          return (
            <article className={`calendar-timeline-appointment calendar-timeline-appointment--${booking.serviceModule} calendar-timeline-appointment--${booking.status}${selectedBookingId === booking.bookingId ? " is-selected" : ""}${dragState?.bookingId === booking.bookingId ? " is-dragging" : ""}${settledBookingId === booking.bookingId ? " is-settled" : ""}`} style={style} key={booking.bookingId} data-booking-id={booking.bookingId}>
              {draggable ? <button className="calendar-timeline-appointment__resize is-start" type="button" draggable aria-label={`ปรับเวลาเริ่มของ ${petLabel}`} title="ลากเพื่อปรับเวลาเริ่ม" onDragStart={(event) => onDragStart(booking, "resize-start", event)} onDragEnd={onDragEnd} onPointerDown={(event) => onPointerDragStart?.(booking, "resize-start", event)} /> : null}
              <button
                className={`calendar-timeline-appointment__content${selectedBookingId === booking.bookingId ? " is-selected" : ""}`}
                type="button"
                draggable={draggable}
                data-booking-id={booking.bookingId}
                data-calendar-keyboard="booking"
                aria-keyshortcuts="Control+C Meta+C"
                aria-describedby="calendar-shortcut-guide"
                onDragStart={(event) => onDragStart(booking, "move", event)}
                onDragEnd={onDragEnd}
                onPointerDown={(event) => onPointerDragStart?.(booking, "move", event)}
                onClick={() => onSelect(booking)}
                onDoubleClick={() => onOpen?.(booking)}
                aria-pressed={selectedBookingId === booking.bookingId}
                aria-label={`เลือกการจอง ${petLabel} ${booking.service.label} สถานะ ${bookingStatusLabel(booking.status)} กด Enter เพื่อแก้ไข`}
              >
                <BusinessServiceIcon module={booking.serviceModule} size={18} />
                <span><strong>{petLabel}</strong><small>{bookingTimeLabel(booking)} · {booking.service.label}</small></span>
                <BookingStatusBadge status={booking.status} />
              </button>
              {draggable ? <button className="calendar-timeline-appointment__resize is-end" type="button" draggable aria-label={`ปรับเวลาสิ้นสุดของ ${petLabel}`} title="ลากเพื่อปรับเวลาสิ้นสุด" onDragStart={(event) => onDragStart(booking, "resize-end", event)} onDragEnd={onDragEnd} onPointerDown={(event) => onPointerDragStart?.(booking, "resize-end", event)} /> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
