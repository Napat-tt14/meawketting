import Image from "next/image";
import { ArrowRight, BadgeCheck, BedDouble, CalendarDays, CheckCircle, ChevronDown, PawPrint, ShieldCheck } from "../icons";

export function BusinessLandingHero() {
  return (
    <section className="hotel-hero shell" aria-labelledby="business-homepage-title">
      <div className="hotel-hero__copy">
        <p className="hotel-kicker"><PawPrint size={17} /> ระบบจัดการโรงแรมสัตว์เลี้ยง</p>
        <h1 id="business-homepage-title">ให้ทุกการเข้าพัก<br />มีแต่เรื่อง<span className="hotel-hero__accent">น่ารัก</span></h1>
        <p className="hotel-hero__lead">รวมการจอง ห้องพัก และงานดูแลไว้ในที่เดียว<br className="hotel-desktop-break" /> ให้ทีมมีเวลาใส่ใจแขกตัวน้อยได้เต็มที่</p>
        <div className="hotel-hero__actions">
          <a className="button button--business button--large" href="/business/login">เริ่มต้นใช้งานสำหรับธุรกิจ <ArrowRight size={19} /></a>
          <a className="hotel-text-link" href="#business-core">มาดูกันว่าช่วยอะไรได้บ้าง <ChevronDown size={17} /></a>
        </div>
        <div className="hotel-hero__assurances"><span><CheckCircle size={16} /> จองห้องเป็นระบบ</span><span><CheckCircle size={16} /> ทีมเห็นงานตรงกัน</span></div>
        <a className="hotel-guardian-link" href="#guardian">มองหา Pet Passport ให้น้อง? <ArrowRight size={15} /></a>
      </div>
      <div className="hotel-hero__scene parallax-layer" data-parallax="22">
        <div className="hotel-hero__orbit" aria-hidden="true" />
        <span className="hotel-scene-label"><PawPrint size={15} /> A happy place for little guests</span>
        <Image className="hotel-hero__illustration clay-float" src="/images/landing/pet-hotel-transparent.png" alt="โรงแรมสัตว์เลี้ยงจำลองโทนเหลืองอบอุ่น มีแมวต้อนรับและสุนัขพักผ่อนในห้องนอน" width={1200} height={800} sizes="(max-width: 800px) 100vw, 55vw" priority unoptimized />
        <div className="hotel-scene-card hotel-scene-card--checkin"><span className="hotel-scene-icon"><BadgeCheck size={23} /></span><div><strong>เช็กอินแล้ว พร้อมพักผ่อน</strong><span>โมจิ · ห้อง Sunny 02</span></div></div>
        <div className="hotel-scene-card hotel-scene-card--rooms"><div className="hotel-room-heading"><BedDouble size={18} /><strong>ห้องพักวันนี้</strong></div><p><b>12</b><span>/ 18 ห้อง</span><small>ว่าง 6 ห้อง</small></p><div className="hotel-room-meter" aria-hidden="true">{Array.from({length: 9}, (_, i) => <i key={i} className={i < 6 ? "is-occupied" : ""} />)}</div></div>
        <span className="hotel-scene-caption">ภาพประกอบและข้อมูลตัวอย่าง</span>
      </div>
      <div className="hotel-benefit-strip">
        <p>เรื่องหลังบ้านเบาลง<br /><strong>ความใส่ใจเพิ่มขึ้น</strong></p>
        <span><CalendarDays size={23} /><span>จากรับจอง<br /><strong>ถึงวันเช็กเอาต์</strong></span></span>
        <span><BedDouble size={23} /><span>รู้ห้องว่าง<br /><strong>วางแผนง่ายขึ้น</strong></span></span>
        <span><ShieldCheck size={23} /><span>ข้อมูลการดูแล<br /><strong>ส่งต่อถึงกัน</strong></span></span>
      </div>
    </section>
  );
}
