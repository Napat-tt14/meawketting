"use client";

import { FormEvent, useEffect, useState } from "react";
import { petFromPublicSafetyId } from "../../../_prototype/safetyState";
import { ArrowLeft, CircleAlert, Flag, Send, ShieldCheck } from "../../../_components/icons";

const categories = ["ข้อมูลทำให้เข้าใจผิด", "เนื้อหาไม่ปลอดภัย", "การคุกคามหรือสแปม", "ปัญหา QR", "อื่น ๆ"];

export function AbuseReportScreen({ publicId }: { publicId: string }) {
  const [valid, setValid] = useState<boolean | null>(null);
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"form" | "error" | "success">("form");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setValid(Boolean(petFromPublicSafetyId(publicId))));
    return () => window.cancelAnimationFrame(frame);
  }, [publicId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category || new URLSearchParams(window.location.search).get("fixture") === "failure") {
      setStatus("error");
      return;
    }
    setStatus("success");
  }

  if (valid === null) return <ReportRecovery title="กำลังเปิดแบบรายงาน" message="ไม่ต้องเข้าสู่ระบบ" busy />;
  if (!valid) return <ReportRecovery title="รายงานจากลิงก์นี้ไม่ได้" message="ลิงก์ไม่ถูกต้อง และเราไม่เปิดเผยว่ามีข้อมูลสัตว์เลี้ยงรายการใดอยู่" />;
  if (status === "success") return <div className="abuse-report-page shell"><section className="lead-success" role="status"><ShieldCheck size={46} weight="bold" /><p className="consumer-kicker">PUB-008 · MOCK CONFIRMATION</p><h1>รับรายงานไว้ใน Prototype แล้ว</h1><p>ยังไม่มี moderation workflow, Platform Admin flow หรือ SLA จริง ข้อมูลที่ส่งเป็น local UI state เท่านั้น</p><a className="button button--primary" href={`/safety/${publicId}`}>กลับ Public Safety Page</a></section></div>;

  return (
    <div className="abuse-report-page shell">
      <a className="consumer-back" href={`/safety/${publicId}`}><ArrowLeft size={18} weight="bold" /> กลับ Public Safety Page</a>
      <form className="abuse-report-form" onSubmit={submit} noValidate>
        <header><Flag size={34} weight="bold" /><p className="consumer-kicker">PUB-008 · NO LOGIN REQUIRED</p><h1>รายงานปัญหาบนหน้าสาธารณะ</h1><p>ไม่ต้องใส่ข้อมูลประจำตัวของคุณ และยังไม่มี final moderation policy ใน Phase นี้</p></header>
        {status === "error" ? <div className="form-alert" role="alert" id="abuse-error"><CircleAlert size={22} weight="bold" /><div><strong>ยังส่งรายงานไม่ได้</strong><p>เลือกประเภทปัญหาแล้วลองอีกครั้ง รายละเอียดที่พิมพ์ไว้ยังอยู่ครบและยังไม่ได้ถูกแชร์</p></div></div> : null}
        <fieldset className="abuse-categories"><legend>ประเภทปัญหา <span>จำเป็น</span></legend>{categories.map((item) => <label key={item}><input type="radio" name="abuse-category" value={item} checked={category === item} onChange={() => setCategory(item)} /><span>{item}</span></label>)}</fieldset>
        <label className="safety-field"><span>รายละเอียดเพิ่มเติม (ไม่บังคับ)</span><textarea rows={5} value={details} aria-describedby={status === "error" ? "abuse-error" : undefined} onChange={(event) => setDetails(event.target.value)} /></label>
        <button className="button button--dark button--large" type="submit"><Send size={20} weight="bold" /> ส่งรายงานใน Prototype</button>
      </form>
    </div>
  );
}

function ReportRecovery({ title, message, busy = false }: { title: string; message: string; busy?: boolean }) {
  return <div className="abuse-report-page shell"><section className="public-recovery" role={busy ? "status" : "alert"} aria-busy={busy}><Flag size={42} weight="bold" /><p className="consumer-kicker">ABUSE REPORT</p><h1>{title}</h1><p>{message}</p><a className="button button--ghost" href="/">กลับ Meawketting</a></section></div>;
}
