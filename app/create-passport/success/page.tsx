import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "กำลังเปิด Passport | Meawketting",
  description: "กำลังพาไปยัง Passport ของน้อง",
};

export default function ClaimSuccessPage() {
  redirect("/my-pets/claimed-local");
}
