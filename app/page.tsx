import type { Metadata } from "next";
import { BusinessLandingBackdrop } from "./_components/business-landing/BusinessLandingBackdrop";
import { BusinessCoreSection } from "./_components/business-landing/BusinessCoreSection";
import { BusinessClosingSection } from "./_components/business-landing/BusinessClosingSection";
import { BusinessLandingHero } from "./_components/business-landing/BusinessLandingHero";
import { BusinessServicesSection } from "./_components/business-landing/BusinessServicesSection";
import { BusinessTrustSection } from "./_components/business-landing/BusinessTrustSection";
import { BusinessWorkflowSection } from "./_components/business-landing/BusinessWorkflowSection";
import { HybridBusinessSection } from "./_components/business-landing/HybridBusinessSection";

export const metadata: Metadata = {
  title: "Meawketting Business — ระบบจัดการธุรกิจสัตว์เลี้ยง",
  description:
    "แพลตฟอร์มสำหรับเชื่อมการจอง ตารางงาน ลูกค้า สัตว์เลี้ยง งานบริการ ทีม สาขา และการรับเข้า พร้อม Pet Passport และ Guardian Network เป็นชั้นความไว้วางใจ",
};

export default function BusinessLandingPage() {
  return (
    <main id="main-content" className="business-portal business-homepage">
      <BusinessLandingBackdrop />
      <BusinessLandingHero />
      <BusinessServicesSection />
      <BusinessCoreSection />
      <HybridBusinessSection />
      <BusinessTrustSection />
      <BusinessWorkflowSection />
      <BusinessClosingSection />
    </main>
  );
}

