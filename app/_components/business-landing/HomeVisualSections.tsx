import Image from "next/image";
import { LuHeart } from "react-icons/lu";
import { ArrowRight, BadgeCheck, CalendarDays, CheckCircle, MessageCircle, PawPrint, ShieldCheck, Wallet, QrCode, Sparkle } from "../icons";

function Heart({ size }: { size: number }) {
  return <LuHeart size={size} strokeWidth={2.15} aria-hidden="true" focusable="false" />;
}

const capabilities = [
  { icon: CalendarDays, title: "จองห้อง & จัดตาราง", copy: "เห็นห้องว่างและงานของทีม" },
  { icon: BadgeCheck, title: "เช็กอิน & ดูแล", copy: "รับน้อง พร้อมข้อมูลที่จำเป็น" },
  { icon: MessageCircle, title: "คุยกับเจ้าของ", copy: "ส่งรูปและอัปเดตในบริบทของงาน" },
  { icon: Wallet, title: "รายรับ & รายงาน", copy: "ติดตามค่าบริการและการชำระ" },
];

export function BusinessCoreSection() {
  return (
    <section id="business-core" className="visual-core shell" aria-labelledby="business-core-title">
      <div className="visual-heading">
        <p className="business-eyebrow">LESS ADMIN, MORE CUDDLES</p>
        <h2 id="business-core-title">ระบบเดียว ดูแลได้ทั้งวัน</h2>
      </div>
      <div className="visual-core__layout">
        <figure className="care-phone-scene">
          <i className="care-cloud care-cloud--one parallax-layer" data-parallax="-28" aria-hidden="true" />
          <i className="care-cloud care-cloud--two parallax-layer" data-parallax="18" aria-hidden="true" />
          <div className="care-phone-art parallax-layer" data-parallax="24">
            <Image className="clay-float" src="/images/landing/pet-care-phone.png" alt="มือถือจำลองสไตล์ดินปั้น แสดงรูปแมวและรายการดูแล มีสุนัขนั่งอยู่ข้างจอ" width={1200} height={800} sizes="(max-width: 800px) 90vw, 50vw" unoptimized />
          </div>
          <span className="visual-float care-phone-scene__badge"><BadgeCheck size={20} /> ทุกงาน อยู่ใกล้มือ</span>
          <figcaption>ภาพประกอบแนวคิดการจัดการงานดูแล</figcaption>
        </figure>
        <div className="visual-capabilities">
          {capabilities.map(({ icon: Icon, title, copy }) => (
            <article key={title}><span><Icon size={24} /></span><div><h3>{title}</h3><p>{copy}</p></div></article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BusinessTrustSection() {
  return (
    <section id="trust" className="visual-trust shell" aria-labelledby="business-trust-title">
      <div className="visual-trust__copy">
        <p className="business-eyebrow">SMALL PAWS, BIG TRUST</p>
        <h2 id="business-trust-title">รู้จักน้องมากขึ้น<br />ดูแลได้ตรงใจขึ้น</h2>
        <p>Pet Passport เชื่อมข้อมูลการดูแล<br />เฉพาะส่วนที่เจ้าของอนุญาต</p>
        <ul><li><CheckCircle size={18} /> เจ้าของเลือกข้อมูลที่แชร์</li><li><CheckCircle size={18} /> ทีมส่งต่อประวัติบริการได้</li></ul>
        <a className="hotel-text-link" href="/create-passport">รู้จัก Pet Passport <ArrowRight size={17} /></a>
      </div>
      <div className="visual-art visual-art--passport parallax-layer" data-parallax="18">
        <Image className="clay-float" src="/images/landing/pet-passport-transparent.png" alt="แมวและสุนัขข้างสมุด Pet Passport สีเหลืองและสัญลักษณ์ปกป้องข้อมูล" width={1200} height={800} sizes="(max-width: 800px) 100vw, 50vw" unoptimized />
        <span className="visual-float visual-float--bottom"><ShieldCheck size={19} /> แชร์เท่าที่สบายใจ</span>
        <i className="visual-orb visual-orb--two" aria-hidden="true" />
      </div>
    </section>
  );
}

export function BusinessWorkflowSection() {
  return (
    <section id="workflow" className="visual-workflow shell" aria-labelledby="business-workflow-title">
      <div className="visual-heading"><p className="business-eyebrow">ONE HAPPY LITTLE JOURNEY</p><h2 id="business-workflow-title">ตั้งแต่จอง จนกลับบ้านอย่างแฮปปี้</h2></div>
      <div className="visual-journey">
        <article><span className="visual-step">01</span><div className="journey-object journey-object--calendar" aria-hidden="true"><CalendarDays size={64} /><span><QrCode size={25} /></span></div><h3>จอง & เช็กอิน</h3><p>เตรียมห้องพร้อมต้อนรับน้อง</p></article>
        <article><span className="visual-step">02</span><div className="journey-object journey-object--care" aria-hidden="true"><PawPrint size={64} /><span><Heart size={25} /></span></div><h3>พัก เล่น อาบน้ำ</h3><p>หลายบริการ ประวัติเดียวกัน</p></article>
        <article><span className="visual-step">03</span><div className="journey-object journey-object--home" aria-hidden="true"><ShieldCheck size={64} /><span><CheckCircle size={25} /></span></div><h3>รับกลับ & ส่งต่อประวัติ</h3><p>บันทึกไว้ให้การดูแลครั้งถัดไป</p></article>
      </div>
    </section>
  );
}

export function BusinessClosingSection() {
  return (
    <section className="visual-closing shell" aria-label="เริ่มต้นกับ Meawketting">
      <div className="visual-closing__business">
        <div><p className="business-eyebrow"><Sparkle size={16} /> MORE CARE STARTS HERE</p><h2>เรื่องร้านเบาลง เรื่องน่ารักเพิ่มขึ้น</h2></div>
        <a className="button button--business button--large" href="/business/login">เริ่มต้นสำหรับธุรกิจ <ArrowRight size={18} /></a>
      </div>
      <section id="guardian" className="guardian-feature" aria-labelledby="guardian-title">
        <div className="guardian-feature__art">
          <span className="guardian-feature__halo" aria-hidden="true" />
          <div className="parallax-layer" data-parallax="22"><Image className="clay-float" src="/images/landing/pet-owner-clay.png" alt="เจ้าของกอดแมวสีส้มขาว โดยมีสุนัขตัวน้อยนั่งอยู่ข้างกัน" width={1200} height={800} sizes="(max-width: 800px) 90vw, 45vw" unoptimized /></div>
          <span className="guardian-feature__heart" aria-hidden="true"><Heart size={26} /></span>
        </div>
        <div className="guardian-feature__copy">
          <p className="guardian-feature__tag"><PawPrint size={17} /> สำหรับเจ้าของสัตว์เลี้ยง</p>
          <h2 id="guardian-title">โลกทั้งใบของน้อง<br />อยู่ใกล้คุณเสมอ</h2>
          <p>เก็บประวัติ สร้าง Pet Passport<br />และแชร์ข้อมูลดูแลได้ในแบบที่คุณเลือก</p>
          <div className="guardian-feature__actions"><a className="button guardian-feature__primary" href="/create-passport">สร้าง Passport ให้น้อง <ArrowRight size={18} /></a><a className="guardian-feature__secondary" href="/my-pets">ดูสัตว์เลี้ยงของฉัน <ArrowRight size={17} /></a></div>
        </div>
      </section>
    </section>
  );
}
