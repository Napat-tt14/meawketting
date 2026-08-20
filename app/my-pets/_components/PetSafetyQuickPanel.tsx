"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { ConsumerPet } from "../../_prototype/consumerPets";
import type { PublicFieldKey, PublicFields, SafetyPrototypeState } from "../../_prototype/safetyState";
import {
  publicSafetyIdForPet,
  readSafetyPrototypeState,
  writeSafetyPrototypeState,
} from "../../_prototype/safetyState";
import { Check, Eye, EyeSlash, QrCode, ShieldAlert, ShieldCheck, ShieldOff } from "../../_components/icons";
import { SafetyStatusBadge } from "../../safety/_components/SafetyProfileCard";

const limitedFields: PublicFields = { photo: false, features: false, approach: false, emergency: false };
const lostFields: PublicFields = { photo: true, features: true, approach: true, emergency: true };

const fieldOptions: Array<{ key: PublicFieldKey; label: string; help: string }> = [
  { key: "photo", label: "รูปของน้อง", help: "ช่วยให้ผู้พบเห็นยืนยันตัวได้" },
  { key: "features", label: "สีและจุดสังเกต", help: "ข้อมูลที่ช่วยจำแนกน้อง" },
  { key: "approach", label: "วิธีเข้าใกล้อย่างปลอดภัย", help: "ช่วยลดความเครียดของน้อง" },
  { key: "emergency", label: "ข้อมูลติดต่อฉุกเฉิน", help: "ช่องทางติดต่อที่คุณเลือกเปิด" },
];

function defaultLostCase(safety: SafetyPrototypeState) {
  if (safety.lostCase?.phase === "active") return safety.lostCase;
  return {
    phase: "active" as const,
    activatedAt: new Date().toISOString(),
    closedAt: null,
    details: {
      lastSeenAt: "",
      area: "",
      distinctiveFeatures: safety.features,
      approach: safety.approach,
      photoName: null,
    },
    leads: [],
  };
}

