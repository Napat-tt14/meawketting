import type { Metadata } from "next";
import { MyPetsScreen } from "./MyPetsScreen";

export const metadata: Metadata = {
  title: "My Pets | Passport ของน้อง ๆ",
  description: "Consumer Portal prototype สำหรับดูสัตว์เลี้ยงที่อยู่ในการดูแล",
};

export default function MyPetsPage() {
  return <main id="main-content" className="page page--consumer"><MyPetsScreen /></main>;
}
