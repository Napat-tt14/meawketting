import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  CalendarDays,
  ChevronDown,
  Clock,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkle,
  Storefront,
} from "../icons";

const workQueue = [
  { time: "10:30", name: "Mochi", detail: "อาบน้ำ / ตัดขน", tone: "grooming" },
  { time: "11:00", name: "Luna", detail: "เข้าโรงแรม · 3 คืน", tone: "hotel" },
  { time: "11:30", name: "Milo", detail: "อาบน้ำ", tone: "bath" },
] as const;

function BusinessProductPreview() {
  return (
    <div className="business-product-preview" aria-label="ภาพรวมงานประจำวันของ Meawketting Business">
      <div className="business-product-preview__topbar">
        <span className="business-product-preview__window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="business-product-preview__window-title">
          <Storefront size={15} /> ภาพรวมงานประจำวัน · Whisker Rest
        </span>
        <span className="business-product-preview__date-pill">
          <span className="pulse-dot" aria-hidden="true" />
          <CalendarDays size={14} /> 20 ส.ค.
        </span>
      </div>

      <figure className="business-product-preview__photo">
        <Image
          src="/images/business/pet-business-hero-wide.png"
          alt="ภาพถ่ายแมวสามสีในสตูดิโอธุรกิจสัตว์เลี้ยงข้างโต๊ะทำงานและแล็ปท็อป"
          fill
          sizes="(max-width: 1023px) 100vw, 45vw"
          priority
        />
        <div className="business-product-preview__photo-overlay" aria-hidden="true" />
        <div className="business-product-preview__photo-meta">
          <span className="photo-meta-pill">
            <MapPin size={13} /> Whisker Rest · สาขาอารีย์
          </span>
          <strong>วันนี้</strong>
        </div>
        <figcaption className="business-product-preview__photo-note">
          <span>งานถัดไป</span>
          <strong>Mochi · อาบน้ำ / ตัดขน</strong>
        </figcaption>
      </figure>

      <div className="business-product-preview__body">
        <dl className="business-product-preview__stats">
          <div className="is-waiting">
            <dt>รอรับเข้า</dt>
            <dd>3</dd>
          </div>
          <div className="is-serving">
            <dt>กำลังให้บริการ</dt>
            <dd>5</dd>
          </div>
          <div className="is-ready">
            <dt>พร้อมรับกลับ</dt>
            <dd>2</dd>
          </div>
          <div className="is-occupancy">
            <dt>โรงแรม</dt>
            <dd>12 / 18</dd>
          </div>
        </dl>

        <div className="business-product-preview__queue">
          <div className="business-product-preview__queue-heading">
            <strong><Clock size={15} /> งานถัดไป</strong>
            <span>เรียงตามเวลา</span>
          </div>
          <ol>
            {workQueue.map((item) => (
              <li key={item.time}>
                <time>{item.time}</time>
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.detail}</small>
                </span>
                <i className={`is-${item.tone}`} aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function BusinessLandingHero() {
  return (
    <section className="business-homepage-hero shell" aria-labelledby="business-homepage-title">
      <div className="business-homepage-hero__copy">
        <div className="business-hero-tag">
          <Storefront size={16} />
          <span>Meawketting Business</span>
          <i className="business-hero-tag__divider" />
          <small>ระบบปฏิบัติการร้านสัตว์เลี้ยง</small>
        </div>

        <h1 id="business-homepage-title">
          ทุกงานของร้านสัตว์เลี้ยง
          <br />
          <span className="business-hero-title-accent">จัดการง่ายในที่เดียว</span>
        </h1>

        <p className="business-homepage-hero__lead">
          เชื่อมการจอง ตารางงาน ลูกค้าและสัตว์เลี้ยง งานบริการ ทีม สาขา การรับเข้า
          การสื่อสาร และภาพรวมรายรับ ให้ทำงานต่อกันอย่างเป็นระบบ
        </p>

        <div className="business-hero-pills">
          <span className="business-hero-pill">
            <Sparkle size={14} /> ตารางงานรวม
          </span>
          <span className="business-hero-pill">
            <QrCode size={14} /> สแกนรับเข้าไว
          </span>
          <span className="business-hero-pill">
            <BadgeCheck size={14} /> CareProof บันทึกงาน
          </span>
        </div>

        <div className="business-homepage-hero__actions">
          <Link className="button button--business button--large" href="/business/login">
            เข้าสู่ระบบสำหรับธุรกิจ <ArrowRight size={18} />
          </Link>
          <Link className="button button--business-ghost button--large" href="#business-core">
            ดูว่าระบบช่วยอะไรได้บ้าง <ChevronDown size={18} />
          </Link>
        </div>

        <div className="business-homepage-hero__note">
          <ShieldCheck size={20} />
          <p>
            เชื่อมทีมหน้าร้านให้เห็นงานสำคัญและส่งต่องานได้ลื่นไหล
            ตั้งแต่รับจองจนถึงส่งมอบบริการ
          </p>
        </div>

        <Link className="business-homepage-hero__guardian-link" href="#guardian">
          สำหรับเจ้าของสัตว์เลี้ยง <ArrowRight size={16} />
        </Link>
      </div>

      <div className="business-homepage-hero__showcase">
        <div className="business-hero-glow business-hero-glow--1" aria-hidden="true" />
        <div className="business-hero-glow business-hero-glow--2" aria-hidden="true" />

        {/* Floating Glassmorphic Satellites */}
        <aside className="hero-floating-glass hero-floating-glass--checkin" aria-label="สถานะรับเข้าล่าสุด">
          <div className="hero-floating-glass__icon">
            <BadgeCheck size={18} />
          </div>
          <div className="hero-floating-glass__text">
            <strong>รับเข้าหน้าร้านสำเร็จ</strong>
            <small>Mochi · สแกน Passport แล้ว</small>
          </div>
          <span className="hero-floating-glass__tag">Live</span>
        </aside>

        <aside className="hero-floating-glass hero-floating-glass--careproof" aria-label="CareProof อัปเดต">
          <div className="hero-floating-glass__icon hero-floating-glass__icon--amber">
            <Sparkle size={18} />
          </div>
          <div className="hero-floating-glass__text">
            <strong>CareProof & Daily Log</strong>
            <small>ส่งรายงานให้เจ้าของเรียบร้อย</small>
          </div>
        </aside>

        <aside className="hero-floating-glass hero-floating-glass--capacity" aria-label="อัตราการครองเตียง">
          <div className="hero-floating-glass__capacity-head">
            <span><BedDouble size={14} /> โรงแรมสัตว์เลี้ยง</span>
            <strong>12 / 18 ห้อง</strong>
          </div>
          <div className="hero-floating-glass__bar">
            <div className="hero-floating-glass__bar-fill" />
          </div>
        </aside>

        <BusinessProductPreview />
      </div>
    </section>
  );
}


