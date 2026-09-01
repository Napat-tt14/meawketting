import {
  HOTEL_STAY_STATUS_LABELS,
  type HotelStayStatus,
  type PrototypeHotelCareTask,
  type PrototypeHotelStay,
} from "../../_prototype/businessState";
import { calendarDateLabel } from "../calendar/calendarPresentation";

export type HotelListFilter = "all" | "arrivals" | "current" | "departures" | "attention";

export const HOTEL_LIST_FILTERS: readonly { key: HotelListFilter; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "arrivals", label: "เข้าวันนี้" },
  { key: "current", label: "กำลังพัก" },
  { key: "departures", label: "ออกวันนี้" },
  { key: "attention", label: "ต้องจัดการ" },
];

export function hotelStatusLabel(status: HotelStayStatus) {
  return HOTEL_STAY_STATUS_LABELS[status];
}

export function hotelStayDateLabel(stay: Pick<PrototypeHotelStay, "scheduledCheckIn" | "scheduledCheckOut">) {
  return `${calendarDateLabel(stay.scheduledCheckIn, { day: "numeric", month: "short" })} – ${calendarDateLabel(stay.scheduledCheckOut, { day: "numeric", month: "short", year: "numeric" })}`;
}

export function hotelCareTaskStateLabel(task: PrototypeHotelCareTask, referenceDate: string) {
  if (task.state === "completed") return "เสร็จแล้ว";
  if (task.scheduledDate > referenceDate || (task.scheduledDate === referenceDate && task.scheduledTime > "12:20")) return "ยังไม่ถึงเวลา";
  return "รอดำเนินการ";
}

export function hotelCareTaskIconLabel(task: PrototypeHotelCareTask) {
  const labels: Record<PrototypeHotelCareTask["kind"], string> = {
    meal: "อาหาร",
    water: "น้ำ",
    medication: "ยา / คำแนะนำ",
    activity: "กิจกรรม",
    cleaning: "ทำความสะอาด",
    check: "ตรวจทั่วไป",
    note: "บันทึก",
    other: "งานดูแล",
  };
  return labels[task.kind];
}

export function isHotelStayCurrent(stay: PrototypeHotelStay, date: string) {
  return ["checked-in", "in-stay", "ready-for-checkout"].includes(stay.status)
    && (stay.scheduledCheckIn <= date && date <= stay.scheduledCheckOut);
}

export function hasHotelStayAttention(stay: PrototypeHotelStay, date: string, hasRoom: boolean) {
  const pendingCare = stay.dailyCareTasks.some((task) => task.scheduledDate === date && task.state === "pending");
  const incident = stay.incidentNotes.some((item) => item.severity === "attention" && !item.resolvedAt);
  return (stay.scheduledCheckIn === date && !hasRoom)
    || stay.scheduledCheckOut === date
    || pendingCare
    || incident
    || stay.status === "ready-for-checkout";
}
