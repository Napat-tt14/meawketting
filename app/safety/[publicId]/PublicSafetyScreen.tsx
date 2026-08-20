"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { ConsumerPet } from "../../_prototype/consumerPets";
import type { SafetyPrototypeState } from "../../_prototype/safetyState";
import { petFromPublicSafetyId, readSafetyPrototypeState } from "../../_prototype/safetyState";
import { CircleAlert, EyeSlash, Flag, MessageCircle, Send, ShieldAlert, ShieldCheck, ShieldOff } from "../../_components/icons";
import { SafetyProfileCard } from "../_components/SafetyProfileCard";

type PublicLoadState = "loading" | "ready" | "invalid" | "disabled" | "restricted";

export function PublicSafetyScreen({ publicId }: { publicId: string }) {
  const [loadState, setLoadState] = useState<PublicLoadState>("loading");
  const [pet, setPet] = useState<ConsumerPet | null>(null);
  const [safety, setSafety] = useState<SafetyPrototypeState | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contactStatus, setContactStatus] = useState<"idle" | "error" | "success">("idle");

  const load = useCallback(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("fixture") === "invalid") {
      setLoadState("invalid");
      return;
    }
    if (query.get("fixture") === "restricted") {
      setLoadState("restricted");
      return;
    }
    const found = petFromPublicSafetyId(publicId);
    if (!found) {
      setLoadState("invalid");
      return;
    }
    const stored = readSafetyPrototypeState(found);
    if (stored.status === "not-configured" || stored.status === "disabled") {
      setLoadState("disabled");
      return;
    }
    setPet(found);
    setSafety(stored);
    setLoadState("ready");
  }, [publicId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(load);
    const onStateChange = () => load();
    window.addEventListener("meawketting:safety-state", onStateChange);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("meawketting:safety-state", onStateChange);
    };
  }, [load]);

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim() || new URLSearchParams(window.location.search).get("fixture") === "contact-fail") {
      setContactStatus("error");
      return;
    }
    setContactStatus("success");
  }

  if (loadState === "loading") return <PublicRecovery icon="loading" title="กำลังตรวจ Public Safety link" message="หน้าสาธารณะนี้ไม่ต้องเข้าสู่ระบบ" />;
  if (loadState === "invalid") return <PublicRecovery title="ลิงก์นี้ไม่พร้อมใช้งาน" message="ลิงก์อาจไม่ถูกต้องหรือไม่มีให้ใช้งาน เราไม่แสดงชื่อ รูป หรือยืนยันว่ามีสัตว์เลี้ยงรายการใดอยู่" />;
  if (loadState === "disabled") return <PublicRecovery title="Safety Profile นี้ปิดอยู่" message="ข้อมูลเดิมถูกซ่อนทั้งหมดแล้ว หากพบสัตว์ที่ต้องการความช่วยเหลือ โปรดติดต่อบริการฉุกเฉินในพื้นที่ตามความเหมาะสม" />;
  if (loadState === "restricted") return <PublicRecovery title="หน้านี้ถูกจำกัดชั่วคราว" message="ระบบต้นแบบไม่แสดงข้อมูลระบุตัวขณะตรวจสอบรายงานการใช้งานที่ไม่เหมาะสม คุณยังสามารถกลับหน้าหลักได้อย่างปลอดภัย" />;
  if (!pet || !safety) return null;

  const isLost = safety.status === "lost";

  return (
    <div className={`public-safety-page shell${isLost ? " public-safety-page--lost" : ""}`}>
      <header className="public-safety-brand"><a href="/" aria-label="กลับหน้าแรก Meawketting"><ShieldCheck size={24} weight="bold" /> Meawketting Safety</a><span>Public browser · No login</span></header>
      <div className="public-safety-heading">
        <p className="consumer-kicker">{isLost ? "PUB-006 · PUBLIC LOST PET PAGE" : "PUB-005 · PUBLIC SAFETY PROFILE"}</p>
        <h1>{isLost ? "มีสัตว์เลี้ยงกำลังต้องการความช่วยเหลือ" : "ข้อมูลสำหรับช่วยดูแลอย่างปลอดภัย"}</h1>
        <p>{isLost ? "ดูข้อมูลระบุตัวและส่งเบาะแสโดยไม่ต้องสร้างบัญชี" : "เจ้าของเลือกเปิดเฉพาะข้อมูลที่จำเป็นบน Permanent Public Safety QR นี้"}</p>
      </div>
      <SafetyProfileCard pet={pet} state={safety} />

      <section className="public-primary-action" aria-labelledby="public-action-heading">
        {isLost ? <ShieldAlert size={30} weight="bold" /> : <MessageCircle size={30} weight="bold" />}
        <div><h2 id="public-action-heading">{isLost ? `พบหรือเห็น ${pet.name} ใช่ไหม` : "ติดต่อผู้ดูแลโดยไม่เปิดเบอร์ส่วนตัว"}</h2><p>{isLost ? "ส่งข้อความ รูป หรือบริเวณโดยประมาณให้ผู้ดูแลได้ใน prototype นี้" : "ข้อความนี้เป็น mediated contact concept เท่านั้น ยังไม่มีระบบส่งข้อความจริง"}</p></div>
        {isLost ? <a className="button button--dark button--large" href={`/safety/${publicId}/lead`}><Flag size={20} weight="bold" /> I found / saw this pet</a> : <button className="button button--primary button--large" type="button" aria-expanded={contactOpen} onClick={() => setContactOpen((open) => !open)}><MessageCircle size={20} weight="bold" /> Send a message</button>}
      </section>

      {!isLost && contactOpen ? (
        <form className="public-contact-form" onSubmit={submitContact} noValidate>
          <label htmlFor="guardian-message">ข้อความถึงผู้ดูแล <span>จำเป็น</span></label>
          <textarea id="guardian-message" rows={4} required value={message} aria-invalid={contactStatus === "error"} aria-describedby="guardian-contact-help" onChange={(event) => setMessage(event.target.value)} />
          <p id="guardian-contact-help">อย่าใส่ข้อมูลการเงินหรือข้อมูลส่วนตัวที่ไม่จำเป็น ข้อความยังอยู่หากการจำลองส่งไม่สำเร็จ</p>
          {contactStatus === "error" ? <p className="form-inline-error" role="alert"><CircleAlert size={18} weight="bold" /> ยังส่งไม่ได้ใน mock นี้ ข้อความของคุณยังอยู่ ลองแก้ข้อความแล้วส่งอีกครั้ง</p> : null}
          {contactStatus === "success" ? <p className="form-inline-success" role="status"><ShieldCheck size={18} weight="bold" /> รับข้อความไว้ใน UI prototype แล้ว ยังไม่มี SMS, email หรือ push จริง</p> : null}
          <button className="button button--primary" type="submit"><Send size={18} weight="bold" /> ส่งข้อความใน Prototype</button>
        </form>
      ) : null}

      <section className="public-privacy-note"><EyeSlash size={25} weight="bold" /><div><h2>ข้อมูลบางอย่างถูกซ่อนโดยตั้งใจ</h2><p>หน้านี้ไม่เปิดเบอร์โทรจริง ที่อยู่บ้าน ประวัติสุขภาพ เอกสาร private notes ข้อมูลชำระเงิน หรือ Business history</p></div></section>
      <footer className="public-safety-footer"><p><CircleAlert size={17} weight="bold" /> Public ID นี้เป็น fixture สำหรับ front-end prototype ไม่ใช่ production token หรือคำรับรองด้าน security</p><a href={`/safety/${publicId}/report`}><Flag size={17} weight="bold" /> Report abuse or QR problem</a></footer>
    </div>
  );
}

function PublicRecovery({ title, message, icon = "unavailable" }: { title: string; message: string; icon?: "loading" | "unavailable" }) {
  return (
    <div className="public-safety-page shell">
      <header className="public-safety-brand"><a href="/"><ShieldCheck size={24} weight="bold" /> Meawketting Safety</a><span>Public browser · No login</span></header>
      <section className="public-recovery" role={icon === "loading" ? "status" : "alert"} aria-busy={icon === "loading"}>
        {icon === "loading" ? <ShieldCheck size={42} weight="bold" /> : <ShieldOff size={42} weight="bold" />}
        <p className="consumer-kicker">PUBLIC SAFETY</p><h1>{title}</h1><p>{message}</p><a className="button button--ghost" href="/">กลับ Meawketting</a>
      </section>
    </div>
  );
}
