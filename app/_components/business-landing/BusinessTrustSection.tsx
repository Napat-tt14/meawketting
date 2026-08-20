import { LockKey, ShieldCheck, Sparkle } from "../icons";

const trustPrinciples = [
  {
    icon: LockKey,
    title: "ร้านเห็นเท่าที่จำเป็น",
    copy: "ข้อมูล Pet Passport เปิดให้ร้านเฉพาะส่วนที่เจ้าของอนุญาตสำหรับงานนั้น",
  },
  {
    icon: ShieldCheck,
    title: "เจ้าของเป็นผู้กำหนดขอบเขต",
    copy: "จำกัดได้ตามวัตถุประสงค์ ช่วงเวลา และสถานการณ์ โดยข้อมูลต้นฉบับยังอยู่กับเจ้าของ",
  },
  {
    icon: Sparkle,
    title: "CareProof ส่งประวัติกลับ",
    copy: "ส่งบันทึกบริการที่ตรวจสอบได้กลับไปยังเจ้าของหลังส่งมอบ",
  },
] as const;

export function BusinessTrustSection() {
  return (
    <section id="trust" className="business-trust-section" aria-labelledby="business-trust-title">
      <div className="shell">
        <div className="business-trust-section__heading">
          <p className="business-eyebrow">ความต่างที่มากกว่าระบบจองหรือ POS</p>
          <h2 id="business-trust-title">ข้อมูลของน้องยังอยู่ภายใต้การควบคุมของเจ้าของ</h2>
          <p>
            Pet Passport และ Guardian Network เป็นชั้นความไว้วางใจหลังงานหน้าร้าน
            ช่วยให้ธุรกิจใช้ข้อมูลที่จำเป็นได้ โดยไม่ต้องเป็นเจ้าของข้อมูลของน้อง
          </p>
        </div>

        <div className="business-trust-section__principles">
          {trustPrinciples.map(({ icon: Icon, title, copy }, index) => (
            <article key={title}>
              <span><Icon size={24} /></span>
              <small>0{index + 1}</small>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
