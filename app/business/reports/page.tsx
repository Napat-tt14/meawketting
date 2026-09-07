import type { Metadata } from "next";
import { ReportsScreen } from "./ReportsScreen";

export const metadata: Metadata = {
  title: "รายงานและข้อมูลเชิงลึก",
  description: "รายงานภาพรวมธุรกิจ ยอดขาย บริการ และข้อมูลดำเนินงานจากข้อมูลจริงในระบบ",
};

export default function ReportsPage() {
  return (
    <main id="main-content" className="page business-page business-reports-page">
      <ReportsScreen />
    </main>
  );
}
