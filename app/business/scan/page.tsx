import type { Metadata } from "next";
import { BusinessScanner } from "./BusinessScanner";

export const metadata: Metadata = {
  title: "สแกนรับเข้า",
  description: "สแกน QR ชั่วคราวและตรวจสิทธิ์ก่อนรับน้องเข้าร้าน",
};

export default function BusinessScanPage() {
  return <main id="main-content" className="page business-page business-scan-page"><BusinessScanner /></main>;
}
