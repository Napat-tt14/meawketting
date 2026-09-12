import type { listPrototypeBookings } from "../../_prototype/businessState";

const number = new Intl.NumberFormat("th-TH");
const date = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function DashboardOverview({ today, bookings, summary }: {
  today: string;
  bookings: ReturnType<typeof listPrototypeBookings>;
  summary: { bookingsToday: number; waitingIntake: number; readyForPickup: number; newMessages: number };
}) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${today}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() - 6 + index);
    const key = day.toISOString().slice(0, 10);
    return { key, value: bookings.filter((booking) => booking.timeModel === "date-range"
      ? booking.start <= key && Boolean(booking.end && key < booking.end)
      : booking.start.slice(0, 10) === key).length };
  });
  const max = Math.max(1, ...days.map((day) => day.value));
  const points = days.map((day, index) => `${4 + index * 42},${60 - day.value / max * 48}`).join(" ");
  const formatDate = (value: string) => date.format(new Date(`${value}T12:00:00Z`));
  const secondary = [
    { label: "รอรับเข้า", value: summary.waitingIntake, unit: "รายการ", href: "/business/calendar" },
    { label: "พร้อมรับกลับ", value: summary.readyForPickup, unit: "ตัว", href: "/business/calendar" },
    { label: "ข้อความที่ยังไม่อ่าน", value: summary.newMessages, unit: "ข้อความ", href: "/business/inbox" },
  ];
  return (
    <section className="dashboard-overview" aria-label="สรุปการทำงานวันนี้">
      <div className="dashboard-overview__date"><time dateTime={today}>{formatDate(today)}</time><span>ข้อมูลของสาขาที่เลือก</span></div>
      <div className="dashboard-overview__metrics">
        <div className="dashboard-primary">
          <div><h2>การจองวันนี้</h2><p className="dashboard-primary__value"><strong>{number.format(summary.bookingsToday)}</strong><span>รายการ</span></p><a href="/business/calendar">ดูตารางการจอง →</a></div>
          <figure className="dashboard-trend">
            <svg viewBox="0 0 260 68" role="img" aria-label={`จำนวนการจองตามวันให้บริการ: ${days.map((day) => `${formatDate(day.key)} ${number.format(day.value)} รายการ`).join(", ")}`}>
              <path d="M4 60H256" stroke="var(--border)" />
              <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {days.map((day, index) => <circle key={day.key} cx={4 + index * 42} cy={60 - day.value / max * 48} r="2.5" fill="currentColor" />)}
            </svg>
            <figcaption>การจองตามวันให้บริการ · 7 วัน<br />{formatDate(days[0].key)} – {formatDate(today)}</figcaption>
          </figure>
        </div>
        <dl className="dashboard-secondary">{secondary.map((item) => <div key={item.label}><dt>{item.label}</dt><dd><strong>{number.format(item.value)}</strong><span>{item.unit}</span></dd><a href={item.href}>ดูรายการ<span className="sr-only">{item.label}</span> →</a></div>)}</dl>
      </div>
    </section>
  );
}
