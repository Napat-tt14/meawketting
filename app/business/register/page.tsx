import type { Metadata } from "next";
import "./register.css";
import "../auth.css";
import { BusinessRegisterScreen } from "./BusinessRegisterScreen";
export const metadata: Metadata = { title: "สมัครใช้งานสำหรับธุรกิจ", description: "สร้างร้านด้วย Google หรือ LINE" };
export default function BusinessRegisterPage() {
  return <main id="main-content" className="business-portal business-login-page business-register-page"><BusinessRegisterScreen /></main>;
}
