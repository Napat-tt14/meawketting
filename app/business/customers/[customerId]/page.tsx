import type { Metadata } from "next";
import { CustomerDetailScreen } from "../CustomerDetailScreen";

export const metadata: Metadata = {
  title: "รายละเอียดลูกค้า",
  description: "ความสัมพันธ์ลูกค้า สัตว์เลี้ยง การจอง และหมายเหตุของร้านในต้นแบบ",
};

export default async function BusinessCustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return <main id="main-content" className="page business-page business-customer-detail-page"><CustomerDetailScreen customerId={customerId} /></main>;
}
