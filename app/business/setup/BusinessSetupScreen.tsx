"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, BedDouble, Check, CheckCircle, LogOut, PawPrint, Scissors, ShieldCheck, Storefront } from "../../_components/icons";
import { changeBusinessView } from "../_components/businessViewTransition";

const steps = [
  { label: "ชื่อร้าน", title: "ร้านของคุณชื่ออะไร?", description: "เริ่มจากชื่อที่ลูกค้ารู้จัก แล้วเราจะเตรียมพื้นที่ให้ร้านคุณ", image: "pet-hotel-transparent.png" },
  { label: "ผู้ดูแลร้าน", title: "ใครจะดูแลบ้านหลังนี้?", description: "บอกชื่อผู้ดูแลและเบอร์ติดต่อร้านให้เรารู้จักอีกนิด", image: "pet-owner-clay.png" },
  { label: "บริการ", title: "ร้านคุณดูแลแบบไหนบ้าง?", description: "เลือกบริการที่ใช่ได้มากกว่า 1 อย่าง เพิ่มเติมภายหลังได้เสมอ", image: null },
  { label: "ตรวจสอบและเริ่มใช้", title: "พื้นที่ของร้านคุณพร้อมแล้ว", description: "ตรวจสอบอีกนิด แล้วไปเริ่มดูแลเพื่อนตัวเล็กด้วยกัน", image: "pet-hotel-transparent.png" },
];
const services = [
  { value: "grooming", label: "อาบน้ำตัดขน", description: "จัดคิวให้ทุกตัวกลับบ้านแบบสดใส", image: "pet-grooming-transparent.png", Icon: Scissors },
  { value: "hotel", label: "โรงแรมสัตว์เลี้ยง", description: "ดูแลวันพักผ่อนเหมือนอยู่บ้าน", image: "pet-hotel-transparent.png", Icon: BedDouble },
  { value: "daycare", label: "เดย์แคร์", description: "พื้นที่เล่นและดูแลระหว่างวัน", image: "pet-daycare-transparent.png", Icon: PawPrint },
];

