import type { Metadata } from "next";
import { PassportPreviewStep } from "./PassportPreviewStep";

export const metadata: Metadata = {
  title: "เลือก Passport ให้น้อง",
  description: "เลือกดีไซน์ Passport ของน้อง แล้วบันทึกภาพหรือไปต่อด้วย Google",
};

export default function PassportPreviewPage() {
  return (
    <main id="main-content" className="page page--inner page--create-passport page--passport-preview">
      <section className="create-passport create-passport--preview shell">
        <h1 className="sr-only">เลือก Passport ให้น้อง</h1>

        <PassportPreviewStep />
      </section>
    </main>
  );
}
