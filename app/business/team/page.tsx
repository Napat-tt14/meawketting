import type { Metadata } from "next";
import { TeamOperations } from "./TeamOperations";

export const metadata: Metadata = {
  title: "ทีม",
  description: "ดูทีม ความพร้อม งานวันนี้ และการมอบหมายงานของสาขา",
};

export default function TeamPage() {
  return (
    <main id="main-content" className="page business-page business-team-page">
      <TeamOperations />
    </main>
  );
}
