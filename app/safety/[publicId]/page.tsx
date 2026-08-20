import type { Metadata } from "next";
import { PublicSafetyScreen } from "./PublicSafetyScreen";

export const metadata: Metadata = {
  title: "Public Safety Profile",
  description: "ข้อมูลความปลอดภัยสาธารณะที่ผู้ดูแลเลือกเปิดสำหรับผู้พบสัตว์เลี้ยง",
};

export default async function PublicSafetyPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <main id="main-content" className="page page--public-safety"><PublicSafetyScreen publicId={publicId} /></main>;
}
