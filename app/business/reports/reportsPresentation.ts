import type {
  BusinessServiceModule,
  PrototypeChargeStatus,
  ReportDateRangePreset,
} from "../../_prototype/businessState";

export const REPORT_PRESET_OPTIONS: readonly { value: ReportDateRangePreset; label: string }[] = [
  { value: "today", label: "วันนี้" },
  { value: "7d", label: "7 วัน" },
  { value: "30d", label: "30 วัน" },
  { value: "custom", label: "กำหนดเอง" },
] as const;

export const REPORT_BRANCH_OPTIONS = [
  { value: "current", label: "สาขาปัจจุบัน" },
  { value: "all", label: "ทุกสาขาในเครือ" },
] as const;

export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function formatBusinessMoney(amount: number) {
  return `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(amount)))} บาท`;
}

export function formatThaiDate(dateStr: string) {
  if (!dateStr || dateStr.length < 10) return dateStr;
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length !== 3) return dateStr;
  const year = Number.parseInt(parts[0], 10) + 543;
  const month = Number.parseInt(parts[1], 10);
  const day = Number.parseInt(parts[2], 10);
  const monthLabel = THAI_MONTHS_SHORT[month - 1] ?? parts[1];
  return `${day} ${monthLabel} ${year}`;
}

export function formatThaiDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) return formatThaiDate(startDate);
  return `${formatThaiDate(startDate)} – ${formatThaiDate(endDate)}`;
}

export function formatPercent(rate: number) {
  return `${Math.max(0, Math.min(100, Math.round(rate)))}%`;
}

export const MODULE_LABEL_MAP: Record<BusinessServiceModule, string> = {
  grooming: "อาบน้ำ / ตัดขน",
  hotel: "โรงแรม",
  daycare: "Daycare",
};

export const BILLING_STATUS_LABEL_MAP: Record<PrototypeChargeStatus | "no-charge", string> = {
  unpaid: "ยังไม่ชำระ",
  partial: "ชำระบางส่วน",
  paid: "ชำระแล้ว",
  cancelled: "ยกเลิกยอด",
  "no-charge": "ยังไม่เปิดยอด",
};
