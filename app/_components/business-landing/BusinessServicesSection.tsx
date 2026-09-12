import Image from "next/image";
import { ArrowRight } from "../icons";
const services = [
  { name: "โรงแรมสัตว์เลี้ยง", label: "STAY & CARE", copy: "จองห้อง เช็กอิน ดูแลตลอดการเข้าพัก", tone: "hotel", alt: "ห้องพักโรงแรมจำลอง มีแมวและสุนัขนอนในเตียงนุ่ม", image: "pet-hotel-room" },
  { name: "อาบน้ำ & ตัดขน", label: "FRESH & FLUFFY", copy: "จัดคิวช่าง พร้อมบันทึกงานบริการ", tone: "grooming", alt: "สุนัขในอ่างอาบน้ำและแมวห่มผ้าข้างอุปกรณ์กรูมมิ่ง", image: "pet-grooming-transparent" },
  { name: "เดย์แคร์", label: "PLAY & GROW", copy: "จัดรอบกิจกรรมและจำนวนรับรายวัน", tone: "daycare", alt: "แมวและสุนัขเล่นในพื้นที่กิจกรรมเดย์แคร์", image: "pet-daycare-transparent" },
] as const;
export function BusinessServicesSection() {
  return (
    <section id="services" className="hotel-services shell" aria-labelledby="business-services-title">
      <div className="hotel-section-heading"><div><p className="business-eyebrow">MADE FOR YOUR KIND OF CARE</p><h2 id="business-services-title">ร้านแบบไหน ก็ใส่ใจได้เต็มที่</h2></div></div>
      <div className="hotel-services__grid">
        {services.map(({name, label, copy, tone, alt, image}) => (
          <article className={`hotel-service hotel-service--${tone}`} key={tone}>
            <span className="hotel-service__label">{label}</span>
            <div className="hotel-service__picture"><Image className="hotel-service__art clay-float" src={`/images/landing/${image}.png`} alt={alt} width={1200} height={800} sizes="(max-width: 800px) 90vw, 30vw" unoptimized /></div>
            <h3>{name}</h3><p>{copy}</p>
            <a href="#business-core">ดูตัวช่วยจัดการร้าน <ArrowRight size={17} /></a>
          </article>
        ))}
      </div>
    </section>
  );
}
