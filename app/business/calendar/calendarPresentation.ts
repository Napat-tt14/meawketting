import {
  BOOKING_STATUS_LABELS,
  BUSINESS_SERVICE_MODULES,
  type BookingStatus,
  type PrototypeBooking,
} from "../../_prototype/businessState";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const THAI_WEEKDAYS_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

function localDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function localDateTime(value: string) {
  const [date, time = "00:00"] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

export function calendarDateLabel(value: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  const date = localDate(value);
  const weekday = options.weekday ? THAI_WEEKDAYS_SHORT[date.getDay()] : null;
  const day = options.day ? String(date.getDate()) : null;
  const month = options.month ? (options.month === "short" ? THAI_MONTHS_SHORT[date.getMonth()] : THAI_MONTHS[date.getMonth()]) : null;
  const year = options.year ? String(date.getFullYear() + 543) : null;
  return [weekday, day, month, year].filter(Boolean).join(" ");
}

export function calendarDayLabel(value: string) {
  return calendarDateLabel(value, { weekday: "short", day: "numeric", month: "short" });
}

export function calendarWeekdayLabel(value: string) {
  return calendarDateLabel(value, { weekday: "short" });
}

export function addCalendarDays(value: string, offset: number) {
  const date = localDate(value);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function daysForCalendarWeek(value: string) {
  const date = localDate(value);
  const mondayOffset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(value, mondayOffset + index));
}

export function bookingOccursOnDate(booking: PrototypeBooking, date: string) {
  if (booking.timeModel === "appointment" || booking.timeModel === "day") return booking.start.slice(0, 10) === date;
  return booking.start <= date && (booking.end ? date < booking.end : false);
}

export function bookingTimeLabel(booking: PrototypeBooking) {
  if (booking.timeModel === "appointment") {
    const start = booking.start.slice(11, 16);
    const end = booking.end?.slice(11, 16) ?? "";
    return end ? `${start}–${end}` : start;
  }
  if (booking.timeModel === "day") return "เต็มวัน";
  const start = calendarDateLabel(booking.start, { day: "numeric", month: "short" });
  const end = booking.end ? calendarDateLabel(booking.end, { day: "numeric", month: "short" }) : "";
  return end ? `${start} – ${end}` : start;
}

export function bookingDurationLabel(start: string, end: string | null) {
  if (!end) return "เต็มวัน";
  const duration = localDateTime(end).getTime() - localDateTime(start).getTime();
  const minutes = Math.max(0, Math.round(duration / 60_000));
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} ชม. ${remainder} นาที` : `${hours} ชม.`;
}

export function bookingStatusLabel(status: BookingStatus) {
  return BOOKING_STATUS_LABELS[status];
}

export function bookingModuleLabel(booking: PrototypeBooking) {
  return BUSINESS_SERVICE_MODULES[booking.serviceModule].label;
}

export function bookingPetLabel(booking: PrototypeBooking) {
  if (booking.pets.length <= 1) return booking.pets[0]?.name ?? "น้องตัวอย่าง";
  return `${booking.pets[0]?.name ?? "น้อง"} + อีก ${booking.pets.length - 1} ตัว`;
}

export function bookingEstimateLabel(estimate: number | null) {
  if (estimate === null) return "ยังไม่มีราคาประมาณ";
  return `฿${Math.round(estimate).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function dateRangeIncludes(date: string, start: string, endExclusive: string) {
  return date >= start && date < endExclusive;
}

export function calendarDayDistance(from: string, to: string) {
  return Math.round((localDate(to).getTime() - localDate(from).getTime()) / DAY_IN_MILLISECONDS);
}
