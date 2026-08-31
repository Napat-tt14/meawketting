import type { DragEvent, PointerEvent } from "react";
import type { PrototypeBooking } from "../../_prototype/businessState";
import { resolvePrototypeBookingRelationship } from "../../_prototype/businessState";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import { bookingStatusLabel, bookingTimeLabel } from "./calendarPresentation";

export function BookingStatusBadge({ status }: { status: PrototypeBooking["status"] }) {
  return <span className="sr-only">สถานะ {bookingStatusLabel(status)}</span>;
}

export function BookingItem({
  booking,
  onSelect,
  compact = false,
  draggable = false,
  selected = false,
  dragging = false,
  settled = false,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onOpen,
}: {
  booking: PrototypeBooking;
  onSelect: (booking: PrototypeBooking) => void;
  compact?: boolean;
  draggable?: boolean;
  selected?: boolean;
  dragging?: boolean;
  settled?: boolean;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  onOpen?: (booking: PrototypeBooking) => void;
}) {
  const relationship = resolvePrototypeBookingRelationship(booking);
  const petLabel = relationship.pets.length <= 1
    ? relationship.pets[0]?.name ?? "น้อง"
    : `${relationship.pets[0]?.name ?? "น้อง"} + อีก ${relationship.pets.length - 1} ตัว`;

  return (
    <button
      className={`booking-item booking-item--${booking.serviceModule} booking-item--${booking.status}${compact ? " booking-item--compact" : ""}${selected ? " is-selected" : ""}${dragging ? " is-dragging" : ""}${settled ? " is-settled" : ""}`}
      type="button"
      onClick={() => onSelect(booking)}
      onDoubleClick={() => onOpen?.(booking)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
      data-booking-id={booking.bookingId}
      aria-keyshortcuts="Control+C Meta+C"
      aria-describedby="calendar-shortcut-guide"
      aria-label={`เลือกการจอง ${petLabel} ${booking.service.label} สถานะ ${bookingStatusLabel(booking.status)} กด Enter เพื่อแก้ไข`}
      aria-pressed={selected}
      data-calendar-keyboard="booking"
    >
      <BusinessServiceIcon module={booking.serviceModule} size={18} className="booking-item__module" />
      <span className="booking-item__copy">
        <strong>{petLabel}</strong>
        <span>{booking.service.label}</span>
      </span>
      <span className="booking-item__meta">
        <time>{bookingTimeLabel(booking)}</time>
        <BookingStatusBadge status={booking.status} />
      </span>
    </button>
  );
}
