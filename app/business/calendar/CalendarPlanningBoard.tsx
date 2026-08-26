import type { CSSProperties, DragEvent, PointerEvent } from "react";
import type { PrototypeBooking } from "../../_prototype/businessState";
import { BookingItem } from "./BookingItem";
import { CalendarStaySpan } from "./CalendarStaySpan";
import type { BookingDropTarget, CalendarDragOperation } from "./bookingMutation";
import { bookingDropTargetKey } from "./bookingMutation";
import {
  addCalendarDays,
  bookingOccursOnDate,
  calendarDateLabel,
  calendarDayDistance,
  calendarWeekdayLabel,
} from "./calendarPresentation";

type DragState = { bookingId: string; operation: CalendarDragOperation; copy: boolean } | null;
type DropPreview = { key: string; available: boolean } | null;

function weeksFromDays(days: readonly string[]) {
  const weeks: string[][] = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  return weeks;
}

function stayLanes(bookings: readonly PrototypeBooking[]) {
  const laneEnds: string[] = [];
  return [...bookings]
    .sort((first, second) => first.start.localeCompare(second.start) || (second.end ?? "").localeCompare(first.end ?? ""))
    .map((booking) => {
      let lane = laneEnds.findIndex((end) => end <= booking.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = booking.end ?? booking.start;
      return { booking, lane };
    });
}

export function CalendarPlanningBoard({
  days,
  selectedDate,
  variant,
  bookings,
  dragState,
  dropPreview,
  onSelect,
  onDragStart,
  onPreviewDrop,
  onCommitDrop,
  onDragEnd,
  onPointerDragStart,
  settledBookingId = null,
}: {
  days: readonly string[];
  selectedDate: string;
  variant: "week" | "month" | "custom";
  bookings: readonly PrototypeBooking[];
  dragState: DragState;
  dropPreview: DropPreview;
  onSelect: (booking: PrototypeBooking) => void;
  onDragStart: (booking: PrototypeBooking, operation: CalendarDragOperation, event: DragEvent<HTMLElement>) => void;
  onPreviewDrop: (target: BookingDropTarget) => void;
  onCommitDrop: (target: BookingDropTarget) => void;
  onDragEnd: () => void;
  onPointerDragStart?: (booking: PrototypeBooking, operation: CalendarDragOperation, event: PointerEvent<HTMLElement>) => void;
  settledBookingId?: string | null;
}) {
  const weeks = weeksFromDays(days);
  const anchorMonth = selectedDate.slice(0, 7);

  function dropClass(target: BookingDropTarget) {
    if (!dragState || dropPreview?.key !== bookingDropTargetKey(target)) return "";
    return dropPreview.available ? " is-drop-valid" : " is-drop-invalid";
  }

  return (
    <section className={`calendar-planning-board calendar-planning-board--${variant}${dragState ? " is-dragging" : ""}`} aria-label={`ตารางวางแผน ${calendarDateLabel(selectedDate)}`}>
      {weeks.map((weekDays) => {
        const weekStart = weekDays[0];
        const weekEnd = addCalendarDays(weekStart, 7);
        const stays = stayLanes(bookings.filter((booking) => (
          booking.timeModel === "date-range"
          && booking.start < weekEnd
          && Boolean(booking.end && booking.end > weekStart)
        )));
        const laneCount = Math.max(0, ...stays.map(({ lane }) => lane + 1));
        const bodyStyle = {
          gridTemplateRows: `${laneCount > 0 ? `repeat(${laneCount}, 38px) ` : ""}minmax(${variant === "week" ? "150px" : "96px"}, auto)`,
        } satisfies CSSProperties;

        return (
          <section className="calendar-planning-week" key={weekStart} aria-label={`สัปดาห์ ${calendarDateLabel(weekStart)}`}>
            <div className="calendar-planning-week__headers">
              {weekDays.map((day) => (
                <header className={`${day === selectedDate ? "is-selected" : ""}${variant === "month" && !day.startsWith(anchorMonth) ? " is-outside-month" : ""}`} key={day}>
                  <span>{calendarWeekdayLabel(day)}</span>
                  <strong>{calendarDateLabel(day, { day: "numeric" })}</strong>
                </header>
              ))}
            </div>
            <div className="calendar-planning-week__body" style={bodyStyle}>
              {weekDays.map((day, index) => {
                const target = { date: day } satisfies BookingDropTarget;
                const style = { gridColumn: index + 1, gridRow: `1 / -1` } satisfies CSSProperties;
                return (
                  <div
                    className={`calendar-planning-drop-zone${dropClass(target)}`}
                    key={`drop-${day}`}
                    style={style}
                    aria-hidden="true"
                    data-calendar-drop-date={day}
                    onDragOver={(event) => {
                      if (!dragState) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = dragState.copy ? "copy" : "move";
                      onPreviewDrop(target);
                    }}
                    onDrop={(event) => { event.preventDefault(); onCommitDrop(target); }}
                  />
                );
              })}

              {stays.map(({ booking, lane }) => {
                const visibleStart = booking.start < weekStart ? weekStart : booking.start;
                const visibleEnd = booking.end && booking.end < weekEnd ? booking.end : weekEnd;
                const columnStart = calendarDayDistance(weekStart, visibleStart) + 1;
                const columnEnd = columnStart + calendarDayDistance(visibleStart, visibleEnd);
                return (
                  <CalendarStaySpan
                    key={booking.bookingId}
                    booking={booking}
                    columnStart={columnStart}
                    columnEnd={columnEnd}
                    row={lane + 1}
                    startEdge={booking.start >= weekStart}
                    endEdge={Boolean(booking.end && booking.end <= weekEnd)}
                    onSelect={onSelect}
                    onMoveStart={(event) => onDragStart(booking, "move", event)}
                    onResizeStart={(event) => { event.stopPropagation(); onDragStart(booking, "resize-start", event); }}
                    onResizeEnd={(event) => { event.stopPropagation(); onDragStart(booking, "resize-end", event); }}
                    onDragEnd={onDragEnd}
                    onPointerDown={(operation, event) => onPointerDragStart?.(booking, operation, event)}
                    dragging={dragState?.bookingId === booking.bookingId}
                    settled={settledBookingId === booking.bookingId}
                  />
                );
              })}

              {weekDays.map((day, index) => {
                const dayBookings = bookings.filter((booking) => booking.timeModel !== "date-range" && bookingOccursOnDate(booking, day));
                const style = { gridColumn: index + 1, gridRow: laneCount + 1 } satisfies CSSProperties;
                return (
                  <div className="calendar-planning-day-stack" style={style} key={`events-${day}`}>
                    {dayBookings.map((booking) => (
                      <BookingItem
                        key={booking.bookingId}
                        booking={booking}
                        onSelect={onSelect}
                        compact
                        draggable={booking.status !== "cancelled"}
                        dragging={dragState?.bookingId === booking.bookingId}
                        settled={settledBookingId === booking.bookingId}
                        onDragStart={(event) => onDragStart(booking, "move", event)}
                        onDragEnd={onDragEnd}
                        onPointerDown={(event) => onPointerDragStart?.(booking, "move", event)}
                      />
                    ))}
                    {variant === "week" && dayBookings.length === 0 && !stays.some(({ booking }) => booking.start <= day && Boolean(booking.end && day < booking.end)) ? <span className="calendar-planning-day-stack__empty">ว่าง</span> : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </section>
  );
}
