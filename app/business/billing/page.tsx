import type { Metadata } from "next";
import { BillingScreen, type BillingLaunchRequest } from "./BillingScreen";

export const metadata: Metadata = {
  title: "การเงิน",
  description: "ตรวจยอด รับชำระ และดูรายรับของสาขาใน local prototype",
};

type BillingPageProps = {
  searchParams: Promise<{
    chargeId?: string | string[];
    serviceJobId?: string | string[];
    hotelStayId?: string | string[];
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
  const launchRequest: BillingLaunchRequest | null = chargeId || serviceJobId || hotelStayId
    ? { key: `${chargeId ?? ""}:${serviceJobId ?? ""}:${hotelStayId ?? ""}`, chargeId, serviceJobId, hotelStayId }
    : null;
  return <main id="main-content" className="page business-page business-billing-page"><BillingScreen launchRequest={launchRequest} /></main>;
}
