import { businessToday } from "../../_backend/shared/businessClock";
import type {
  BusinessLocalPetRelationship,
  BusinessPetDataSource,
  PetPassportConnectionState,
  PrototypeBooking,
  PrototypeCustomer,
} from "../../_prototype/businessState";
import { calendarDateLabel } from "../calendar/calendarPresentation";

export type CustomerListFilter = "all" | "has-booking" | "no-booking";

export const CUSTOMER_LIST_FILTERS: readonly { value: CustomerListFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "has-booking", label: "มีนัดหมาย" },
  { value: "no-booking", label: "ยังไม่มีนัด" },
];

export function petSpeciesLabel(species: BusinessLocalPetRelationship["species"]) {
  return species === "cat" ? "แมว" : "สุนัข";
}

export function customerTagLabel(tag: string) {
  const labels: Record<string, string> = {
    Grooming: "อาบน้ำ / ตัดขน",
    Hotel: "โรงแรม",
  };
  return labels[tag] ?? tag;
}

export function passportConnectionPresentation(connection: PetPassportConnectionState) {
  if (connection === "linked-active") {
    return {
      label: "ยืนยัน Pet Passport แล้ว",
      detail: "อนุญาตสำหรับการรับบริการนี้ถึง 18:00",
      tone: "active",
    } as const;
  }
  if (connection === "linked-no-access") {
    return {
      label: "เชื่อม Pet Passport แล้ว",
      detail: "ข้อมูลที่ร้านดูได้ตอนนี้: ไม่มีสิทธิ์เพิ่มเติม",
      tone: "limited",
    } as const;
  }
  if (connection === "access-expired") {
    return {
      label: "สิทธิ์หมดอายุ",
      detail: "ไม่มีสิทธิ์ดูข้อมูลเพิ่มเติม",
      tone: "expired",
    } as const;
  }
  return {
    label: "ยังไม่ได้เชื่อม Pet Passport",
    detail: "ยังใช้ข้อมูลความสัมพันธ์ของร้านได้ตามปกติ",
    tone: "unlinked",
  } as const;
}

export function petDataSourceLabel(source: BusinessPetDataSource) {
  return source === "business-local" ? "ข้อมูลของร้าน" : "ข้อมูลที่ลูกค้าแจ้ง";
}

export function bookingOccursAfterDemoStart(booking: PrototypeBooking) {
  return booking.status !== "cancelled" && booking.start.slice(0, 10) >= businessToday(booking);
}

export function customerBookings(customer: PrototypeCustomer, bookings: readonly PrototypeBooking[]) {
  return bookings.filter((booking) => booking.businessId === customer.businessId && booking.customer.id === customer.id);
}

export function petBookings(pet: BusinessLocalPetRelationship, bookings: readonly PrototypeBooking[]) {
  return bookings.filter((booking) => booking.pets.some((bookingPet) => bookingPet.id === pet.id));
}

export function nextCustomerBooking(customer: PrototypeCustomer, bookings: readonly PrototypeBooking[]) {
  return customerBookings(customer, bookings).find(bookingOccursAfterDemoStart) ?? null;
}

export function nextPetBooking(pet: BusinessLocalPetRelationship, bookings: readonly PrototypeBooking[]) {
  return petBookings(pet, bookings).find(bookingOccursAfterDemoStart) ?? null;
}

export function bookingSummary(booking: PrototypeBooking) {
  const date = calendarDateLabel(booking.start, { day: "numeric", month: "short" });
  return `${booking.service.label} · ${date}`;
}

export function bookingDateLabel(booking: PrototypeBooking) {
  return calendarDateLabel(booking.start, { day: "numeric", month: "short" });
}

export function matchesCustomerSearch(customer: PrototypeCustomer, query: string) {
  const normalized = query.trim().toLocaleLowerCase("th");
  if (!normalized) return true;
  const phoneDigits = query.replace(/[^0-9]/g, "");
  const text = [customer.name, customer.phone ?? "", ...customer.pets.map((pet) => pet.name)].join(" ").toLocaleLowerCase("th");
  return text.includes(normalized) || Boolean(phoneDigits && (customer.phone ?? "").replace(/[^0-9]/g, "").includes(phoneDigits));
}

export function customerMatchesFilter(
  customer: PrototypeCustomer,
  filter: CustomerListFilter,
  bookings: readonly PrototypeBooking[],
) {
  const hasBooking = customerBookings(customer, bookings).some(bookingOccursAfterDemoStart);
  if (filter === "has-booking") return hasBooking;
  if (filter === "no-booking") return !hasBooking;
  return true;
}
