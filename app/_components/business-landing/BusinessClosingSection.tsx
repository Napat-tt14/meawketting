import Image from "next/image";
import Link from "next/link";
import { ArrowRight, IdentificationCard, PawPrint, ShieldCheck, Storefront } from "../icons";

export function BusinessClosingSection() {
  return (
    <section className="business-closing-section shell" aria-label="ทางเข้าหลักของ Meawketting">
      <article className="business-closing-card business-closing-card--business">
        <Image
          className="business-closing-card__bg-photo"
          src="/images/business/pet-business-hero-photo.png"
          alt="ภาพถ่ายแมวสามสีข้างแล็ปท็อปในพื้นที่ทำงานของธุรกิจ"
          fill
          sizes="(max-width: 1200px) 100vw, 1200px"
          priority
        />
        <div className="business-closing-card__overlay" aria-hidden="true" />
        <div className="business-closing-card__content">
          <p className="business-eyebrow"><Storefront size={18} /> Meawketting Business</p>
          <h2>รวมงานสำคัญของร้านไว้ในที่เดียว</h2>
          <p>จัดการ Business Home, Calendar และการรับเข้า พร้อมมองเห็นงานของทีมในจังหวะเดียว</p>
          <div className="business-closing-card__actions">
            <Link className="button button--business button--large" href="/business/login">
              เข้าสู่ระบบสำหรับธุรกิจ <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </article>

      <article className="business-closing-card business-closing-card--guardian" id="guardian">
        <Image
          className="business-closing-card__bg-photo"
          src="/images/business/pet-business-services-photo.png"
          alt="ภาพถ่ายแมวสามสีในพื้นที่ดูแลสัตว์เลี้ยง"
          fill
          sizes="(max-width: 1200px) 100vw, 1200px"
        />
        <div className="business-closing-card__overlay" aria-hidden="true" />
        <div className="business-closing-card__content">
          <p className="business-eyebrow"><PawPrint size={18} /> สำหรับเจ้าของสัตว์เลี้ยง</p>
          <h2>เป็นเจ้าของสัตว์เลี้ยง?</h2>
          <p>ดู Pet Passport เปิดโหมด Safety / Lost และแชร์ข้อมูลกับร้านได้ตามที่คุณเลือก</p>
          <div className="business-closing-card__actions">
            <Link className="button button--paper button--large" href="/my-pets">
              <ShieldCheck size={18} /> ดูสัตว์เลี้ยงของฉัน <ArrowRight size={16} />
            </Link>
            <Link className="business-closing-card__create-link" href="/create-passport">
              <IdentificationCard size={18} /> ยังไม่มี Passport? เริ่มสร้าง
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}

