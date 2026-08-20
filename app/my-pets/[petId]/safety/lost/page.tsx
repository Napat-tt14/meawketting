import type { Metadata } from "next";
import { LostOwnerScreen } from "./LostOwnerScreen";

export const metadata: Metadata = {
  title: "Lost Mode และเบาะแส",
  description: "เริ่ม Lost Mode ตรวจหน้า Lost ดูเบาะแส และยืนยันเมื่อพบสัตว์เลี้ยงแล้ว",
};

export default async function LostOwnerPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  return <main id="main-content" className="page page--consumer"><LostOwnerScreen petId={petId} /></main>;
}
