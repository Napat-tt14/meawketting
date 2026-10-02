"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BedDouble, Check, CheckCircle, PawPrint, Scissors, ShieldCheck, Storefront } from "../../_components/icons";
import { changeBusinessView } from "../_components/businessViewTransition";

const steps = ["ข้อมูลร้าน", "บริการของร้าน", "ตรวจสอบและเริ่มใช้"];
const services = [
  { value: "grooming", label: "อาบน้ำตัดขน", description: "จัดการคิวอาบน้ำและตัดขน", Icon: Scissors },
  { value: "hotel", label: "โรงแรมสัตว์เลี้ยง", description: "ดูแลการเข้าพักและห้องพัก", Icon: BedDouble },
  { value: "daycare", label: "เดย์แคร์", description: "รับฝากดูแลระหว่างวัน", Icon: PawPrint },
];

export function BusinessSetupScreen() {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "auth">("loading");
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState({ businessName: "", displayName: "", phone: "", branchName: "สาขาหลัก", email: "" });
  const [modules, setModules] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/business/register", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (response.status === 401) { if (active) window.location.replace("/business/login"); return; }
        if (!response.ok) throw new Error();
        const data = await response.json() as { registered: boolean };
        if (!active) return;
        if (data.registered) { window.location.replace("/business/home"); return; }
        setLoadState("ready");
      }).catch(() => { if (active) setLoadState("error"); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => { heading.current?.focus(); }, [step]);

  function moveTo(next: number) { changeBusinessView(() => { setMessage(""); setStep(next); }); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || loadState !== "ready") return;
    if (step === 0) {
      if (!details.businessName.trim() || !details.displayName.trim()) { setMessage("กรุณากรอกชื่อร้านและชื่อผู้ดูแลร้าน"); return; }
      moveTo(1); return;
    }
    if (step === 1) {
      if (!modules.length) { setMessage("เลือกบริการอย่างน้อย 1 รายการ เพื่อจัดพื้นที่ทำงานให้เหมาะกับร้าน"); return; }
      moveTo(2); return;
    }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/business/register", { method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ ...details, modules, confirmed }) });
      if (response.status === 401) { setLoadState("auth"); return; }
      if (!response.ok) {
        setMessage(response.status === 400 ? "ข้อมูลยังไม่ครบหรือไม่ถูกต้อง กรุณาย้อนกลับไปตรวจสอบ"
          : response.status === 403 || response.status === 409 ? "บัญชีนี้มีร้านหรือสิทธิ์อยู่แล้ว กรุณาเข้าสู่ระบบอีกครั้ง"
          : response.status === 429 ? "ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่"
          : "ยังสร้างร้านไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองอีกครั้ง");
        return;
      }
      window.location.assign("/business/home");
    } catch { setMessage("การเชื่อมต่อขัดข้อง ข้อมูลที่กรอกยังอยู่ คุณลองส่งอีกครั้งได้"); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/google/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error();
      window.location.assign("/business/login");
    } catch { setMessage("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง"); setBusy(false); }
  }

  return <section className="business-setup shell" aria-labelledby="setup-title">
    <header className="business-setup__header">
      <span className="business-setup__account"><CheckCircle size={18} /> เริ่มต้นพื้นที่ทำงานของคุณ</span>
      <h1 id="setup-title">ตั้งค่าร้านของคุณ</h1>
      <p>ข้อมูลเบื้องต้นเพียง 3 ขั้นตอน แก้ไขเพิ่มเติมได้ในภายหลัง</p>
    </header>
    <div className="business-setup__layout">
      <aside className="business-setup__guide">
        <ol className="business-setup__steps" aria-label="ขั้นตอนตั้งค่าร้าน">
          {steps.map((label, index) => <li key={label} className={index < step ? "is-complete" : ""} aria-current={step === index ? "step" : undefined}>
            <span className="business-setup__step-number">{index < step ? <Check size={18} /> : index + 1}</span>
            <span>{label}{index < step && <small>เรียบร้อยแล้ว</small>}</span>
          </li>)}
        </ol>
        <div className="business-setup__guide-note"><Storefront size={28} /><p>เริ่มจากสาขาแรก<br />แล้วค่อยเติบโตไปด้วยกัน</p></div>
        <button className="business-setup__logout" type="button" disabled={busy} onClick={() => { void logout(); }}>ออกจากระบบ</button>
      </aside>

      <div className="business-setup__card" aria-busy={loadState === "loading" || busy}>
        {loadState === "loading" && <div className="business-setup__loading" role="status"><Storefront size={32} /><p>กำลังตรวจสอบบัญชีของคุณ…</p></div>}
        {loadState === "error" && <div className="business-setup__loading"><h2>ยังเตรียมพื้นที่ทำงานไม่ได้</h2><p>กรุณาลองอีกครั้ง หรือลงชื่อเข้าใช้ด้วยบัญชีที่มีสิทธิ์</p><button className="button button--business" type="button" onClick={() => { setLoadState("loading"); setAttempt(value => value + 1); }}>ลองอีกครั้ง</button><a href="/business/login">กลับหน้าเข้าสู่ระบบ</a></div>}
        {loadState === "auth" && <div className="business-setup__loading" role="alert"><h2>การเข้าสู่ระบบหมดอายุ</h2><p>กรุณาเข้าสู่ระบบอีกครั้งเพื่อสร้างร้านให้เสร็จ</p><a className="button button--business" href="/business/login">เข้าสู่ระบบอีกครั้ง</a></div>}
        {loadState === "ready" && <form key={step} onSubmit={submit} className="business-setup__form">
          <fieldset disabled={busy}>
            <p className="business-setup__position">ขั้นตอน {step + 1} จาก 3</p>
            <h2 ref={heading} tabIndex={-1}>{step === 0 ? "มารู้จักร้านของคุณ" : step === 1 ? "ร้านของคุณดูแลแบบไหนบ้าง?" : "พร้อมเริ่มต้นแล้ว"}</h2>
            <p className="business-setup__description">{step === 0 ? "ใช้ข้อมูลนี้สำหรับร้านและสาขาแรกของคุณ" : step === 1 ? "เลือกได้มากกว่า 1 บริการ และปรับเพิ่มได้ภายหลัง" : "ตรวจสอบข้อมูลก่อนสร้างพื้นที่ทำงานของร้าน"}</p>

            {step === 0 && <div className="business-setup__fields">
              <label>ชื่อร้าน<input name="businessName" required maxLength={160} autoComplete="organization" value={details.businessName} placeholder="ชื่อที่ลูกค้ารู้จัก" onChange={event => setDetails({ ...details, businessName: event.target.value })} /></label>
              <label>ชื่อผู้ดูแลร้าน<input name="displayName" required maxLength={120} autoComplete="name" value={details.displayName} onChange={event => setDetails({ ...details, displayName: event.target.value })} /></label>
              <label>เบอร์ติดต่อร้าน<input name="phone" type="tel" required minLength={8} maxLength={30} pattern="\+?[0-9 \(\)\-]{8,30}" title="กรอกเบอร์โทร 8–30 ตัวอักษร ใช้ตัวเลข + เว้นวรรค วงเล็บ หรือขีด" autoComplete="tel" value={details.phone} placeholder="0812345678" onChange={event => setDetails({ ...details, phone: event.target.value })} /></label>
              <details className="business-setup__optional"><summary>ชื่อสาขาและอีเมลติดต่อเพิ่มเติม</summary>
                <label>ชื่อสาขาแรก<input name="branchName" required maxLength={160} value={details.branchName} onChange={event => setDetails({ ...details, branchName: event.target.value })} /></label>
                <label>อีเมลติดต่อร้าน (ไม่บังคับ)<input name="email" type="email" autoComplete="email" maxLength={254} value={details.email} onChange={event => setDetails({ ...details, email: event.target.value })} /></label>
              </details>
            </div>}

            {step === 1 && <div className="business-setup__services" role="group" aria-label="บริการของร้าน เลือกอย่างน้อย 1 รายการ" aria-describedby={message ? "setup-message" : undefined}>
              {services.map(({ value, label, description, Icon }) => <label key={value} className={`business-setup__service${modules.includes(value) ? " is-selected" : ""}`}>
                <span className="business-setup__service-icon"><Icon size={24} /></span><span><strong>{label}</strong><small>{description}</small></span>
                <input type="checkbox" name="modules" value={value} checked={modules.includes(value)} onChange={event => { setModules(event.target.checked ? [...modules, value] : modules.filter(module => module !== value)); setMessage(""); }} />
              </label>)}
            </div>}

            {step === 2 && <div className="business-setup__review">
              <div className="business-setup__shop"><span><Storefront size={28} /></span><div><strong>{details.businessName}</strong><p>{details.branchName}</p></div><button className="business-setup__edit" type="button" onClick={() => moveTo(0)}>แก้ไข</button></div>
              <dl><div><dt>ผู้ดูแลร้าน</dt><dd>{details.displayName}</dd></div><div><dt>เบอร์ติดต่อ</dt><dd>{details.phone}</dd></div>{details.email && <div><dt>อีเมลติดต่อ</dt><dd>{details.email}</dd></div>}<div><dt>บริการ</dt><dd>{services.filter(service => modules.includes(service.value)).map(service => service.label).join(" · ")} <button className="business-setup__edit" type="button" onClick={() => moveTo(1)}>แก้ไข</button></dd></div></dl>
              <p className="business-setup__notice"><ShieldCheck size={20} /><span>หลังเข้าระบบ ตั้งค่าวันเวลาเปิดบริการก่อนรับจองได้ที่เมนูตั้งค่าร้าน</span></p>
              <label className="business-setup__confirm"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>ฉันยืนยันว่าข้อมูลถูกต้อง และมีสิทธิ์สร้างและจัดการร้านนี้ในฐานะเจ้าของร้าน</span></label>
            </div>}

            {message && <p id="setup-message" className="business-setup__error" role="alert">{message}{step === 2 && <a href="/business/login">กลับหน้าเข้าสู่ระบบ</a>}</p>}
            <div className="business-setup__actions">
              {step > 0 ? <button className="button button--business-ghost" type="button" onClick={() => moveTo(step - 1)}><ArrowLeft size={18} /> ย้อนกลับ</button> : <span>แก้ไขข้อมูลได้ภายหลัง</span>}
              <button className="button button--business" type="submit">{busy ? "กำลังสร้างร้าน…" : step === 2 ? "ยืนยันและเข้าสู่ระบบ" : "ถัดไป"}{!busy && <ArrowRight size={18} />}</button>
            </div>
          </fieldset>
        </form>}
        {message && loadState !== "ready" && <p className="business-setup__error" role="alert">{message}</p>}
      </div>
    </div>
  </section>;
}
