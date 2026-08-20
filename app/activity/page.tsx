import type { Metadata } from "next";
import { ActivityScreen } from "./ActivityScreen";

export const metadata: Metadata = {
  title: "กิจกรรม | My Pets",
  description: "ประวัติการดูแล การเข้าถึงจากธุรกิจ และเหตุการณ์ของน้อง ๆ",
};

export default function ActivityPage() {
  return (
    <main id="main-content" className="page page--consumer">
      <ActivityScreen />
    </main>
  );
}
