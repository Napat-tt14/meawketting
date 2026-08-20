import type { Metadata } from "next";
import { BusinessHome } from "./BusinessHome";

export const metadata: Metadata = {
  title: "หน้าหลักธุรกิจ",
  description: "หน้าหลักต้นแบบสำหรับดูงานที่ต้องจัดการตามร้าน สาขา และบริการที่เปิดใช้",
};

export default function BusinessHomePage() {
  return <main id="main-content" className="page business-page business-home-page"><BusinessHome /></main>;
}
