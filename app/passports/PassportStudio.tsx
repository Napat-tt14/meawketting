"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowClockwise,
  BookOpen,
  Camera,
  Cat,
  CheckCircle,
  Dog,
  IdentificationCard,
  PawPrint,
  QrCode,
  Sparkle,
  Sticker,
  Ticket,
} from "../_components/icons";
import { PassportCard } from "../_components/PassportCard";
import type { PassportStyle } from "../create-passport/DraftPassportContext";

const styles: Array<{ id: PassportStyle; name: string; eyebrow: string; description: string; Icon: typeof IdentificationCard }> = [
  { id: "classic", name: "Classic", eyebrow: "Official calm", description: "Navy, brass และตราประทับที่ให้ความรู้สึกเป็นเอกสารทางการ", Icon: IdentificationCard },
  { id: "booklet", name: "Booklet", eyebrow: "Care records", description: "สมุดเปิดสองหน้า แยกตัวตนกับประวัติการดูแลให้อ่านเร็ว", Icon: BookOpen },
  { id: "sticker", name: "Sticker Book", eyebrow: "Personal diary", description: "กระดาษสีอ่อน เทป และ chip สนุก ๆ สำหรับบ้านที่ชอบเก็บเรื่องเล่า", Icon: Sticker },
  { id: "polaroid", name: "Polaroid", eyebrow: "Warm memory", description: "ภาพความทรงจำคู่กับ handwritten note ที่ใช้ Sriracha เฉพาะจุด", Icon: Camera },
  { id: "ticket", name: "Retro Ticket", eyebrow: "Quick scan", description: "ข้อมูลสั้นแบบตั๋ว มี serial, perforation และ QR ที่เด่นชัด", Icon: Ticket },
  { id: "japan", name: "Minimal Japan", eyebrow: "Quiet precision", description: "พื้นที่ว่าง เส้นบาง และ vermilion accent เพื่อความนิ่งที่ยังเป็นมิตร", Icon: Sparkle },
];

const pets = {
  cat: { name: "Mochi", speciesLabel: "แมว / Cat", passport: "PP-2026-000789", Icon: Cat },
  dog: { name: "Milo", speciesLabel: "สุนัข / Dog", passport: "PP-2026-000842", Icon: Dog },
} as const;

export function PassportStudio({ initialStyle = 0 }: { initialStyle?: number }) {
  const [styleIndex, setStyleIndex] = useState(Math.min(Math.max(initialStyle, 0), styles.length - 1));
  const [species, setSpecies] = useState<keyof typeof pets>("cat");
  const [flipped, setFlipped] = useState(false);
  const style = styles[styleIndex];
  const pet = pets[species];

  function selectStyle(index: number) {
    setStyleIndex(index);
    setFlipped(false);
  }

  function selectSpecies(nextSpecies: keyof typeof pets) {
    setSpecies(nextSpecies);
    setFlipped(false);
  }

  return (
    <section className="passport-studio shell" aria-label="ทดลอง Passport styles">
      <div className="studio-layout">
        <div className="passport-stage">
          <div className="stage-motif stage-motif--one" aria-hidden="true" />
          <div className="stage-motif stage-motif--two" aria-hidden="true" />
          <div className={`passport-flip passport-flip--${style.id}${flipped ? " is-flipped" : ""}`}>
            <div className="passport-flip__inner">
              <div className="passport-flip__face passport-flip__front" aria-hidden={flipped}>
                <PassportCard
                  style={style.id}
                  photoSrc="/images/hero-care-v1.png"
                  name={pet.name}
                  speciesLabel={pet.speciesLabel}
                  passportId={pet.passport}
                  status="draft"
                />
              </div>
              <div className={`passport-flip__face passport-flip__back passport-flip__back--${style.id}`} aria-hidden={!flipped}>
                <span className="passport-qr-kicker"><QrCode size={18} weight="bold" /> Passport Studio QR visual demo</span>
                <div className="passport-qr-full">
                  <QRCodeSVG value={`https://meawketting.local/demo/passport/${pet.passport}`} size={260} bgColor="var(--surface)" fgColor="var(--ink)" level="M" title={`Passport Studio QR visual demo ของ ${pet.name}`} />
                  <span className="passport-qr-paw"><PawPrint size={24} weight="fill" /></span>
                </div>
                <strong>{pet.name}</strong>
                <p>ตัวอย่างภาพ QR สำหรับ Studio เท่านั้น</p>
                <small>ไม่ใช่ Quick Passport QR, Public Safety QR หรือ Temporary Business QR</small>
              </div>
            </div>
            <button
              className="passport-flip__trigger"
              type="button"
              aria-label={flipped ? "แตะเพื่อพลิกการ์ด" : `พลิก Passport ของ ${pet.name} เพื่อดู QR`}
              aria-pressed={flipped}
              onClick={() => setFlipped((current) => !current)}
            />
          </div>
          <p className="passport-flip-hint" aria-live="polite"><ArrowClockwise size={18} weight="bold" /> {flipped ? "แตะ QR อีกทีเพื่อพลิกการ์ด" : "แตะ Passport แล้วพลิกดู QR"}</p>
        </div>

        <aside className="style-notes">
          <span className="style-notes__count">0{styleIndex + 1} / 06</span>
          <span className="section-label"><style.Icon size={14} weight="fill" /> {style.eyebrow}</span>
          <h2>{style.name}</h2>
          <p>{style.description}</p>
          <dl className="style-notes__facts">
            <div><dt>นางแบบวันนี้</dt><dd><pet.Icon size={17} weight="fill" /> {pet.name}</dd></div>
            <div><dt>โหมด</dt><dd><CheckCircle size={17} weight="fill" /> แตะเพื่อพลิก</dd></div>
          </dl>
          <div className="style-notes__callout"><PawPrint size={21} weight="fill" /><span><strong>เล่นได้เต็มที่</strong> เปลี่ยนลุคได้เลย ข้อมูลของน้องยังอยู่ที่เดิม</span></div>
        </aside>
      </div>

      <div className="studio-toolbar">
        <div className="studio-style-picker">
          <div className="studio-style-picker__intro"><span className="consumer-kicker">Pick a vibe</span><strong>ลองชุดใหม่ให้น้อง</strong></div>
          <div className="studio-tabs" role="tablist" aria-label="เลือกสไตล์ Passport">
            {styles.map((item, index) => {
              const Icon = item.Icon;
              return (
                <button key={item.id} type="button" role="tab" aria-selected={styleIndex === index} className={`style-choice style-choice--${item.id}${styleIndex === index ? " is-active" : ""}`} onClick={() => selectStyle(index)}>
                  <span className="style-choice__number">0{index + 1}</span>
                  <span className="style-choice__icon"><Icon size={20} weight={styleIndex === index ? "fill" : "bold"} /></span>
                  <span className="style-choice__copy"><strong>{item.name}</strong><small>{item.eyebrow}</small></span>
                  {styleIndex === index ? <CheckCircle className="style-choice__check" size={18} weight="fill" /> : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="pet-switch pet-switch--studio" aria-label="เลือกชนิดสัตว์">
          <button type="button" className={species === "cat" ? "is-active" : undefined} aria-pressed={species === "cat"} onClick={() => selectSpecies("cat")}><Cat size={18} weight="bold" /> แมว</button>
          <button type="button" className={species === "dog" ? "is-active" : undefined} aria-pressed={species === "dog"} onClick={() => selectSpecies("dog")}><Dog size={18} weight="bold" /> สุนัข</button>
        </div>
      </div>
    </section>
  );
}
