import type { Metadata } from "next";
import { FinderLeadScreen } from "./FinderLeadScreen";

export const metadata: Metadata = {
  title: "ส่งเบาะแสสัตว์เลี้ยงหาย",
  description: "ส่งข้อความ รูป และบริเวณโดยประมาณให้ผู้ดูแลโดยไม่ต้องสร้างบัญชี",
};

export default async function FinderLeadPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <main id="main-content" className="page page--public-safety"><FinderLeadScreen publicId={publicId} /></main>;
}
