import Image from "next/image";
import { BedDouble, Flower, Scissors, Sparkle } from "../icons";

const primaryServices = [
  {
    icon: Scissors,
    title: "อาบน้ำ / ตัดขน",
    copy: "จัดคิวช่าง เวลา และพื้นที่ให้บริการ",
  },
  {
    icon: BedDouble,
    title: "โรงแรมสัตว์เลี้ยง",
    copy: "มองเห็นช่วงเข้าพักและความจุของห้อง",
  },
  {
    icon: Flower,
    title: "Daycare",
    copy: "วางแผนรอบดูแล กิจกรรม และความจุรายวัน",
  },
] as const;

export function BusinessServicesSection() {
  return (
    <section id="services" className="business-services-section" aria-labelledby="business-services-title">
      <div className="shell business-services-section__layout">
        <figure className="business-services-section__visual">
          <Image
            src="/images/business/pet-business-services-photo.png"
            alt="ภาพถ่ายแมวสามสีบนโต๊ะดูแลในพื้นที่บริการสัตว์เลี้ยง"
            width={1024}
            height={1024}
            sizes="(max-width: 1023px) 100vw, 36vw"
          />
          <div className="business-services-section__visual-badge" aria-label="ภาพรวมงานบริการวันนี้">
            <strong>วันนี้</strong>
            <span>8 งานกำลังเดินต่อ</span>
          </div>
        </figure>

        <div className="business-services-section__content business-section-intro">
          <p className="business-eyebrow">ธุรกิจเดียว หลายบริการ</p>
          <h2 id="business-services-title">ออกแบบให้เข้ากับรูปแบบร้านที่ต่างกัน</h2>
          <p>
            หนึ่งธุรกิจสามารถมีหลายบริการ และแต่ละสาขาเลือกเปิดบริการต่างกันได้
            โดยยังเห็นภาพรวมจากพื้นที่ทำงานเดียวกัน
          </p>

          <ul className="business-services-list">
            {primaryServices.map(({ icon: Icon, title, copy }) => (
              <li key={title}>
                <span><Icon size={24} /></span>
                <div><h3>{title}</h3><p>{copy}</p></div>
              </li>
            ))}
            <li className="business-services-list__supplemental">
              <span><Sparkle size={24} /></span>
              <div>
                <h3>บริการเสริม</h3>
                <p>Training · Transport · Retail</p>
                <small>ปรับรูปแบบบริการให้เข้ากับร้านและสาขา</small>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