export function BusinessSetupScreen() {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "auth">("loading");
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [motion, setMotion] = useState("enter");
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

  useEffect(() => {
    const title = heading.current;
    if (!title) return;
    title.focus({ preventScroll: true });
    const stage = title.closest(".business-setup__card");
    // Returning from a long mobile step should keep the illustration in view too.
    if (stage && (stage.getBoundingClientRect().top < 88 || title.getBoundingClientRect().bottom > window.innerHeight - 40)) {
      stage.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [step, loadState]);

  function moveTo(next: number) {
    const nativeMotion = !!document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    changeBusinessView(() => {
      setDirection(next > step ? "forward" : "backward");
      setMotion(nativeMotion ? "native" : "enter");
      setMessage("");
      setStep(next);
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || loadState !== "ready") return;
    if (step === 0) {
      if (!details.businessName.trim() || !details.branchName.trim()) { setMessage("กรุณากรอกชื่อร้านและชื่อสาขา"); return; }
      moveTo(1); return;
    }
    if (step === 1) {
      if (!details.displayName.trim()) { setMessage("กรุณากรอกชื่อผู้ดูแลร้าน"); return; }
      moveTo(2); return;
    }
    if (step === 2) {
      if (!modules.length) { setMessage("เลือกบริการอย่างน้อย 1 รายการ เพื่อจัดพื้นที่ทำงานให้เหมาะกับร้าน"); return; }
      moveTo(3); return;
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

  const current = steps[step];
  const selectedServices = services.filter(service => modules.includes(service.value));

  return <section className="business-setup shell" data-step={step} data-direction={direction} data-motion={motion} aria-labelledby="setup-title">
    <div className="business-setup__backdrop" aria-hidden="true"><span /><span /><PawPrint size={32} /><PawPrint size={22} /></div>
    <header className="business-setup__header">
      <span className="business-setup__account">{loadState === "ready" ? <><CheckCircle size={16} /> บัญชีพร้อมแล้ว มาเริ่มกันเลย</> : <><Storefront size={16} /> เตรียมพื้นที่ทำงานของร้านคุณ</>}</span>
      <h1 id="setup-title">ตั้งค่าร้านของคุณ</h1>
      <p>4 ช่วงสั้น ๆ เพื่อเตรียมพื้นที่ทำงานให้ร้านคุณ</p>
    </header>

    <ol className="business-setup__steps" aria-label="ขั้นตอนตั้งค่าร้าน">
      {steps.map(({ label }, index) => <li key={label} className={index < step ? "is-complete" : ""} aria-current={step === index ? "step" : undefined}>
        {index < step && loadState === "ready" ? <button type="button" disabled={busy} onClick={() => moveTo(index)} aria-label={`กลับไปแก้ไข${label}`}><span className="business-setup__step-number"><Check size={16} /></span><span>{label}</span></button>
          : <span className="business-setup__step-label"><span className="business-setup__step-number">{index + 1}</span><span>{label}</span></span>}
      </li>)}
    </ol>

    <div className="business-setup__card" aria-busy={loadState === "loading" || busy}>
      {loadState === "loading" && <div className="business-setup__loading" role="status"><span className="business-setup__spinner" /><p>กำลังตรวจสอบบัญชีของคุณ…</p></div>}
      {loadState === "error" && <div className="business-setup__loading"><Storefront size={36} /><h2>ยังเตรียมพื้นที่ทำงานไม่ได้</h2><p>กรุณาลองอีกครั้ง หรือลงชื่อเข้าใช้ด้วยบัญชีที่มีสิทธิ์</p><button className="button button--business" type="button" onClick={() => { setLoadState("loading"); setAttempt(value => value + 1); }}>ลองอีกครั้ง</button><a href="/business/login">กลับหน้าเข้าสู่ระบบ</a></div>}
      {loadState === "auth" && <div className="business-setup__loading" role="alert"><h2>การเข้าสู่ระบบหมดอายุ</h2><p>กรุณาเข้าสู่ระบบอีกครั้งเพื่อสร้างร้านให้เสร็จ</p><a className="button button--business" href="/business/login">เข้าสู่ระบบอีกครั้ง</a></div>}
      {loadState === "ready" && <form key={step} onSubmit={submit} className="business-setup__form">
        <fieldset disabled={busy}>
          <div className="business-setup__scene" aria-hidden="true">
            {current.image ? <Image className="business-setup__illustration" src={`/images/landing/${current.image}`} alt="" width={1200} height={800} sizes="280px" priority unoptimized /> : <span className="business-setup__scene-icon"><PawPrint size={36} /></span>}
            <span className="business-setup__scene-paw"><PawPrint size={22} /></span><span className="business-setup__scene-dot" />
            {step === 0 && <span className="business-setup__scene-caption"><Storefront size={15} /><span>{details.businessName || "บ้านหลังใหม่ของร้านคุณ"}</span></span>}
            {step === 1 && <span className="business-setup__scene-caption"><CheckCircle size={15} /> เติบโตไปด้วยกัน</span>}
            {step === 3 && <span className="business-setup__scene-caption"><CheckCircle size={15} /> อีกเพียงก้าวเดียว</span>}
          </div>
          <div className="business-setup__intro">
            <p className="business-setup__position">ขั้นตอน {step + 1} จาก {steps.length} <span>·</span> {current.label}</p>
            <h2 ref={heading} tabIndex={-1}>{current.title}</h2>
            <p className="business-setup__description">{current.description}</p>
          </div>

          <div className="business-setup__body">
            {step === 0 && <div className="business-setup__fields business-setup__fields--shop">
              <label htmlFor="setup-business-name">ชื่อร้านของคุณ</label>
              <input id="setup-business-name" name="businessName" required maxLength={160} autoComplete="organization" value={details.businessName} placeholder="เช่น บ้านอุ่นใจ Pet Care" onChange={event => setDetails({ ...details, businessName: event.target.value })} />
              <p className="business-setup__hint">ใช้ภาษาไทยหรืออังกฤษก็ได้ แก้ไขได้ภายหลัง</p>
              <details className="business-setup__optional"><summary>มีชื่อสาขา? เพิ่มได้ที่นี่</summary>
                <label>ชื่อสาขาแรก<input name="branchName" required maxLength={160} value={details.branchName} onChange={event => setDetails({ ...details, branchName: event.target.value })} /></label>
              </details>
            </div>}

            {step === 1 && <div className="business-setup__fields business-setup__fields--contact">
              <div className="business-setup__contact-row">
                <label>ชื่อผู้ดูแลร้าน<input name="displayName" required maxLength={120} autoComplete="name" value={details.displayName} placeholder="ชื่อที่ให้ทีมเรียกคุณ" onChange={event => setDetails({ ...details, displayName: event.target.value })} /></label>
                <label>เบอร์ติดต่อร้าน<input name="phone" type="tel" required minLength={8} maxLength={30} pattern="\+?[0-9 \(\)\-]{8,30}" title="กรอกเบอร์โทร 8–30 ตัวอักษร ใช้ตัวเลข + เว้นวรรค วงเล็บ หรือขีด" autoComplete="tel" value={details.phone} placeholder="0812345678" onChange={event => setDetails({ ...details, phone: event.target.value })} /></label>
              </div>
              <details className="business-setup__optional"><summary>เพิ่มอีเมลติดต่อร้าน (ไม่บังคับ)</summary>
                <label>อีเมลติดต่อร้าน<input name="email" type="email" autoComplete="email" maxLength={254} value={details.email} placeholder="hello@yourshop.com" onChange={event => setDetails({ ...details, email: event.target.value })} /></label>
              </details>
            </div>}

            {step === 2 && <>
              <div className="business-setup__services" role="group" aria-label="บริการของร้าน เลือกอย่างน้อย 1 รายการ" aria-describedby={message ? "setup-message" : undefined}>
                {services.map(({ value, label, description, image, Icon }) => <label key={value} className={`business-setup__service${modules.includes(value) ? " is-selected" : ""}`}>
                  <input type="checkbox" name="modules" value={value} aria-label={label} checked={modules.includes(value)} onChange={event => { setModules(event.target.checked ? [...modules, value] : modules.filter(module => module !== value)); setMessage(""); }} />
                  <span className="business-setup__service-art"><Image src={`/images/landing/${image}`} alt="" width={1200} height={800} sizes="(max-width: 600px) 120px, 220px" unoptimized /></span>
                  <strong>{label}</strong><small>{description}</small>
                  <span className="business-setup__service-choice"><Icon size={16} />{modules.includes(value) ? "เลือกแล้ว" : "เลือกบริการนี้"}{modules.includes(value) && <Check size={15} />}</span>
                </label>)}
              </div>
              <p className="business-setup__selection" role="status">{modules.length ? `เลือกแล้ว ${modules.length} บริการ · เราจะจัดพื้นที่ทำงานให้เหมาะกับร้านคุณ` : "เลือกอย่างน้อย 1 บริการเพื่อไปต่อ"}</p>
            </>}

            {step === 3 && <div className="business-setup__review">
              <div className="business-setup__workspace">
                <div className="business-setup__shop"><span><Storefront size={26} /></span><div><small>พื้นที่ทำงานของคุณ</small><strong>{details.businessName}</strong><p>{details.branchName}</p></div><button className="business-setup__edit" type="button" aria-label="แก้ไขข้อมูลร้าน" onClick={() => moveTo(0)}>แก้ไข</button></div>
                <div className="business-setup__review-contact"><dl><div><dt>ผู้ดูแลร้าน</dt><dd>{details.displayName}</dd></div><div><dt>เบอร์ติดต่อ</dt><dd>{details.phone}</dd></div>{details.email && <div><dt>อีเมลติดต่อ</dt><dd>{details.email}</dd></div>}</dl><button className="business-setup__edit" type="button" aria-label="แก้ไขผู้ดูแลและช่องทางติดต่อ" onClick={() => moveTo(1)}>แก้ไข</button></div>
                <div className="business-setup__review-services"><div>{selectedServices.map(({ value, label, Icon }) => <span key={value}><Icon size={15} />{label}</span>)}</div><button className="business-setup__edit" type="button" aria-label="แก้ไขบริการ" onClick={() => moveTo(2)}>แก้ไข</button></div>
              </div>
              <label className="business-setup__confirm"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>ฉันยืนยันว่าข้อมูลถูกต้อง และมีสิทธิ์สร้างและจัดการร้านนี้ในฐานะเจ้าของร้าน</span></label>
              <p className="business-setup__notice"><ShieldCheck size={17} /><span>หลังเข้าระบบ ตั้งค่าวันเวลาเปิดบริการก่อนรับจองได้ที่เมนูตั้งค่าร้าน</span></p>
            </div>}
          </div>

          {message && <p id="setup-message" className="business-setup__error" role="alert">{message}</p>}
          <div className="business-setup__actions">
            {step > 0 && <button className="button button--business-ghost" type="button" onClick={() => moveTo(step - 1)}><ArrowLeft size={18} /> ย้อนกลับ</button>}
            <button className="button button--business business-setup__next" type="submit">{busy ? <><span className="business-setup__spinner" /> กำลังสร้างร้าน…</> : <>{step === 3 ? "ยืนยันและเข้าสู่ระบบ" : step === 0 ? "เริ่มตั้งค่าร้าน" : "ถัดไป"}<ArrowRight size={19} /></>}</button>
          </div>
        </fieldset>
      </form>}
      {message && loadState !== "ready" && <p className="business-setup__error" role="alert">{message}</p>}
    </div>
    <footer className="business-setup__footer"><span><ShieldCheck size={15} /> ข้อมูลแก้ไขเพิ่มเติมได้ภายหลัง</span><button className="business-setup__logout" type="button" disabled={busy} onClick={() => { void logout(); }}><LogOut size={15} /> ออกจากระบบ</button></footer>
  </section>;
}
