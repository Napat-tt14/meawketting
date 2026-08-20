import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "ตั้งค่า Public Safety QR",
  description: "ตั้งค่า ดูตัวอย่าง และจัดการ Public Safety Profile สำหรับสัตว์เลี้ยง",
};

export default async function SafetyPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  if (petId === "claimed-local") redirect(`/my-pets/${petId}`);
  const { SafetyOwnerScreen } = await import("./SafetyOwnerScreen");
  return <main id="main-content" className="page page--consumer"><SafetyOwnerScreen petId={petId} /></main>;
}
