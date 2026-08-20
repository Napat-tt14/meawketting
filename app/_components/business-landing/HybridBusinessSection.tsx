import Image from "next/image";
import { ArrowRight, BedDouble, CheckCircle, Scissors } from "../icons";

export function HybridBusinessSection() {
  return (
    <section className="business-hybrid-section shell" aria-labelledby="business-hybrid-title">
      <div className="business-hybrid-section__content business-section-intro">
        <p className="business-eyebrow">หลายบริการ เดินเรื่องเดียวกัน</p>
        <h2 id="business-hybrid-title">ลูกค้าหนึ่งราย ใช้หลายบริการได้โดยข้อมูลไม่ขาดช่วง</h2>
        <p>
          ร้านเห็นการเข้าพักและคิวอาบน้ำของ Mochi ต่อเนื่องกัน
          ทีมเตรียมงานถูกเวลา และเจ้าของไม่ต้องเล่าเรื่องเดิมซ้ำทุกจุด
        </p>
      </div>

      <div className="business-hybrid-section__panel" aria-label="การเดินทางของ Mochi">
        <div className="business-hybrid-section__profile">
          <Image
            src="/images/business/pet-business-services-photo.png"
            alt="ภาพถ่ายแมวสามสีในพื้นที่บริการของร้าน"
            width={72}
            height={72}
          />
          <div>
            <strong>Mochi</strong>
            <p>พักโรงแรม 3 คืน + อาบน้ำก่อนรับกลับ</p>
          </div>
          <span aria-hidden="true"><BedDouble size={20} /></span>
        </div>
        <div className="business-hybrid-section__journey" aria-label="โรงแรมสามคืน ต่อด้วยอาบน้ำก่อนรับกลับ">
          <span><BedDouble size={22} /><small>01</small><strong>โรงแรม 3 คืน</strong><em>ดูแล · เช็กเอาต์</em></span>
          <ArrowRight size={20} aria-hidden="true" />
          <span><Scissors size={22} /><small>02</small><strong>อาบน้ำก่อนรับกลับ</strong><em>นัดหมายต่อเนื่อง</em></span>
          <ArrowRight size={20} aria-hidden="true" />
          <span><CheckCircle size={22} /><small>03</small><strong>ประวัติยังเชื่อมกัน</strong><em>ส่งต่อ CareProof</em></span>
        </div>
      </div>
    </section>
  );
}
