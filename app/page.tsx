import type { Metadata } from "next";
import "./homepage.css";
import { HomeParallax } from "./_components/business-landing/HomeParallax";
import { BusinessCoreSection, BusinessClosingSection, BusinessTrustSection, BusinessWorkflowSection } from "./_components/business-landing/HomeVisualSections";
import { BusinessLandingHero } from "./_components/business-landing/BusinessLandingHero";
import { BusinessServicesSection } from "./_components/business-landing/BusinessServicesSection";

export const metadata: Metadata = {
  title: { absolute: "ระบบจัดการโรงแรมสัตว์เลี้ยง อาบน้ำตัดขน | Meawketting" },
  description:
    "Meawketting รวมการจองห้องพัก เช็กอิน ตารางดูแล อาบน้ำตัดขน และเดย์แคร์ พร้อม Pet Passport ให้ทีมดูแลสัตว์เลี้ยงได้ต่อเนื่องในระบบเดียว",
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "Meawketting",
    title: "Meawketting — ระบบจัดการโรงแรมสัตว์เลี้ยง",
    description: "จองห้อง เช็กอิน และส่งต่องานดูแลในที่เดียว ให้ทุกการเข้าพักมีแต่เรื่องน่ารัก",
  },
};

export default function BusinessLandingPage() {
  return (
    <main id="main-content" className="business-portal business-homepage hotel-landing">
      <HomeParallax />
      <BusinessLandingHero />
      <BusinessServicesSection />
      <BusinessCoreSection />
      <BusinessTrustSection />
      <BusinessWorkflowSection />
      <BusinessClosingSection />
    </main>
  );
}
