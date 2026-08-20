import type { Metadata } from "next";
import { ArrowLeft, IdentificationCard, Sparkle } from "../_components/icons";
import { PassportStudio } from "./PassportStudio";

export const metadata: Metadata = {
  title: "Passport Studio — 6 Styles",
  description: "ทดลองสลับ Pet Passport 6 แบบสำหรับแมวและสุนัข โดยใช้ข้อมูลชุดเดียวกัน",
};

type PassportsPageProps = {
  searchParams: Promise<{ style?: string | string[] }>;
};

export default async function PassportsPage({ searchParams }: PassportsPageProps) {
  const params = await searchParams;
  const rawStyle = Array.isArray(params.style) ? params.style[0] : params.style;
  const requestedStyle = Number(rawStyle);
  const initialStyle = Number.isInteger(requestedStyle) && requestedStyle >= 1 && requestedStyle <= 6
    ? requestedStyle - 1
    : 0;

  return (
    <main id="main-content" className="page page--inner page--passports">
      <section className="passport-intro shell page-reveal">
        <a className="back-link" href="/">
          <ArrowLeft size={17} weight="bold" /> กลับหน้าแรก
        </a>
        <div className="passport-intro__copy">
          <span className="section-label section-label--lav">
            <IdentificationCard size={15} weight="fill" />
            Passport playground
          </span>
          <div>
            <h1>วันนี้น้องจะมาในลุคไหนดี?</h1>
            <p><Sparkle size={17} weight="fill" /> แตะ Passport เพื่อพลิกดู QR แล้วค่อยเลื่อนเลือกอีก 5 สไตล์</p>
          </div>
        </div>
      </section>
      <PassportStudio initialStyle={initialStyle} />
    </main>
  );
}
