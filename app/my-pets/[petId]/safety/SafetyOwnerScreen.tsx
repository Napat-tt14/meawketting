"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getPrototypePetBySlug } from "../../../_prototype/consumerPets";
import type { ConsumerPet } from "../../../_prototype/consumerPets";
import type { PublicFieldKey, SafetyPrototypeState } from "../../../_prototype/safetyState";
import {
  formatPrototypeDate,
  publicSafetyIdForPet,
  readSafetyPrototypeState,
  writeSafetyPrototypeState,
} from "../../../_prototype/safetyState";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Eye,
  EyeSlash,
  LockKey,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
} from "../../../_components/icons";
import { SafetyProfileCard, SafetyStatusBadge } from "../../../safety/_components/SafetyProfileCard";

type OwnerView = "setup" | "preview" | "manage";
type LoadState = "loading" | "ready" | "not-found" | "permission-denied";

const fieldOptions: Array<{
  key: PublicFieldKey;
  title: string;
  description: string;
  placeholder?: string;
}> = [
  { key: "photo", title: "รูปของสัตว์เลี้ยง", description: "ช่วยให้ผู้พบยืนยันตัวได้เร็วขึ้น" },
  { key: "features", title: "สีและจุดสังเกต", description: "เช่น สีขน ปลอกคอ หรือลักษณะเฉพาะ", placeholder: "เช่น ขนสีครีม หางปลายเข้ม ปลอกคอสีฟ้า" },
  { key: "approach", title: "วิธีเข้าใกล้อย่างปลอดภัย", description: "บอกวิธีที่ช่วยลดความเครียดของสัตว์เลี้ยง", placeholder: "เช่น พูดเบา ๆ และหลีกเลี่ยงการอุ้มทันที" },
  { key: "emergency", title: "ข้อมูลฉุกเฉินที่เลือกเปิด", description: "เปิดเฉพาะข้อความที่จำเป็นและปลอดภัยต่อสาธารณะ", placeholder: "เช่น โปรดหลีกเลี่ยงอาหารจากคนทั่วไป" },
];

