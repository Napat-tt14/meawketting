import type { Metadata } from "next";
import { DaycareScreen } from "./DaycareScreen";

export const metadata: Metadata = {
  title: "Daycare",
  description: "ติดตามการรับเข้า โซน ผู้ดูแล กิจกรรม และการรับกลับของ Daycare",
};

type DaycarePageProps = {
  searchParams: Promise<{ attendanceId?: string | string[] }>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function DaycarePage({ searchParams }: DaycarePageProps) {
  const params = await searchParams;
  return (
    <main id="main-content" className="page business-page business-daycare-page">
      <DaycareScreen launchAttendanceId={firstQueryValue(params.attendanceId)} />
    </main>
  );
}
