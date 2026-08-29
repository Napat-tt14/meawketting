import type { Metadata } from "next";
import { GroomingOperations } from "./GroomingOperations";

export const metadata: Metadata = {
  title: "อาบน้ำ / ตัดขน",
  description: "จัดคิว ติดตามสถานะ และดูงานอาบน้ำหรือตัดขนของสาขา",
};

type GroomingPageProps = {
  searchParams: Promise<{ jobId?: string | string[] }>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function GroomingPage({ searchParams }: GroomingPageProps) {
  const params = await searchParams;
  return (
    <main id="main-content" className="page business-page business-grooming-page">
      <GroomingOperations launchJobId={firstQueryValue(params.jobId)} />
    </main>
  );
}
