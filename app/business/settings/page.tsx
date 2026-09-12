import type { Metadata } from "next";
import { SettingsScreen } from "./SettingsScreen";
import "./settings.css";

export const metadata: Metadata = {
  title: "ตั้งค่าธุรกิจและสาขา",
  description: "จัดการข้อมูลร้าน สาขา บริการที่เปิดใช้ และเวลาทำการ",
};

export default function BusinessSettingsPage() {
  return (
    <main id="main-content" className="page business-page business-settings-page">
      <SettingsScreen />
    </main>
  );
}
