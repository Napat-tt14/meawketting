import type { Metadata } from "next";
import { BusinessIntake } from "./BusinessIntake";

export const metadata: Metadata = {
  title: "รับน้องเข้าร้าน",
  description: "ตรวจข้อมูลที่ร้านได้รับ บันทึกการรับเข้า และยืนยันรับน้องเข้าร้านในต้นแบบ",
};

export default async function BusinessIntakePage({ params }: { params: Promise<{ intakeId: string }> }) {
  const { intakeId } = await params;
  return <main id="main-content" className="page business-page business-intake-page"><BusinessIntake intakeId={intakeId} /></main>;
}
