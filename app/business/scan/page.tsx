import type { Metadata } from "next";
import { BusinessScanner } from "./BusinessScanner";

export const metadata: Metadata = {
  title: "สแกนรับเข้า",
  description: "สแกน QR ชั่วคราวสำหรับร้านและตรวจสิทธิ์ก่อนรับน้องเข้าร้านในต้นแบบ",
};

type BusinessScanPageProps = {
  searchParams: Promise<{ hotelStayId?: string | string[] }>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function BusinessScanPage({ searchParams }: BusinessScanPageProps) {
  const params = await searchParams;
  return <main id="main-content" className="page business-page business-scan-page"><BusinessScanner hotelStayId={firstQueryValue(params.hotelStayId)} /></main>;
}
