import type { Metadata } from "next";
import { HotelOperations } from "./HotelOperations";

export const metadata: Metadata = {
  title: "โรงแรม",
  description: "จัดการการเข้าพัก ห้อง งานรับเข้า รับกลับ และงานดูแลประจำวัน",
};

type HotelPageProps = {
  searchParams: Promise<{ stayId?: string | string[]; filter?: string | string[] }>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function HotelPage({ searchParams }: HotelPageProps) {
  const params = await searchParams;
  return (
    <main id="main-content" className="page business-page business-hotel-page">
      <HotelOperations launchStayId={firstQueryValue(params.stayId)} launchFilter={firstQueryValue(params.filter)} />
    </main>
  );
}
