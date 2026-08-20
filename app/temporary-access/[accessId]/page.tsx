import type { Metadata } from "next";
import { TemporaryAccessGateway } from "./TemporaryAccessGateway";

export const metadata: Metadata = {
  title: "Temporary Access Gateway",
  description: "Prototype gateway สำหรับตรวจ Temporary Business QR ก่อนเปิดข้อมูลที่ได้รับ consent",
};

export default async function TemporaryAccessPage({ params }: { params: Promise<{ accessId: string }> }) {
  const { accessId } = await params;
  return <main id="main-content" className="page temporary-gateway-page"><TemporaryAccessGateway accessId={accessId} /></main>;
}
