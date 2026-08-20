import type { Metadata } from "next";
import { BusinessLoginScreen } from "./BusinessLoginScreen";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบสำหรับธุรกิจ",
  description: "หน้าเข้าสู่ระบบตัวอย่างสำหรับร้านและทีมดูแลสัตว์",
};

export default function BusinessLoginPage() {
  return <main id="main-content" className="business-portal business-login-page"><BusinessLoginScreen /></main>;
}
