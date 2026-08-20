import type { Metadata } from "next";
import { PetDetailScreen } from "./PetDetailScreen";

export const metadata: Metadata = {
  title: "รายละเอียดสัตว์เลี้ยง",
  description: "Consumer Pet Detail prototype พร้อมสถานะ บทบาทผู้ดูแล และข้อมูลสรุป",
};

export default async function PetDetailPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  return <main id="main-content" className="page page--consumer"><PetDetailScreen petId={petId} /></main>;
}
