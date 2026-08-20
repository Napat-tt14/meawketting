"use client";

import {
  ArrowClockwise,
  BellRinging,
  Cat,
  Check,
  CheckCircle,
  Clock,
  Dog,
  EyeSlash,
  FirstAidKit,
  IdentificationCard,
  Info,
  LockKey,
  MapPin,
  PawPrint,
  Phone,
  QrCode,
  Scan,
  ShieldCheck,
  Storefront,
} from "../_components/icons";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const pets = {
  cat: {
    name: "Mochi",
    breed: "British Shorthair",
    age: "2 ปี",
    sex: "ตัวเมีย",
    id: "PP-2026-000789",
    caution: "แพ้ยา Amoxicillin",
    comfort: "ไม่ชอบเสียงดัง จับช้า ๆ ได้",
    service: "อาบน้ำและตัดเล็บ",
    Icon: Cat,
  },
  dog: {
    name: "Milo",
    breed: "Golden Retriever",
    age: "3 ปี",
    sex: "ตัวผู้",
    id: "PP-2026-000842",
    caution: "แพ้โปรตีนไก่",
    comfort: "เป็นมิตร ชอบของเล่นผ้านุ่ม",
    service: "อาบน้ำ ตัดขน และเป่าขน",
    Icon: Dog,
  },
} as const;

