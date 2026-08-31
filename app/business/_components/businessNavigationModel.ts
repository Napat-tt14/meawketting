import type { BusinessServiceModule } from "../../_prototype/businessState";

export type BusinessDestinationKey =
  | "calendar"
  | "customers"
  | "messages"
  | "grooming"
  | "hotel"
  | "finance"
  | "reports"
  | "team"
  | "settings";

export type BusinessLiveDestinationKey = "calendar" | "customers" | "messages" | "grooming";
export type BusinessPlannedDestinationKey = Exclude<BusinessDestinationKey, BusinessLiveDestinationKey>;

export type BusinessLiveDestination = {
  key: BusinessLiveDestinationKey;
  label: string;
  href: "/business/calendar" | "/business/customers" | "/business/inbox" | "/business/grooming";
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

export const BUSINESS_CUSTOMERS_DESTINATION = {
  key: "customers",
  label: "ลูกค้าและสัตว์เลี้ยง",
  href: "/business/customers",
} as const satisfies BusinessLiveDestination;

export const BUSINESS_MESSAGES_DESTINATION = {
  key: "messages",
  label: "ข้อความ",
  href: "/business/inbox",
} as const satisfies BusinessLiveDestination;

export const BUSINESS_GROOMING_DESTINATION = {
  key: "grooming",
  label: "อาบน้ำ / ตัดขน",
  href: "/business/grooming",
} as const satisfies BusinessLiveDestination;

export const BUSINESS_TOP_DESTINATIONS = [
  BUSINESS_CALENDAR_DESTINATION,
  BUSINESS_CUSTOMERS_DESTINATION,
  BUSINESS_MESSAGES_DESTINATION,
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
