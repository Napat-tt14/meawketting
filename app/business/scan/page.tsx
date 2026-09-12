import type { Metadata } from "next";
import { BusinessScanner } from "./BusinessScanner";
import "./scan.css";

export const metadata: Metadata = {
  title: "สแกนรับเข้า",
  description: "สแกน QR ชั่วคราวและตรวจสิทธิ์ก่อนรับน้องเข้าร้าน",
};

type BusinessScanPageProps = {
  searchParams: Promise<{ hotelStayId?: string | string[]; daycareAttendanceId?: string | string[] }>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function BusinessScanPage({ searchParams }: BusinessScanPageProps) {
  const params = await searchParams;
  return <main id="main-content" className="page business-page business-scan-page"><BusinessScanner hotelStayId={firstQueryValue(params.hotelStayId)} daycareAttendanceId={firstQueryValue(params.daycareAttendanceId)} /></main>;
}
