import type { Metadata } from "next";
import { BusinessSetupScreen } from "./BusinessSetupScreen";
import "./setup.css";

export const metadata: Metadata = { title: "ตั้งค่าร้านของคุณ", description: "ตั้งค่าข้อมูลร้านและบริการเบื้องต้นทีละขั้นตอน" };

export default function BusinessSetupPage() {
  return <main id="main-content" className="business-portal business-setup-page"><BusinessSetupScreen /></main>;
}
