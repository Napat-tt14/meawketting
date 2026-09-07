import type { BusinessServiceModule } from "../../_prototype/businessState";

export type BusinessDestinationKey =
  | "calendar"
  | "customers"
  | "messages"
  | "grooming"
  | "hotel"
  | "daycare"
  | "billing"
  | "reports"
  | "team"
  | "settings";

export type BusinessLiveDestinationKey = "calendar" | "customers" | "messages" | "grooming" | "hotel" | "daycare" | "billing" | "reports" | "team" | "settings";

export type BusinessLiveDestination = {
  key: BusinessLiveDestinationKey;
  label: string;
  href: "/business/calendar" | "/business/customers" | "/business/inbox" | "/business/grooming" | "/business/hotel" | "/business/daycare" | "/business/billing" | "/business/reports" | "/business/team" | "/business/settings";
};

export type BusinessTopDestination = BusinessLiveDestination;

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

export const BUSINESS_HOTEL_DESTINATION = {
  key: "hotel",
  label: "โรงแรม",
  href: "/business/hotel",
} as const satisfies BusinessLiveDestination;

export const BUSINESS_DAYCARE_DESTINATION = {
  key: "daycare",
  label: "Daycare",
  href: "/business/daycare",
} as const satisfies BusinessLiveDestination;

export const BUSINESS_BILLING_DESTINATION = {
  key: "billing",
  label: "การเงิน",
  href: "/business/billing",
} as const satisfies BusinessLiveDestination;

export const BUSINESS_REPORTS_DESTINATION = {
  key: "reports",
  label: "รายงาน",
  href: "/business/reports",
} as const satisfies BusinessLiveDestination;

export const BUSINESS_TEAM_DESTINATION = {
  key: "team",
  label: "ทีม",
  href: "/business/team",
} as const satisfies BusinessLiveDestination;

export const BUSINESS_SETTINGS_DESTINATION = {
  key: "settings",
  label: "ตั้งค่า",
  href: "/business/settings",
} as const satisfies BusinessLiveDestination;

export const BUSINESS_TOP_DESTINATIONS = [
  BUSINESS_CALENDAR_DESTINATION,
  BUSINESS_CUSTOMERS_DESTINATION,
  BUSINESS_MESSAGES_DESTINATION,
] as const satisfies readonly BusinessTopDestination[];

export const BUSINESS_MANAGEMENT_DESTINATIONS = [
  BUSINESS_SETTINGS_DESTINATION,
] as const satisfies readonly BusinessLiveDestination[];

export const BUSINESS_MODULE_LABELS: Record<BusinessServiceModule, string> = {
  grooming: "อาบน้ำ / ตัดขน",
  hotel: "โรงแรม",
  daycare: "Daycare",
};
