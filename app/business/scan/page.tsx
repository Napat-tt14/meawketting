import type { Metadata } from "next";
import { BusinessScanner } from "./BusinessScanner";

export const metadata: Metadata = {
  title: "สแกนรับเข้า",
  description: "สแกน QR ชั่วคราวสำหรับร้านและตรวจสิทธิ์ก่อนรับน้องเข้าร้านในต้นแบบ",
};

export default function BusinessScanPage() {
  return <main id="main-content" className="page business-page business-scan-page"><BusinessScanner /></main>;
}
