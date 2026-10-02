import type { Metadata } from "next";
import "../auth.css";
import { BusinessAuthScreen } from "../_components/BusinessAuthScreen";
export const metadata: Metadata = { title: "สมัครสมาชิก", description: "สร้างบัญชีด้วยอีเมลและรหัสผ่าน หรือ Google / LINE แล้วตั้งค่าร้านภายหลัง" };
export default function BusinessRegisterPage() {
  return <main id="main-content" className="business-portal business-auth-page"><BusinessAuthScreen mode="register" /></main>;
}
