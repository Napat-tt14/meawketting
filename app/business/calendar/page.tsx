import type { Metadata } from "next";
import { BusinessCalendar } from "./BusinessCalendar";

export const metadata: Metadata = {
  title: "ปฏิทินธุรกิจ",
  description: "ดูงานของสาขา จัดการการจอง และตรวจเวลาพร้อมให้บริการ",
};

type BusinessCalendarPageProps = {
  searchParams: Promise<{
    new?: string | string[];
    customerId?: string | string[];
    petId?: string | string[];
    bookingId?: string | string[];
  }>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function BusinessCalendarPage({ searchParams }: BusinessCalendarPageProps) {
  const params = await searchParams;
  const customerId = firstQueryValue(params.customerId);
  const petId = firstQueryValue(params.petId);
  const bookingId = firstQueryValue(params.bookingId);
  const openNew = firstQueryValue(params.new) === "1";
  const launchRequest = bookingId || customerId || openNew
    ? { key: bookingId ? `booking:${bookingId}` : `${openNew ? "new" : "customer"}:${customerId ?? ""}:${petId ?? ""}`, customerId, petId, bookingId }
    : null;

  return <main id="main-content" className="page business-page business-calendar-page"><BusinessCalendar launchRequest={launchRequest} /></main>;
}
