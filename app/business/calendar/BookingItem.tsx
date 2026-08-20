import type { IconType } from "react-icons";
import type { BusinessServiceModule, PrototypeBooking } from "../../_prototype/businessState";
import {
  BedDouble,
  CheckCircle,
  CircleDashed,
  CircleOff,
  Clock,
  PawPrint,
  Scissors,
} from "../../_components/icons";
import {
  bookingModuleLabel,
  bookingPetLabel,
  bookingStatusLabel,
  bookingTimeLabel,
} from "./calendarPresentation";

const moduleIcons: Record<BusinessServiceModule, IconType> = {
  grooming: Scissors,
  hotel: BedDouble,
  daycare: PawPrint,
};

const statusIcons: Record<PrototypeBooking["status"], IconType> = {
  pending: CircleDashed,
  confirmed: CheckCircle,
  arrived: Clock,
  cancelled: CircleOff,
};

export function BookingItem({
  booking,
  onSelect,
  compact = false,
}: {
  booking: PrototypeBooking;
  onSelect: (booking: PrototypeBooking) => void;
  compact?: boolean;
}) {
  const ModuleIcon = moduleIcons[booking.serviceModule];
  const StatusIcon = statusIcons[booking.status];

  return (
    <button
      className={`booking-item booking-item--${booking.serviceModule} booking-item--${booking.status}${compact ? " booking-item--compact" : ""}`}
      type="button"
      onClick={() => onSelect(booking)}
      aria-label={`แก้ไขการจอง ${bookingPetLabel(booking)} ${booking.service.label}`}
    >
      <span className="booking-item__module"><ModuleIcon size={18} /></span>
      <span className="booking-item__copy">
        <strong>{bookingPetLabel(booking)}</strong>
        <span>{booking.service.label}</span>
        {!compact ? <small>{bookingModuleLabel(booking)}</small> : null}
      </span>
      <span className="booking-item__meta">
        <time>{bookingTimeLabel(booking)}</time>
        <span className="booking-status"><StatusIcon size={15} />{bookingStatusLabel(booking.status)}</span>
      </span>
    </button>
  );
}
