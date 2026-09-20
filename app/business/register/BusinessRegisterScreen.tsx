"use client";
import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle, Google, PawPrint, ShieldCheck, Sparkle, Storefront } from "../../_components/icons";

export function BusinessRegisterScreen() {
  const [state, setState] = useState<"loading" | "identity" | "details" | "existing" | "error" | "done">("loading");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/business/register", { credentials: "same-origin", cache: "no-store" }).then(async response => {
      if (response.status === 401) { if (active) setState("identity"); return; }
      if (!response.ok) throw new Error();
      const data = await response.json() as { registered: boolean };
      if (active) setState(data.registered ? "existing" : "details");
    }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [attempt]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/business/register", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({
        displayName: form.get("displayName"), businessName: form.get("businessName"), branchName: form.get("branchName"),
        phone: form.get("phone"), email: form.get("email"), modules: form.getAll("modules"), confirmed: form.get("confirmed") === "on",
      }) });
      if (response.status === 401) { setMessage("การยืนยันตัวตนหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง"); return; }
      if (!response.ok) {
        setMessage(response.status === 400 ? "ตรวจสอบข้อมูลให้ครบ และเลือกบริการอย่างน้อย 1 รายการ" : response.status === 409 || response.status === 403 ? "บัญชีนี้มีข้อมูลร้านหรือสิทธิ์อยู่แล้ว กรุณาเข้าสู่พื้นที่ทำงานของคุณ" : "ยังสร้างร้านไม่สำเร็จ กรุณาลองส่งข้อมูลเดิมอีกครั้ง"); return;
      }
      setState("done");
    } catch { setMessage("การเชื่อมต่อขัดข้อง คุณลองส่งข้อมูลเดิมอีกครั้งได้โดยไม่สร้างร้านซ้ำ"); }
    finally { setBusy(false); }
  }
  return <section className="business-register shell" aria-labelledby="register-title">
    <div className="business-register__intro">
      <span className="business-register__eyebrow">MEAWKETTING FOR BUSINESS</span>
      <h1 id="register-title">เริ่มต้นพื้นที่ทำงาน<br />สำหรับร้านของคุณ</h1>
      <p>จัดการร้านให้เบาลง แล้วมีเวลาใส่ใจแขกตัวน้อย<br />ตั้งแต่วันแรกที่เปิดประตูต้อนรับ</p>
      <div className="business-register__visual">
        <div className="business-register__visual-orbit" aria-hidden="true" />
        <Image
          className="business-register__illustration"
          src="/images/business/business-register-welcome.png"
          alt="ภาพประกอบเจ้าของร้านในผ้ากันเปื้อนสีเหลืองยืนต้อนรับพร้อมแมวและสุนัขในร้านดูแลสัตว์เลี้ยง"
          width={1536}
          height={1024}
          sizes="(max-width: 800px) 92vw, 48vw"
          priority
          unoptimized
        />
        <span className="business-register__visual-tag business-register__visual-tag--top"><Sparkle size={15} /> เริ่มจากร้านของคุณ</span>
        <span className="business-register__visual-tag business-register__visual-tag--bottom"><PawPrint size={15} /> ดูแลดีตั้งแต่วันแรก</span>
      </div>
      <div className="business-register__proof">
        <span className="business-login__icon"><Storefront size={24} /></span>
        <div><strong>ร้านของคุณ ทุกการดูแล ในที่เดียว</strong><span>เริ่มจากสาขาแรก แล้วค่อยเติบโตไปด้วยกัน</span></div>
      </div>
      <div className="business-register__trust"><span><ShieldCheck size={20} /> ข้อมูลร้านเข้าถึงได้เฉพาะผู้ที่มีสิทธิ์</span><span><CheckCircle size={20} /> เริ่มต้นด้วยข้อมูลที่คุณควบคุม</span></div>
    </div>
    <div className="business-register__card">
      <ol className="business-register__steps" aria-label="ขั้นตอนสมัคร">
        {["ยืนยันตัวตน", "ข้อมูลร้าน", "พร้อมเริ่มต้น"].map((label, index) => <li key={label} aria-current={(state === "done" ? 2 : state === "details" ? 1 : 0) === index ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}
      </ol>
      {state === "loading" && <p role="status">กำลังตรวจสอบการเข้าสู่ระบบ…</p>}
      {state === "identity" && <div className="business-register__identity">
        <h2>สมัครใช้งานสำหรับธุรกิจ</h2><p>เลือกบัญชีที่คุณจะใช้เข้าจัดการร้าน</p>
        <a className="button button--business-google button--large" href="/api/auth/google/start"><Google size={20} />ดำเนินการต่อด้วย Google</a>
        <a className="button button--business-ghost button--large" href="/api/auth/line/start">ดำเนินการต่อด้วย LINE</a>
        <small>ยืนยันตัวตนก่อน จากนั้นกรอกข้อมูลและยืนยันสร้างร้านด้วยตัวคุณเอง</small>
        <p>มีร้านอยู่แล้ว? <a href="/business/login">เข้าสู่ระบบ</a></p>
      </div>}
      {state === "details" && <form onSubmit={submit} className="business-register__form" aria-busy={busy}>
        <h2>มารู้จักร้านของคุณ</h2><p>ข้อมูลนี้ใช้สร้างร้านและสาขาแรก แก้ไขภายหลังได้</p>
        <fieldset disabled={busy}>
          <label>ชื่อผู้ดูแลร้าน<input name="displayName" autoComplete="name" required maxLength={120} /></label>
          <label>ชื่อร้าน<input name="businessName" autoComplete="organization" required maxLength={160} placeholder="ชื่อที่ลูกค้ารู้จัก" /></label>
          <label>ชื่อสาขาแรก<input name="branchName" required maxLength={160} defaultValue="สาขาหลัก" /></label>
          <div className="business-register__fields">
            <label>เบอร์ติดต่อร้าน<input name="phone" type="tel" autoComplete="tel" required minLength={8} maxLength={30} /></label>
            <label>อีเมลติดต่อ (ไม่บังคับ)<input name="email" type="email" autoComplete="email" maxLength={254} /></label>
          </div>
          <fieldset className="business-register__services"><legend>บริการของร้าน (เลือกอย่างน้อย 1 รายการ)</legend>
            {[["grooming","อาบน้ำตัดขน"],["hotel","โรงแรมสัตว์เลี้ยง"],["daycare","เดย์แคร์"]].map(([value,label]) => <label key={value}><input type="checkbox" name="modules" value={value} />{label}</label>)}
          </fieldset>
          <p className="business-register__note">หลังสร้างร้าน ให้ตั้งค่าวันเวลาเปิดบริการก่อนรับจอง โดยใช้เขตเวลาประเทศไทย</p>
          <label className="business-register__confirmation"><input type="checkbox" name="confirmed" required /><span>ฉันยืนยันว่าข้อมูลถูกต้อง และฉันมีสิทธิ์สร้างและจัดการร้านนี้ในฐานะเจ้าของร้าน</span></label>
          <button className="button button--business button--large" type="submit">{busy ? "กำลังสร้างร้าน…" : "ยืนยันและสร้างร้าน"}<ArrowRight size={18} /></button>
        </fieldset>
        {message && <div role="alert"><p>{message}</p><a href="/business/login">เข้าสู่ระบบ</a></div>}
      </form>}
      {state === "existing" && <><h2>บัญชีนี้เชื่อมกับร้านแล้ว</h2><p>ไปยังพื้นที่ทำงานเพื่อใช้งานตามสิทธิ์ของคุณ หากเข้าไม่ได้ กรุณาติดต่อผู้ดูแลร้าน</p><a className="button button--business" href="/business/home">ไปยังพื้นที่ทำงาน</a></>}
      {state === "done" && <><span className="business-login__icon"><Storefront size={30} /></span><h2>พื้นที่ของร้านพร้อมแล้ว</h2><p>ตั้งค่าวันเวลาเปิดบริการของสาขาเป็นขั้นตอนถัดไป แล้วเริ่มจัดการงานของร้านได้เลย</p><a className="button button--business" href="/business/settings?section=branches">ตั้งค่าร้านของคุณ <ArrowRight size={18} /></a></>}
      {state === "error" && <><h2>ยังเริ่มสมัครไม่ได้</h2><p role="alert">ระบบยืนยันตัวตนยังไม่พร้อมใช้งาน หรือการเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง</p><button className="button button--business" onClick={() => { setState("loading"); setAttempt(a => a + 1); }}>ลองอีกครั้ง</button><a href="/business/login">กลับหน้าเข้าสู่ระบบ</a></>}
    </div>
  </section>;
}
