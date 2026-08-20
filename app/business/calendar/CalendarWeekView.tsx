import type { PrototypeBooking } from "../../_prototype/businessState";
import { BookingItem } from "./BookingItem";
import {
  bookingOccursOnDate,
  calendarDateLabel,
  calendarWeekdayLabel,
} from "./calendarPresentation";

export function CalendarWeekView({
  days,
  selectedDate,
  bookings,
  onSelect,
}: {
  days: readonly string[];
  selectedDate: string;
  bookings: readonly PrototypeBooking[];
  onSelect: (booking: PrototypeBooking) => void;
}) {
  return (
    <section className={`calendar-week-view${days.length === 1 ? " calendar-week-view--single" : ""}`} aria-label={`ตารางสัปดาห์ของ ${calendarDateLabel(selectedDate)}`}>
      <div className="calendar-week-view__grid">
        {days.map((day) => {
          const dayBookings = bookings.filter((booking) => bookingOccursOnDate(booking, day));
          const current = day === selectedDate;
          return (
            <section className={`calendar-week-day${current ? " is-selected" : ""}`} key={day} aria-label={calendarDateLabel(day)}>
              <header>
                <span>{calendarWeekdayLabel(day)}</span>
                <strong>{calendarDateLabel(day, { day: "numeric" })}</strong>
                <small>{dayBookings.length} งาน</small>
              </header>
              <ol>
                {dayBookings.length > 0
                  ? dayBookings.map((booking) => <li key={`${day}-${booking.bookingId}`}><BookingItem booking={booking} onSelect={onSelect} compact /></li>)
                  : <li className="calendar-week-day__empty">ยังไม่มีงาน</li>}
              </ol>
            </section>
          );
        })}
      </div>
    </section>
  );
}
