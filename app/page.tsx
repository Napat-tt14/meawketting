import type { Metadata } from "next";
import "./homepage.css";
import { HomeParallax } from "./_components/business-landing/HomeParallax";
import { BusinessCoreSection, BusinessClosingSection, BusinessTrustSection, BusinessWorkflowSection } from "./_components/business-landing/HomeVisualSections";
import { BusinessLandingHero } from "./_components/business-landing/BusinessLandingHero";
import { BusinessServicesSection } from "./_components/business-landing/BusinessServicesSection";
import { ScrollToTopButton } from "./_components/ScrollToTopButton";
import { BusinessPricingSection } from "./_components/business-landing/BusinessPricingSection";
import { BusinessFaqSection } from "./_components/business-landing/BusinessFaqSection";
import { businessPlans } from "./_components/business-landing/plans";

const siteUrl = "https://meawketting.com";
const title = "ระบบจัดการโรงแรมสัตว์เลี้ยง อาบน้ำตัดขน เดย์แคร์ | Meawketting";
const description = "Meawketting ระบบจัดการโรงแรมสัตว์เลี้ยง ร้านอาบน้ำตัดขน และเดย์แคร์ รวมการจอง งานดูแล ทีม และ Pet Passport เริ่มฟรี แพ็กเกจ 490 และ 1,490 บาท/เดือน";
const socialImage = { url: "/images/landing/pet-hotel-room.png", width: 1200, height: 800, alt: "Meawketting ระบบจัดการโรงแรมสัตว์เลี้ยง อาบน้ำตัดขน และเดย์แคร์" };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { absolute: title },
  description,
  alternates: { canonical: `${siteUrl}/` },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "Meawketting",
    url: `${siteUrl}/`,
    title,
    description,
    images: [socialImage],
  },
  twitter: { card: "summary_large_image", title, description, images: [socialImage] },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "Meawketting", url: `${siteUrl}/`, logo: `${siteUrl}/logo.svg` },
    { "@type": "WebSite", "@id": `${siteUrl}/#website`, name: "Meawketting", url: `${siteUrl}/`, inLanguage: "th", publisher: { "@id": `${siteUrl}/#organization` } },
    {
      "@type": "SoftwareApplication", "@id": `${siteUrl}/#software`, name: "Meawketting", url: `${siteUrl}/`, description,
      applicationCategory: "BusinessApplication", operatingSystem: "Web", inLanguage: "th", publisher: { "@id": `${siteUrl}/#organization` },
      featureList: ["ระบบจัดการโรงแรมสัตว์เลี้ยง", "การจองและตารางงาน", "อาบน้ำตัดขน", "เดย์แคร์", "Pet Passport"],
      offers: businessPlans.flatMap((plan) => (plan.price === 0 ? [false] : [false, true]).map((annual) => ({
        "@type": "Offer", name: `${plan.name}${plan.price ? annual ? " รายปี" : " รายเดือน" : " Free"}`,
        price: annual ? plan.price * 10 : plan.price, priceCurrency: "THB", url: `${siteUrl}/#pricing`,
        ...(plan.price ? { priceSpecification: { "@type": "UnitPriceSpecification", price: annual ? plan.price * 10 : plan.price, priceCurrency: "THB", billingDuration: annual ? "P1Y" : "P1M" } } : {}),
      }))),
    },
  ],
};

export default function BusinessLandingPage() {
  return (
    <main id="main-content" className="business-portal business-homepage hotel-landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <HomeParallax />
      <BusinessLandingHero />
      <BusinessServicesSection />
      <BusinessCoreSection />
      <BusinessTrustSection />
      <BusinessWorkflowSection />
      <BusinessPricingSection />
      <BusinessFaqSection />
      <BusinessClosingSection />
      <ScrollToTopButton />
    </main>
  );
}
