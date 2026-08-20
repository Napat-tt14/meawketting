import type { Metadata } from "next";
import { BusinessCalendar } from "./BusinessCalendar";

export const metadata: Metadata = {
  title: "ปฏิทินธุรกิจ",
  description: "ปฏิทินการจองต้นแบบสำหรับดูงานของสาขาและตรวจเวลาพร้อมให้บริการ",
};

export default function BusinessCalendarPage() {
  return <main id="main-content" className="page business-page business-calendar-page"><BusinessCalendar /></main>;
}
