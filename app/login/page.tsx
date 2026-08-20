import type { Metadata } from "next";
import { LoginScreen } from "./LoginScreen";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
  description: "หน้าเข้าสู่ระบบตัวอย่างสำหรับบันทึกและดูแล Pet Passport",
};

export default function LoginPage() {
  return <main id="main-content" className="page page--inner page--login"><LoginScreen /></main>;
}
