"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { ConsumerPet } from "../../../_prototype/consumerPets";
import type { SafetyPrototypeState } from "../../../_prototype/safetyState";
import { petFromPublicSafetyId, readSafetyPrototypeState, writeSafetyPrototypeState } from "../../../_prototype/safetyState";
import { ArrowLeft, CircleAlert, FileImage, Flag, MapPin, Send, ShieldCheck, TriangleAlert } from "../../../_components/icons";

type LeadPageState = "loading" | "form" | "success" | "unavailable" | "restricted";

export function FinderLeadScreen({ publicId }: { publicId: string }) {
  const [pageState, setPageState] = useState<LeadPageState>("loading");
  const [pet, setPet] = useState<ConsumerPet | null>(null);
  const [safety, setSafety] = useState<SafetyPrototypeState | null>(null);
  const [message, setMessage] = useState("");
  const [area, setArea] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("fixture") === "restricted") {
      setPageState("restricted");
      return;
    }
    const found = petFromPublicSafetyId(publicId);
    if (!found) {
      setPageState("unavailable");
      return;
    }
    const stored = readSafetyPrototypeState(found);
    if (stored.status !== "lost" || stored.lostCase?.phase !== "active") {
      setPageState("unavailable");
      return;
    }
    setPet(found);
    setSafety(stored);
    setPageState("form");
  }, [publicId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(load);
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      setError("เขียนสิ่งที่พบอย่างน้อยหนึ่งข้อความ ข้อมูลอื่นที่กรอกไว้ยังอยู่ครบ");
      return;
    }
    if (new URLSearchParams(window.location.search).get("fixture") === "network-fail") {
      setError("การจำลองส่งไม่สำเร็จ ข้อความ บริเวณ และชื่อไฟล์ยังอยู่ ลองส่งอีกครั้งเมื่อพร้อม");
      return;
    }
    if (!safety?.lostCase) return;
    const lead = {
      id: `lead-${Date.now()}`,
      receivedAt: new Date().toISOString(),
      message: message.trim(),
      area: area.trim(),
      photoName,
      trust: "new" as const,
    };
    writeSafetyPrototypeState({ ...safety, lostCase: { ...safety.lostCase, leads: [lead, ...safety.lostCase.leads] } });
    setError("");
    setPageState("success");
  }

  if (pageState === "loading") return <LeadRecovery title="กำลังเปิดแบบส่งเบาะแส" message="ไม่ต้องมีบัญชีและยังไม่มีการส่งข้อมูลจริง" busy />;
  if (pageState === "unavailable") return <LeadRecovery title="ส่งเบาะแสจากลิงก์นี้ไม่ได้" message="ลิงก์อาจไม่ถูกต้องหรือ Lost Mode ปิดแล้ว เราไม่แสดงข้อมูลระบุตัวของสัตว์เลี้ยงจากสถานะนี้" />;
  if (pageState === "restricted") return <LeadRecovery title="จำกัดการส่งชั่วคราว" message="การส่งถูกจำกัดใน abuse/spam fixture นี้ ข้อมูลที่ยังไม่ได้ส่งไม่ได้ถูกแชร์ไปยังผู้ดูแล" icon="warning" />;
  if (pageState === "success" && pet) return (
    <div className="finder-lead-page shell"><section className="lead-success" role="status"><ShieldCheck size={46} weight="bold" /><p className="consumer-kicker">SAFE-008 · RECEIVED IN PROTOTYPE</p><h1>ขอบคุณที่ช่วย {pet.name}</h1><p>เบาะแสถูกเพิ่มใน owner dashboard ของแท็บนี้แล้ว นี่ไม่ใช่การยืนยัน SMS, email หรือ push จริง</p><a className="button button--primary" href={`/safety/${publicId}`}>กลับ Public Lost Page</a></section></div>
  );
  if (!pet || !safety) return null;

  return (
    <div className="finder-lead-page shell">
      <a className="consumer-back" href={`/safety/${publicId}`}><ArrowLeft size={18} weight="bold" /> กลับหน้า Lost ของ {pet.name}</a>
      <form className="finder-lead-form" onSubmit={submit} noValidate>
        <header><Flag size={34} weight="bold" /><p className="consumer-kicker">SAFE-008 · NO ACCOUNT REQUIRED</p><h1>บอกผู้ดูแลว่าคุณพบอะไร</h1><p>ส่งเท่าที่จำเป็น ไม่ต้องใส่ชื่อ เบอร์โทร หรือข้อมูลประจำตัวของคุณ</p></header>
        {error ? <div className="form-alert" role="alert" id="lead-error"><CircleAlert size={22} weight="bold" /><div><strong>ยังส่งเบาะแสไม่ได้</strong><p>{error}</p></div></div> : null}
        <label className="safety-field"><span>ข้อความถึงผู้ดูแล <b>จำเป็น</b></span><textarea rows={5} required value={message} aria-invalid={Boolean(error)} aria-describedby={error ? "lead-error" : "lead-privacy-help"} placeholder="เช่น เห็นสัตว์ลักษณะคล้ายกันเมื่อประมาณ 17:00 น." onChange={(event) => setMessage(event.target.value)} /></label>
        <label className="safety-field"><span><MapPin size={18} weight="bold" /> บริเวณโดยประมาณ (ไม่บังคับ)</span><input type="text" value={area} placeholder="เช่น ฝั่งประตูทิศเหนือของสวน" onChange={(event) => setArea(event.target.value)} /><small>หลีกเลี่ยงที่อยู่บ้านและ precise GPS</small></label>
        <label className="lost-photo-field"><FileImage size={26} weight="bold" /><span><strong>รูปประกอบ (ไม่บังคับ)</strong><small>{photoName ?? "JPG, PNG หรือ WebP · prototype เก็บเฉพาะชื่อไฟล์"}</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? null)} /></label>
        <p className="finder-privacy-help" id="lead-privacy-help"><ShieldCheck size={19} weight="bold" /> ข้อมูลนี้จะแสดงเฉพาะใน owner-side prototype ผู้พบคนอื่นจะไม่เห็นข้อความนี้</p>
        <button className="button button--dark button--large" type="submit"><Send size={20} weight="bold" /> Send Finder Lead</button>
      </form>
    </div>
  );
}

function LeadRecovery({ title, message, busy = false, icon = "default" }: { title: string; message: string; busy?: boolean; icon?: "default" | "warning" }) {
  return <div className="finder-lead-page shell"><section className="public-recovery" role={busy ? "status" : "alert"} aria-busy={busy}>{icon === "warning" ? <TriangleAlert size={42} weight="bold" /> : <Flag size={42} weight="bold" />}<p className="consumer-kicker">FINDER LEAD</p><h1>{title}</h1><p>{message}</p><a className="button button--ghost" href="/">กลับ Meawketting</a></section></div>;
}
