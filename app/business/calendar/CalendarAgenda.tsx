import type { PrototypeBooking } from "../../_prototype/businessState";
import { CalendarDays } from "../../_components/icons";
import { BookingItem } from "./BookingItem";
import { bookingOccursOnDate, calendarDateLabel } from "./calendarPresentation";

export function CalendarAgenda({
  date,
  bookings,
  onSelect,
}: {
  date: string;
  bookings: readonly PrototypeBooking[];
  onSelect: (booking: PrototypeBooking) => void;
}) {
  const agendaBookings = bookings.filter((booking) => bookingOccursOnDate(booking, date));

  return (
    <section className="calendar-agenda" aria-labelledby="calendar-agenda-title">
      <header className="calendar-agenda__heading">
        <div>
          <p>ตามลำดับเวลา</p>
          <h2 id="calendar-agenda-title">{calendarDateLabel(date)}</h2>
        </div>
        <span>{agendaBookings.length} รายการ</span>
      </header>
      {agendaBookings.length > 0 ? (
        <ol className="calendar-agenda__list">
          {agendaBookings.map((booking) => <li key={booking.bookingId}><BookingItem booking={booking} onSelect={onSelect} /></li>)}
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