export function QrDemo() {
  const [species, setSpecies] = useState<keyof typeof pets>("cat");
  const [scanned, setScanned] = useState(false);
  const [shareMedical, setShareMedical] = useState(true);
  const pet = pets[species];
  const PetIcon = pet.Icon;
  const qrValue = `https://meawketting.local/share/${pet.id}?scope=care&expires=8h&medical=${shareMedical}`;

  function changeSpecies(next: keyof typeof pets) {
    setSpecies(next);
    setScanned(false);
  }

  return (
    <section className="qr-lab shell" aria-label="QR sharing demonstration">
      <div className="owner-panel">
        <header className="panel-heading">
          <span className="panel-step">01</span>
          <div><span>OWNER VIEW</span><h2>สร้าง Temporary Business QR</h2></div>
          <ShieldCheck size={25} weight="duotone" />
        </header>

        <div className="pet-switch pet-switch--wide" aria-label="เลือกชนิดสัตว์">
          <button
            type="button"
            className={species === "cat" ? "is-active" : undefined}
            aria-pressed={species === "cat"}
            onClick={() => changeSpecies("cat")}
          >
            <Cat size={19} weight="bold" /> Mochi · แมว
          </button>
          <button
            type="button"
            className={species === "dog" ? "is-active" : undefined}
            aria-pressed={species === "dog"}
            onClick={() => changeSpecies("dog")}
          >
            <Dog size={19} weight="bold" /> Milo · สุนัข
          </button>
        </div>

        <div className="share-card">
          <div className="share-card__pet">
            <span className="pet-avatar pet-avatar--large"><PetIcon size={45} weight="duotone" /></span>
            <div><strong>{pet.name}</strong><span>{pet.breed} · {pet.age}</span></div>
            <span className="status-badge status-badge--active"><span /> สิทธิ์ QR ทำงาน</span>
          </div>

          <div className="share-summary">
            <div><span className="icon-box icon-box--mini icon-box--lav"><Clock size={18} weight="bold" /></span><span><small>สิทธิ์หมดอายุ</small><strong>วันนี้ 18:45 · อีก 8 ชม.</strong></span></div>
            <div><span className="icon-box icon-box--mini icon-box--sky"><Storefront size={18} weight="bold" /></span><span><small>ใช้สำหรับ</small><strong>รับบริการที่ Meaw Care</strong></span></div>
          </div>

          <label className="scope-toggle">
            <span>
              <FirstAidKit size={21} weight="duotone" />
              <span><strong>แชร์คำเตือนสุขภาพ</strong><small>แสดงเฉพาะข้อมูลที่เกี่ยวกับบริการครั้งนี้</small></span>
            </span>
            <input
              type="checkbox"
              checked={shareMedical}
              onChange={(event) => {
                setShareMedical(event.target.checked);
                setScanned(false);
              }}
            />
            <i aria-hidden="true" />
          </label>
        </div>

        <div className="qr-code-card">
          <div className="qr-code-wrap">
            <QRCodeSVG
              value={qrValue}
              size={210}
              level="M"
              marginSize={2}
              bgColor="var(--color-meaw-cream-50)"
              fgColor="var(--color-meaw-ink-900)"
              title={`Temporary Business QR ของ ${pet.name}`}
            />
            <span className="qr-center-mark" aria-hidden="true"><PawPrint size={19} weight="fill" /></span>
          </div>
          <div className="qr-code-copy">
            <span className="status-badge status-badge--private"><LockKey size={12} weight="fill" /> One-time scope</span>
            <h3>พร้อมให้ร้านสแกน</h3>
            <p>QR นี้เป็น mock ที่ใช้แสดงพฤติกรรมของหน้าจอ ไม่มีการส่งข้อมูลจริง</p>
            <button className="button button--primary button--large" type="button" onClick={() => setScanned(true)}>
              <Scan size={21} weight="bold" /> จำลองสแกน QR
            </button>
          </div>
        </div>

        <div className="scope-legend">
          <div><CheckCircle size={19} weight="fill" /><span><strong>ร้านเห็น</strong> โปรไฟล์สั้น งานบริการ คำเตือนที่อนุญาต และเบอร์ติดต่อฉุกเฉิน</span></div>
          <div><EyeSlash size={19} weight="fill" /><span><strong>ร้านไม่เห็น</strong> ที่อยู่เจ้าของ เอกสารส่วนตัว ประวัติร้านอื่น และข้อมูลนอกช่วงเวลา</span></div>
        </div>
      </div>

      <div className={scanned ? "scan-bridge is-complete" : "scan-bridge"} aria-hidden="true">
        <span><QrCode size={22} weight="bold" /></span>
        <i />
        <span><Scan size={22} weight="bold" /></span>
      </div>

      <div className="business-panel">
        <header className="panel-heading">
          <span className="panel-step">02</span>
          <div><span>BUSINESS VIEW</span><h2>หน้ารับข้อมูลหลังสแกน</h2></div>
          <Storefront size={25} weight="duotone" />
        </header>

        <div className="device-frame">
          <div className="device-frame__top"><span>9:41</span><i /><span>Meaw Care</span></div>
          <div className={scanned ? "business-screen is-visible" : "business-screen"}>
            {!scanned ? (
              <div className="scan-empty">
                <span className="scan-empty__icon"><Scan size={43} weight="duotone" /></span>
                <h3>รอการสแกนจากฝั่งเจ้าของ</h3>
                <p>กด “จำลองสแกน QR” เพื่อเปิดข้อมูลที่ร้านได้รับ</p>
              </div>
            ) : (
              <>
                <div className="access-strip">
                  <span><Check size={15} weight="bold" /> ACCESS GRANTED</span>
                  <span><Clock size={15} weight="bold" /> เหลือ 07:59:42</span>
                </div>
                <section className="business-pet-card">
                  <span className="pet-avatar pet-avatar--large"><PetIcon size={44} weight="duotone" /></span>
                  <div><small>PET CHECK-IN</small><h3>{pet.name}</h3><p>{pet.breed} · {pet.sex} · {pet.age}</p></div>
                  <span className="status-badge status-badge--active"><span /> QR ตรวจแล้ว</span>
                </section>

                {shareMedical ? (
                  <section className="critical-card">
                    <BellRinging size={22} weight="fill" />
                    <div><small>ข้อควรระวังก่อนบริการ</small><strong>{pet.caution}</strong><p>{pet.comfort}</p></div>
                  </section>
                ) : (
                  <section className="hidden-medical-card">
                    <EyeSlash size={21} weight="fill" />
                    <div><strong>ไม่ได้รับสิทธิ์ดูข้อมูลสุขภาพ</strong><p>สอบถามเจ้าของก่อนเริ่มบริการหากมีข้อสงสัย</p></div>
                  </section>
                )}

                <section className="service-card">
                  <header><span><IdentificationCard size={18} weight="bold" /> งานบริการวันนี้</span><small>#IN-0284</small></header>
                  <h3>{pet.service}</h3>
                  <ul>
                    <li><CheckCircle size={18} weight="fill" /> ตรวจสภาพก่อนรับเข้า</li>
                    <li><span className="empty-check" /> บันทึกความต้องการเพิ่มเติม</li>
                    <li><span className="empty-check" /> ยืนยันเวลารับกลับ</li>
                  </ul>
                </section>

                <section className="contact-card">
                  <div><Phone size={20} weight="duotone" /><span><small>ติดต่อฉุกเฉิน</small><strong>คุณ Lyna · 089 123 4567</strong></span></div>
                  <div><MapPin size={20} weight="duotone" /><span><small>ที่อยู่เจ้าของ</small><strong>ซ่อนตามขอบเขตสิทธิ์</strong></span></div>
                </section>

                <div className="business-actions">
                  <button type="button" className="button button--primary"><CheckCircle size={19} weight="bold" /> เริ่มรับเข้า</button>
                  <button type="button" className="button button--paper" onClick={() => setScanned(false)}><ArrowClockwise size={19} weight="bold" /> สแกนใหม่</button>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="business-caption"><Info size={17} weight="fill" /> Mock นี้แสดงเฉพาะ Temporary Business QR ไม่ใช่ Public Safety QR สำหรับสัตว์สูญหาย</p>
      </div>
    </section>
  );
}
