import type { Metadata } from "next";
import { CustomersScreen } from "./CustomersScreen";

export const metadata: Metadata = {
  title: "ลูกค้าและสัตว์เลี้ยง",
  description: "ค้นหาความสัมพันธ์ลูกค้า สัตว์เลี้ยง และการจองของร้าน",
};

type BusinessCustomersPageProps = {
  searchParams: Promise<{ focus?: string | string[] }>;
};

export default async function BusinessCustomersPage({ searchParams }: BusinessCustomersPageProps) {
  const params = await searchParams;
  const focus = Array.isArray(params.focus) ? params.focus[0] : params.focus;
  return <main id="main-content" className="page business-page business-customers-page"><CustomersScreen focusSearch={focus === "search"} /></main>;
}
