import type { BusinessServiceModule } from "../../_prototype/businessState";

export type BusinessDestinationKey =
  | "calendar"
  | "customers"
  | "messages"
  | "finance"
  | "reports"
  | "team"
  | "settings";

export type BusinessPlannedDestinationKey = Exclude<BusinessDestinationKey, "calendar">;

export type BusinessLiveDestination = {
  key: "calendar";
  label: string;
  href: "/business/calendar";
};

export type BusinessPlannedDestination = {
  key: BusinessPlannedDestinationKey;
  label: string;
};

export type BusinessTopDestination = BusinessLiveDestination | BusinessPlannedDestination;

export const BUSINESS_CALENDAR_DESTINATION = {
  key: "calendar",
  label: "ปฏิทิน",
  href: "/business/calendar",
} as const satisfies BusinessLiveDestination;

export const BUSINESS_TOP_DESTINATIONS = [
  BUSINESS_CALENDAR_DESTINATION,
  { key: "customers", label: "ลูกค้าและสัตว์เลี้ยง" },
  { key: "messages", label: "ข้อความ" },
] as const satisfies readonly BusinessTopDestination[];

export const BUSINESS_MANAGEMENT_DESTINATIONS = [
  { key: "finance", label: "การเงิน" },
  { key: "reports", label: "รายงาน" },
  { key: "team", label: "ทีม" },
  { key: "settings", label: "ตั้งค่า" },
] as const satisfies readonly BusinessPlannedDestination[];

export const BUSINESS_MODULE_LABELS: Record<BusinessServiceModule, string> = {
  grooming: "อาบน้ำ / ตัดขน",
  hotel: "โรงแรม",
  daycare: "Daycare",
};
