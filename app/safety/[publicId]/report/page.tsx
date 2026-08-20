import type { Metadata } from "next";
import { AbuseReportScreen } from "./AbuseReportScreen";

export const metadata: Metadata = {
  title: "รายงานปัญหา Public Safety",
  description: "รายงานข้อมูลไม่ถูกต้อง เนื้อหาไม่ปลอดภัย สแปม หรือปัญหา QR ใน prototype",
};

export default async function AbuseReportPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <main id="main-content" className="page page--public-safety"><AbuseReportScreen publicId={publicId} /></main>;
}