export function SafetyOwnerScreen({ petId }: { petId: string }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [pet, setPet] = useState<ConsumerPet | null>(null);
  const [safety, setSafety] = useState<SafetyPrototypeState | null>(null);
  const [view, setView] = useState<OwnerView>("setup");
  const [announcement, setAnnouncement] = useState("");

  const load = useCallback(() => {
    const found = getPrototypePetBySlug(petId);
    if (!found) {
      setLoadState("not-found");
      return;
    }
    if (found.guardianRole !== "primary" || new URLSearchParams(window.location.search).get("fixture") === "denied") {
      setLoadState("permission-denied");
      return;
    }
    const stored = readSafetyPrototypeState(found);
    setPet(found);
    setSafety(stored);
    setView(stored.status === "not-configured" ? "setup" : "manage");
    setLoadState("ready");
  }, [petId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(load);
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  const publicId = pet ? publicSafetyIdForPet(pet.prototypeSlug) : "";
  const publicPath = `/safety/${publicId}`;
  const qrValue = typeof window === "undefined" ? `https://prototype.local${publicPath}` : `${window.location.origin}${publicPath}`;

  const enabledCount = useMemo(() => safety ? Object.values(safety.publicFields).filter(Boolean).length : 0, [safety]);

  function updateState(next: SafetyPrototypeState, message?: string) {
    setSafety(next);
    writeSafetyPrototypeState(next);
    if (message) setAnnouncement(message);
  }

  function toggleField(key: PublicFieldKey) {
    if (!safety) return;
    setSafety({
      ...safety,
      publicFields: { ...safety.publicFields, [key]: !safety.publicFields[key] },
    });
  }

  function updateCopy(key: "features" | "approach" | "emergency", value: string) {
    if (!safety) return;
    setSafety({ ...safety, [key]: value });
  }

  function openPreview() {
    if (!safety) return;
    if (enabledCount === 0) {
      setAnnouncement("เลือกอย่างน้อยหนึ่งข้อมูลเพิ่มเติมก่อนเปิดตัวอย่าง");
      return;
    }
    setAnnouncement("");
    setView("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function activate() {
    if (!safety) return;
    const next = { ...safety, status: "active" as const, lastChanged: new Date().toISOString() };
    updateState(next, "เปิด Public Safety Profile แล้วใน prototype state");
    setView("manage");
  }

  function toggleDisabled() {
    if (!safety) return;
    const status = safety.status === "disabled" ? "active" : "disabled";
    const next = { ...safety, status, lastChanged: new Date().toISOString() };
    updateState(next, status === "disabled" ? "ปิด Public Safety Profile แล้ว ข้อมูลเดิมจะไม่แสดงบนหน้าสาธารณะ" : "เปิด Public Safety Profile อีกครั้งแล้ว");
  }

  if (loadState === "loading") return <SafetyLoading label="กำลังเปิดการตั้งค่า Public Safety QR" />;
  if (loadState === "not-found") return <SafetyRecovery title="ไม่พบข้อมูลสำหรับตั้งค่า Safety" message="ลิงก์นี้ไม่ตรงกับ Pet ใน prototype และเราไม่ได้แสดงข้อมูลของรายการอื่นแทน" />;
  if (loadState === "permission-denied") return <SafetyRecovery title="คุณยังจัดการ Safety ไม่ได้" message="ต้นแบบนี้ให้ Primary Guardian ควบคุม Public Safety QR เท่านั้น นี่เป็นสมมติฐานที่ย้อนกลับได้ ไม่ใช่นโยบาย production" />;
  if (!pet || !safety) return null;

  return (
    <div className="safety-owner-page shell">
      <a className="consumer-back" href={`/my-pets/${pet.prototypeSlug}`}><ArrowLeft size={18} weight="bold" /> กลับ Pet Detail</a>
      <p className="prototype-boundary"><CircleAlert size={17} weight="bold" /> PROTOTYPE STATE ONLY · Public identifier และการซ่อน UI ไม่ใช่ security หรือ real authorization</p>
      <div className="safety-flow-heading">
        <div><p className="consumer-kicker">PUBLIC SAFETY QR</p><h1>{view === "setup" ? "เลือกสิ่งที่คนสแกนจะเห็น" : view === "preview" ? "ตรวจจากมุมของผู้พบ" : "จัดการ Safety ของน้อง"}</h1></div>
        <SafetyStatusBadge status={safety.status} />
      </div>
      <div className="safety-progress" aria-label="ขั้นตอนตั้งค่า">
        <span className={view === "setup" ? "is-current" : "is-complete"}><b>1</b> เลือกข้อมูล</span>
        <span className={view === "preview" ? "is-current" : view === "manage" ? "is-complete" : ""}><b>2</b> ดูตัวอย่าง</span>
        <span className={view === "manage" ? "is-current" : ""}><b>3</b> จัดการ</span>
      </div>
      <p className="sr-live" aria-live="polite">{announcement}</p>

      {view === "setup" ? (
        <div className="safety-setup-grid">
          <section className="safety-task-card" aria-labelledby="public-fields-heading">
            <div className="safety-task-card__heading"><ShieldCheck size={28} weight="bold" /><div><p className="consumer-kicker">SAFE-001</p><h2 id="public-fields-heading">ข้อมูลสาธารณะที่คุณควบคุม</h2></div></div>
            <p>ชื่อและชนิดสัตว์ใช้เป็นตัวระบุหลักของ Safety Profile ส่วนข้อมูลด้านล่างจะซ่อนไว้จนกว่าคุณจะเลือกเอง</p>
            <fieldset className="public-field-selector">
              <legend>เลือกข้อมูลเพิ่มเติมที่เปิดต่อสาธารณะ</legend>
              {fieldOptions.map((option) => {
                const selected = safety.publicFields[option.key];
                return (
                  <div className={`public-field-option${selected ? " is-selected" : ""}`} key={option.key}>
                    <label>
                      <input type="checkbox" checked={selected} onChange={() => toggleField(option.key)} />
                      <span><strong>{option.title}</strong><small>{option.description}</small></span>
                      <span className="public-field-option__state">{selected ? <><Check size={16} weight="bold" /> เปิด</> : <><EyeSlash size={16} weight="bold" /> ซ่อน</>}</span>
                    </label>
                    {selected && option.placeholder && option.key !== "photo" ? (
                      <textarea
                        aria-label={option.title}
                        rows={3}
                        value={safety[option.key]}
                        placeholder={option.placeholder}
                        onChange={(event) => updateCopy(option.key, event.target.value)}
                      />
                    ) : null}
                  </div>
                );
              })}
            </fieldset>
          </section>

          <aside className="safety-private-card">
            <LockKey size={28} weight="bold" />
            <p className="consumer-kicker">HIDDEN BY DEFAULT</p>
            <h2>ข้อมูลที่ QR นี้ไม่เปิด</h2>
            <ul><li>เบอร์โทรจริงและที่อยู่บ้าน</li><li>ประวัติสุขภาพและเอกสาร</li><li>Private notes และข้อมูลการชำระเงิน</li><li>ประวัติธุรกิจและ Temporary Business access</li></ul>
            <p>นี่คือ owner-controlled public visibility ไม่ใช่ Business consent หรือ Temporary QR</p>
          </aside>
          <div className="safety-actions safety-actions--wide">
            <a className="button button--ghost" href={`/my-pets/${pet.prototypeSlug}`}>ยกเลิก</a>
            <button className="button button--primary button--large" type="button" onClick={openPreview}><Eye size={20} weight="bold" /> Preview Safety Profile</button>
          </div>
        </div>
      ) : null}

      {view === "preview" ? (
        <div className="safety-preview-grid">
          <section>
            <div className="safety-preview-label"><Eye size={19} weight="bold" /> Shown publicly</div>
            <SafetyProfileCard pet={pet} state={{ ...safety, status: "active" }} />
          </section>
          <aside className="safety-private-card">
            <EyeSlash size={28} weight="bold" />
            <p className="consumer-kicker">STILL PRIVATE</p><h2>ยังคงซ่อนอยู่</h2>
            <ul>
              {fieldOptions.filter((option) => !safety.publicFields[option.key]).map((option) => <li key={option.key}>{option.title}</li>)}
              <li>เบอร์โทร ที่อยู่ ประวัติสุขภาพ เอกสาร และ private notes</li>
            </ul>
            <p>หน้านี้ใช้มุมมองเดียวกับ Finder ก่อนเปิดจริง</p>
          </aside>
          <div className="safety-actions safety-actions--wide">
            <button className="button button--ghost" type="button" onClick={() => setView("setup")}>กลับไปแก้ไข</button>
            <button className="button button--primary button--large" type="button" onClick={activate}><ShieldCheck size={20} weight="bold" /> Activate Safety Profile</button>
          </div>
        </div>
      ) : null}

      {view === "manage" ? (
        <div className="safety-manage-grid">
          <section className="safety-task-card safety-task-card--qr" aria-labelledby="manage-safety-heading">
            <div className="safety-task-card__heading"><QrCode size={28} weight="bold" /><div><p className="consumer-kicker">SAFE-003 · PERMANENT</p><h2 id="manage-safety-heading">Public Safety QR</h2></div></div>
            <div className="safety-qr-layout">
              <div className="safety-qr-code">
                <QRCodeSVG value={qrValue} size={210} level="M" marginSize={2} bgColor="var(--color-meaw-cream-50)" fgColor="var(--color-meaw-ink-900)" title={`Public Safety QR ของ ${pet.name}`} />
              </div>
              <dl className="safety-manage-facts">
                <div><dt>ประเภท QR</dt><dd>Public Safety QR</dd></div>
                <div><dt>สัตว์เลี้ยง</dt><dd>{pet.name}</dd></div>
                <div><dt>สถานะ</dt><dd><SafetyStatusBadge status={safety.status} /></dd></div>
                <div><dt>เปลี่ยนล่าสุด</dt><dd>{formatPrototypeDate(safety.lastChanged)}</dd></div>
              </dl>
            </div>
            <p className="safety-qr-distinction"><ShieldAlert size={19} weight="bold" /> QR นี้ไม่มีวันหมดอายุ, Business recipient หรือ service scope และไม่ใช่ Temporary Business QR</p>
            <div className="safety-actions">
              <a className="button button--primary" href={publicPath} target="_blank" rel="noreferrer"><Eye size={19} weight="bold" /> เปิด Public View</a>
              <button className="button button--ghost" type="button" onClick={() => setView("setup")}>แก้ข้อมูลสาธารณะ</button>
              {safety.status !== "lost" ? <button className="button button--ghost" type="button" onClick={toggleDisabled}>{safety.status === "disabled" ? <ShieldCheck size={19} weight="bold" /> : <ShieldOff size={19} weight="bold" />} {safety.status === "disabled" ? "เปิดอีกครั้ง" : "ปิด Safety Profile"}</button> : null}
            </div>
          </section>

          <aside className={`safety-lost-entry${safety.status === "lost" ? " safety-lost-entry--active" : ""}`}>
            <ShieldAlert size={32} weight="bold" />
            <p className="consumer-kicker">LOST MODE</p>
            <h2>{safety.status === "lost" ? `กำลังตามหา ${pet.name}` : "เมื่อน้องหาย ให้เริ่มจากตรงนี้"}</h2>
            <p>{safety.status === "lost" ? "Public URL เดิมกำลังแสดง Lost experience และรับ Finder lead ใน prototype" : "Lost Mode จะเปลี่ยนหน้า Public Safety เดิมอย่างตั้งใจ และยังไม่เปิดทันทีจนกว่าจะตรวจรายละเอียด"}</p>
            {safety.status === "disabled" ? <p className="inline-warning"><CircleAlert size={18} weight="bold" /> เปิด Safety Profile ก่อนจึงเริ่ม Lost Mode ได้</p> : (
              <a className="button button--dark" href={`/my-pets/${pet.prototypeSlug}/safety/lost`}>{safety.status === "lost" ? "เปิด Lost Case Dashboard" : "Start Lost Mode"}</a>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function SafetyLoading({ label }: { label: string }) {
  return <div className="safety-owner-page shell" aria-busy="true"><section className="flow-loading-card"><QrCode size={28} weight="bold" /> {label}</section></div>;
}

function SafetyRecovery({ title, message }: { title: string; message: string }) {
  return <div className="safety-owner-page shell"><section className="consumer-recovery" role="alert"><CircleAlert size={40} weight="bold" /><p className="consumer-kicker">Safety recovery</p><h1>{title}</h1><p>{message}</p><div className="consumer-recovery__actions"><a className="button button--ghost" href="/my-pets">กลับ My Pets</a></div></section></div>;
}