export function PetSafetyQuickPanel({ pet }: { pet: ConsumerPet }) {
  const [safety, setSafety] = useState<SafetyPrototypeState | null>(null);
  const publicPath = `/safety/${publicSafetyIdForPet(pet.prototypeSlug)}`;
  const qrValue = typeof window === "undefined" ? `https://prototype.local${publicPath}` : `${window.location.origin}${publicPath}`;
  const isLost = safety?.status === "lost";
  const enabledCount = useMemo(() => safety ? Object.values(safety.publicFields).filter(Boolean).length : 0, [safety]);

  useEffect(() => {
    const load = () => setSafety(readSafetyPrototypeState(pet));
    load();
    const onStateChange = () => load();
    window.addEventListener("meawketting:safety-state", onStateChange);
    return () => window.removeEventListener("meawketting:safety-state", onStateChange);
  }, [pet]);

  function persist(next: SafetyPrototypeState) {
    setSafety(next);
    writeSafetyPrototypeState(next);
  }

  function toggleSafety() {
    if (!safety || isLost) return;
    const nextStatus = safety.status === "active" ? "disabled" : "active";
    persist({ ...safety, status: nextStatus, lastChanged: new Date().toISOString() });
  }

  function toggleField(key: PublicFieldKey) {
    if (!safety || isLost) return;
    persist({
      ...safety,
      publicFields: { ...safety.publicFields, [key]: !safety.publicFields[key] },
      status: safety.status === "not-configured" ? "active" : safety.status,
      lastChanged: new Date().toISOString(),
    });
  }

  function updateCopy(key: "features" | "approach" | "emergency", value: string) {
    if (!safety || isLost) return;
    persist({ ...safety, [key]: value, lastChanged: new Date().toISOString() });
  }

  function toggleLostMode() {
    if (!safety) return;
    const now = new Date().toISOString();
    if (isLost) {
      const restored = safety.normalPublicFields ?? limitedFields;
      persist({
        ...safety,
        status: "active",
        publicFields: restored,
        normalPublicFields: undefined,
        lastChanged: now,
        lostCase: safety.lostCase ? { ...safety.lostCase, phase: "closed", closedAt: now } : null,
      });
      return;
    }
    persist({
      ...safety,
      status: "lost",
      publicFields: lostFields,
      normalPublicFields: safety.publicFields,
      lastChanged: now,
      emergency: safety.emergency || "ติดต่อผู้ดูแลผ่านปุ่มส่งข้อความในหน้า Public Safety",
      lostCase: defaultLostCase(safety),
    });
  }

  if (!safety) return <section className="pet-safety-quick" aria-busy="true"><div className="flow-loading-card"><QrCode size={24} weight="bold" /> กำลังเปิด Safety QR</div></section>;

  const qrEnabled = safety.status !== "disabled" && safety.status !== "not-configured";

  return (
    <section className={`pet-safety-quick${isLost ? " pet-safety-quick--lost" : ""}`} aria-labelledby="pet-safety-quick-heading">
      <header className="pet-safety-quick__heading">
        <div><p className="consumer-kicker">Public Safety QR</p><h2 id="pet-safety-quick-heading">ความปลอดภัยของน้อง</h2><p>เลือกข้อมูลที่จะแสดงบน QR ถาวร แล้วเปิดหรือปิดได้จากที่นี่</p></div>
        <SafetyStatusBadge status={safety.status} />
      </header>
      <div className="pet-safety-quick__layout">
        <div className="pet-safety-quick__qr">
          <div className="pet-safety-quick__qr-frame"><QRCodeSVG value={qrValue} size={190} level="M" marginSize={2} title={`Public Safety QR ของ ${pet.name}`} /></div>
          <a className="button button--ghost" href={publicPath}><Eye size={18} weight="bold" /> ดูมุมมองผู้พบ</a>
        </div>
        <div className="pet-safety-quick__controls">
          <label className="safety-switch">
            <input type="checkbox" checked={qrEnabled} onChange={toggleSafety} disabled={isLost} />
            <span className="safety-switch__track" aria-hidden="true"><span /></span>
            <span className="sr-only">เปิดหรือปิด Public Safety QR</span>
            <span><strong>{qrEnabled ? "QR กำลังเปิด" : "QR ปิดอยู่"}</strong><small>{isLost ? "Lost Mode กำลังเปิดข้อมูลทั้งหมด" : "เปิด–ปิดได้ทุกเมื่อ"}</small></span>
          </label>
          <div className="pet-safety-quick__fields" aria-label="ข้อมูลบน Public Safety QR">
            {fieldOptions.map((option) => {
              const selected = safety.publicFields[option.key];
              const copy = option.key === "features" ? safety.features : option.key === "approach" ? safety.approach : option.key === "emergency" ? safety.emergency : "";
              return (
                <div className={`pet-safety-quick__field${selected ? " is-selected" : ""}`} key={option.key}>
                  <label><input type="checkbox" checked={selected} disabled={isLost} onChange={() => toggleField(option.key)} /><span><strong>{option.label}</strong><small>{option.help}</small></span><span className="pet-safety-quick__field-state">{selected ? <><Check size={15} weight="bold" /> เปิด</> : <><EyeSlash size={15} weight="bold" /> ซ่อน</>}</span></label>
                  {selected && option.key !== "photo" ? <textarea rows={2} value={copy} disabled={isLost} aria-label={option.label} placeholder="เพิ่มข้อมูลสั้น ๆ" onChange={(event) => updateCopy(option.key, event.currentTarget.value)} /> : null}
                </div>
              );
            })}
          </div>
          <p className="pet-safety-quick__summary"><ShieldCheck size={17} weight="bold" /> เปิดอยู่ {enabledCount} รายการ · ข้อมูลสุขภาพและเอกสารยังไม่แสดง</p>
        </div>
      </div>
      <div className="pet-safety-quick__lost">
        <div><ShieldAlert size={22} weight="bold" /><span><strong>{isLost ? "Lost Mode กำลังเปิด" : "Lost Mode ปิดอยู่"}</strong><small>{isLost ? "QR ถาวรแสดงข้อมูลติดต่อและข้อมูลช่วยตามหาทั้งหมด" : "เมื่อเปิด จะขยายข้อมูลบน QR ถาวรเพื่อช่วยตามหาน้อง"}</small></span></div>
        <button className={`button ${isLost ? "button--dark" : "button--ghost"}`} type="button" onClick={toggleLostMode}>{isLost ? <><ShieldOff size={18} weight="bold" /> ปิด Lost Mode</> : <><ShieldAlert size={18} weight="bold" /> เปิด Lost Mode</>}</button>
      </div>
    </section>
  );
}
