import type { Metadata } from "next";
import { BusinessHome } from "./BusinessHome";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "หน้าหลักธุรกิจ",
  description: "ดูงานที่ต้องจัดการตามร้าน สาขา และบริการที่เปิดใช้",
};

export default function BusinessHomePage() {
  return <main id="main-content" className="page business-page business-home-page"><BusinessHome /></main>;
}
