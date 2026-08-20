import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Temporary Business Sharing",
  description: "สร้างและจัดการ Temporary Business Access ด้วยขอบเขต ระยะเวลา และ consent ที่ชัดเจน",
};

export default async function SharingPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  if (petId === "claimed-local") redirect(`/my-pets/${petId}`);
  const { SharingOwnerScreen } = await import("./SharingOwnerScreen");
  return <main id="main-content" className="page page--consumer"><SharingOwnerScreen petId={petId} /></main>;
}
