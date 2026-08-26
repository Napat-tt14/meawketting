import type { DragEvent, PointerEvent } from "react";
import type { IconType } from "react-icons";
import type { PrototypeBooking } from "../../_prototype/businessState";
import { resolvePrototypeBookingRelationship } from "../../_prototype/businessState";
import {
  CheckCircle,
  CircleDashed,
  CircleOff,
  Clock,
} from "../../_components/icons";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import { bookingStatusLabel, bookingTimeLabel } from "./calendarPresentation";

const statusIcons: Record<PrototypeBooking["status"], IconType> = {
  pending: CircleDashed,
  confirmed: CheckCircle,
  arrived: Clock,
  cancelled: CircleOff,
};

export function BookingStatusBadge({ status }: { status: PrototypeBooking["status"] }) {
  const StatusIcon = statusIcons[status];
  return <span className={`booking-status booking-status--${status}`}><StatusIcon size={15} />{bookingStatusLabel(status)}</span>;
}

export function BookingItem({
  booking,
  onSelect,
  compact = false,
  draggable = false,
  dragging = false,
  settled = false,
  onDragStart,
  onDragEnd,
  onPointerDown,
}: {
  booking: PrototypeBooking;
  onSelect: (booking: PrototypeBooking) => void;
  compact?: boolean;
  draggable?: boolean;
  dragging?: boolean;
  settled?: boolean;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  const relationship = resolvePrototypeBookingRelationship(booking);
  const petLabel = relationship.pets.length <= 1
    ? relationship.pets[0]?.name ?? "น้อง"
    : `${relationship.pets[0]?.name ?? "น้อง"} + อีก ${relationship.pets.length - 1} ตัว`;

  return (
    <button
      className={`booking-item booking-item--${booking.serviceModule} booking-item--${booking.status}${compact ? " booking-item--compact" : ""}${dragging ? " is-dragging" : ""}${settled ? " is-settled" : ""}`}
      type="button"
      onClick={() => onSelect(booking)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
      data-booking-id={booking.bookingId}
      aria-keyshortcuts="Control+C Meta+C"
      aria-describedby="calendar-shortcut-guide"
      aria-label={`แก้ไขการจอง ${petLabel} ${booking.service.label}`}
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
