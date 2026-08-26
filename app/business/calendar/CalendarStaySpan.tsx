import type { CSSProperties, DragEvent, PointerEvent } from "react";
import type { PrototypeBooking } from "../../_prototype/businessState";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import { BookingStatusBadge } from "./BookingItem";
import { bookingPetLabel, bookingTimeLabel } from "./calendarPresentation";

export function CalendarStaySpan({
  booking,
  columnStart,
  columnEnd,
  row,
  startEdge,
  endEdge,
  onSelect,
  onMoveStart,
  onResizeStart,
  onResizeEnd,
  onDragEnd,
  onPointerDown,
  dragging = false,
  settled = false,
}: {
  booking: PrototypeBooking;
  columnStart: number;
  columnEnd: number;
  row: number;
  startEdge: boolean;
  endEdge: boolean;
  onSelect: (booking: PrototypeBooking) => void;
  onMoveStart: (event: DragEvent<HTMLElement>) => void;
  onResizeStart: (event: DragEvent<HTMLButtonElement>) => void;
  onResizeEnd: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onPointerDown?: (operation: "move" | "resize-start" | "resize-end", event: PointerEvent<HTMLElement>) => void;
  dragging?: boolean;
  settled?: boolean;
}) {
  const petLabel = bookingPetLabel(booking);
  const draggable = booking.status !== "cancelled";
  const compact = columnEnd - columnStart === 1;
  const style = { gridColumn: `${columnStart} / ${columnEnd}`, gridRow: row } satisfies CSSProperties;

  return (
    <article
      className={`calendar-stay-span${startEdge ? " is-start" : " is-continuation"}${endEdge ? " is-end" : ""}${draggable ? " is-draggable" : ""}${compact ? " is-compact" : ""}${dragging ? " is-dragging" : ""}${settled ? " is-settled" : ""}`}
      style={style}
      data-booking-id={booking.bookingId}
      aria-label={`${petLabel} ${booking.service.label} ${bookingTimeLabel(booking)}`}
    >
      {startEdge && draggable ? (
        <button
          className="calendar-stay-span__resize is-start"
          type="button"
          draggable
          aria-label={`ปรับวันเริ่มเข้าพักของ ${petLabel}`}
          title="ลากเพื่อยืดหรือย่อวันเริ่มเข้าพัก"
          onClick={(event) => event.stopPropagation()}
          onDragStart={onResizeStart}
          onDragEnd={onDragEnd}
          onPointerDown={(event) => { event.stopPropagation(); onPointerDown?.("resize-start", event); }}
        />
      ) : null}
      <button
        className="calendar-stay-span__content"
        type="button"
        draggable={draggable}
        data-booking-id={booking.bookingId}
        aria-keyshortcuts="Control+C Meta+C"
        aria-describedby="calendar-shortcut-guide"
        onDragStart={onMoveStart}
        onDragEnd={onDragEnd}
        onPointerDown={(event) => onPointerDown?.("move", event)}
        onClick={() => onSelect(booking)}
      >
        <BusinessServiceIcon module="hotel" size={17} />
        <span className="calendar-stay-span__copy"><strong>{petLabel}</strong><small>{booking.service.label} · {bookingTimeLabel(booking)}</small></span>
        <BookingStatusBadge status={booking.status} />
      </button>
      {endEdge && draggable ? (
        <button
          className="calendar-stay-span__resize"
          type="button"
          draggable
          aria-label={`ปรับวันสิ้นสุดการเข้าพักของ ${petLabel}`}
          title="ลากเพื่อยืดหรือย่อการเข้าพัก"
          onClick={(event) => event.stopPropagation()}
          onDragStart={onResizeEnd}
          onDragEnd={onDragEnd}
          onPointerDown={(event) => { event.stopPropagation(); onPointerDown?.("resize-end", event); }}
        />
      ) : null}
    </article>
  );
}
