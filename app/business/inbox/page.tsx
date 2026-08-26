import type { Metadata } from "next";
import { BusinessInbox, type InboxLaunchRequest } from "./BusinessInbox";

export const metadata: Metadata = {
  title: "ข้อความธุรกิจ",
  description: "กล่องข้อความต้นแบบที่เชื่อมลูกค้า สัตว์เลี้ยง และบริบทการจองของร้าน",
};

type BusinessInboxPageProps = {
  searchParams: Promise<{
    conversation?: string | string[];
    customerId?: string | string[];
    petId?: string | string[];
    bookingId?: string | string[];
  }>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function BusinessInboxPage({ searchParams }: BusinessInboxPageProps) {
  const params = await searchParams;
  const conversationId = firstQueryValue(params.conversation);
  const customerId = firstQueryValue(params.customerId);
  const petId = firstQueryValue(params.petId);
  const bookingId = firstQueryValue(params.bookingId);
  const launchRequest: InboxLaunchRequest | null = conversationId || customerId
    ? {
      key: `${conversationId ?? "customer"}:${customerId ?? ""}:${petId ?? ""}:${bookingId ?? ""}`,
      conversationId,
      customerId,
      petId,
      bookingId,
    }
    : null;

  return <main id="main-content" className="page business-page business-inbox-page"><BusinessInbox launchRequest={launchRequest} /></main>;
}
