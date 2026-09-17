import type { CSSProperties, DragEvent, PointerEvent } from "react";
import type { PrototypeBooking } from "../../_prototype/businessState";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import { BookingStatusBadge } from "./BookingItem";
import { bookingPetLabel, bookingStatusLabel, bookingTimeLabel } from "./calendarPresentation";

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
  onOpen,
  selected = false,
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
  onOpen?: (booking: PrototypeBooking) => void;
  selected?: boolean;
  dragging?: boolean;
  settled?: boolean;
}) {
  const petLabel = bookingPetLabel(booking);
  const draggable = booking.status !== "cancelled";
  const compact = columnEnd - columnStart === 1;
  const style = { gridColumn: `${columnStart} / ${columnEnd}`, gridRow: row } satisfies CSSProperties;

  return (
    <article
      className={`calendar-stay-span calendar-stay-span--${booking.status}${startEdge ? " is-start" : " is-continuation"}${endEdge ? " is-end" : ""}${draggable ? " is-draggable" : ""}${compact ? " is-compact" : ""}${selected ? " is-selected" : ""}${dragging ? " is-dragging" : ""}${settled ? " is-settled" : ""}`}
      style={style}
      data-booking-id={booking.bookingId}
      aria-label={`${petLabel} ${booking.service.label} ${bookingTimeLabel(booking)} สถานะ ${bookingStatusLabel(booking.status)}`}
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
        className={`calendar-stay-span__content${selected ? " is-selected" : ""}`}
        type="button"
        draggable={draggable}
        data-booking-id={booking.bookingId}
        data-calendar-keyboard="booking"
        aria-keyshortcuts="Control+C Meta+C"
        aria-describedby="calendar-shortcut-guide"
        onDragStart={onMoveStart}
        onDragEnd={onDragEnd}
        onPointerDown={(event) => onPointerDown?.("move", event)}
        onClick={() => onSelect(booking)}
        onDoubleClick={() => onOpen?.(booking)}
        aria-pressed={selected}
        aria-label={`${petLabel} ${booking.service.label} ${bookingTimeLabel(booking)} ${bookingStatusLabel(booking.status)}`}
        title={`${petLabel} · ${booking.service.label} · ${bookingTimeLabel(booking)} · ${bookingStatusLabel(booking.status)}`}
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
