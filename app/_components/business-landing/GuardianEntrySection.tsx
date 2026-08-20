import Image from "next/image";
import Link from "next/link";
import { ArrowRight, IdentificationCard, PawPrint, ShieldCheck } from "../icons";

export function GuardianEntrySection() {
  return (
    <section id="guardian" className="guardian-entry-section shell" aria-labelledby="guardian-entry-title">
      <div className="guardian-entry-section__image" aria-hidden="true">
        <Image src="/images/business/pet-business-services-photo.png" alt="" width={250} height={250} />
      </div>
      <div className="guardian-entry-section__content">
        <p className="business-eyebrow"><PawPrint size={18} /> สำหรับเจ้าของสัตว์เลี้ยง</p>
        <h2 id="guardian-entry-title">เป็นเจ้าของสัตว์เลี้ยง?</h2>
        <p>
          ดู Pet Passport, เปิดโหมด Safety / Lost และแชร์ข้อมูลเท่าที่ต้องการ
          เพื่อให้การดูแลน้องและประวัติบริการอยู่ในความควบคุมของคุณ
        </p>
        <div className="guardian-entry-section__actions">
          <Link className="button button--paper" href="/my-pets">
            <ShieldCheck size={18} /> ดูสัตว์เลี้ยงของฉัน <ArrowRight size={16} />
          </Link>
          <Link className="guardian-entry-section__create-link" href="/create-passport">
            <IdentificationCard size={18} /> ยังไม่มี Passport? เริ่มสร้าง
          </Link>
        </div>
      </div>
    </section>
  );
}
