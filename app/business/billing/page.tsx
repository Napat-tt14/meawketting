import type { Metadata } from "next";
import { BillingScreen, type BillingLaunchRequest } from "./BillingScreen";

export const metadata: Metadata = {
  title: "การเงิน",
  description: "ตรวจยอด รับชำระ และดูรายรับของสาขา",
};

type BillingPageProps = {
  searchParams: Promise<{
    chargeId?: string | string[];
    serviceJobId?: string | string[];
    hotelStayId?: string | string[];
    daycareAttendanceId?: string | string[];
  }>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams;
  const chargeId = firstQueryValue(params.chargeId);
  const serviceJobId = firstQueryValue(params.serviceJobId);
  const hotelStayId = firstQueryValue(params.hotelStayId);
  const daycareAttendanceId = firstQueryValue(params.daycareAttendanceId);
  const launchRequest: BillingLaunchRequest | null = chargeId || serviceJobId || hotelStayId || daycareAttendanceId
    ? { key: `${chargeId ?? ""}:${serviceJobId ?? ""}:${hotelStayId ?? ""}:${daycareAttendanceId ?? ""}`, chargeId, serviceJobId, hotelStayId, daycareAttendanceId }
    : null;
  return <main id="main-content" className="page business-page business-billing-page"><BillingScreen launchRequest={launchRequest} /></main>;
}
