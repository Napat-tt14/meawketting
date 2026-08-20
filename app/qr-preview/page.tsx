import type { Metadata } from "next";
import { ArrowLeft, QrCode, Storefront } from "../_components/icons";
import { QrDemo } from "./QrDemo";

export const metadata: Metadata = {
  title: "QR Scan Preview",
  description: "Legacy visual demo ของ Temporary Business QR; ไม่ใช่ source of truth ของ Quick Passport QR หรือ Phase D contract",
};

export default function QrPreviewPage() {
  return (
    <main id="main-content" className="page page--inner page--qr">
      <section className="inner-intro shell page-reveal">
        <a className="back-link" href="/">
          <ArrowLeft size={17} weight="bold" /> กลับหน้าแรก
        </a>
        <span className="section-label section-label--mint">
          <QrCode size={15} weight="fill" />
          Legacy visual demo · ไม่ใช่ source of truth
        </span>
        <div className="inner-intro__row">
          <div>
            <h1>ตัวอย่างภาพ Temporary Business QR</h1>
            <p>หน้านี้เก็บไว้เพื่อ regression ของภาพเท่านั้น ไม่ใช่ Quick Passport QR หรือสัญญา Phase D หลัก</p>
          </div>
          <span className="business-chip"><Storefront size={18} weight="fill" /> Legacy demo</span>
        </div>
      </section>
      <QrDemo />
    </main>
  );
}
