"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowRight, CheckCircle, Eye, EyeSlash, Google, LockKey, MessageCircle, PawPrint, ShieldCheck } from "../../_components/icons";
import { changeBusinessView } from "./businessViewTransition";

export function BusinessAuthScreen({ mode }: { mode: "login" | "register" }) {
  const signup = mode === "register";
  const queryError = useSearchParams().get("error");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { if (confirmationEmail) heading.current?.focus(); }, [confirmationEmail]);

  useEffect(() => {
    let active = true;
    void fetch("/api/business/register", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (!response.ok) return;
        const data = await response.json() as { registered: boolean };
        if (active) window.location.replace(data.registered ? "/business/home" : "/business/setup");
      }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (signup && password.length < 8) { setMessage("กรุณาใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร"); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/auth/email/${mode}`, { method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json() as { redirectTo?: string; confirmationRequired?: boolean; error?: string };
      if (!response.ok) {
        setMessage(response.status === 429 ? "ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่"
          : data.error === "EMAIL_NOT_CONFIRMED" ? "กรุณายืนยันอีเมลจากลิงก์ที่ได้รับ แล้วเข้าสู่ระบบอีกครั้ง"
          : response.status === 501 ? "ช่องทางเข้าสู่ระบบยังไม่พร้อมใช้งาน กรุณาลองอีกครั้งภายหลัง"
          : response.status === 403 ? "บัญชีนี้ยังไม่มีสิทธิ์เข้าร้าน กรุณาติดต่อผู้ดูแลร้าน"
          : response.status >= 500 ? "การเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง"
          : signup ? "สมัครไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน หรือลองเข้าสู่ระบบหากมีบัญชีแล้ว"
          : "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง");
        return;
      }
      if (data.confirmationRequired) { changeBusinessView(() => setConfirmationEmail(email)); return; }
      if (data.redirectTo !== "/business/setup" && data.redirectTo !== "/business/home") throw new Error();
      window.location.assign(data.redirectTo);
    } catch { setMessage("การเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง"); }
    finally { setBusy(false); }
  }

  const error = message || (queryError ? queryError === "origin-mismatch"
    ? "ที่อยู่เว็บนี้ยังไม่รองรับการเข้าสู่ระบบ กรุณาเปิดจากที่อยู่หลักของระบบ"
    : queryError === "not-configured"
    ? "ช่องทางเข้าสู่ระบบยังไม่พร้อมใช้งาน กรุณาลองอีกครั้งภายหลัง"
    : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง หรือติดต่อผู้ดูแลร้านหากสิทธิ์ถูกระงับ" : "");

  return <section className="business-auth shell" aria-labelledby="business-auth-title">
    <aside className="business-auth__story" aria-label="Meawketting สำหรับธุรกิจ">
      <span className="business-auth__eyebrow"><PawPrint size={18} /> MEAWKETTING BUSINESS</span>
      <h2>{signup ? <>เริ่มต้นง่าย ๆ<br />ให้ร้านมีเวลา<span>ดูแลมากขึ้น</span></> : <>ทุกการดูแลที่ดี<br />เริ่มต้น<span>ที่ร้านของคุณ</span></>}</h2>
      <p>{signup ? "สร้างบัญชีก่อน แล้วค่อยเล่าเรื่องร้านของคุณให้เราฟังทีละนิด" : "การจอง งานบริการ และทีมของคุณ พร้อมให้กลับมาดูแลต่อในที่เดียว"}</p>
      <div className="business-auth__art">
        <Image src={`/images/business/business-${signup ? "register" : "login"}-welcome.png`} alt="" width={1536} height={1024} sizes="(max-width: 767px) 0px, 45vw" priority unoptimized />
      </div>
      <div className="business-auth__footnote"><ShieldCheck size={20} /><span>พื้นที่สำหรับร้านและทีมดูแลสัตว์เลี้ยง</span></div>
    </aside>

    <div className="business-auth__card">
      <div className="business-auth__mark"><PawPrint size={28} /></div>
      <p className="business-auth__welcome">{signup ? "ยินดีต้อนรับสู่ Meawketting" : "ยินดีต้อนรับกลับมา"}</p>
      <h1 id="business-auth-title" ref={heading} tabIndex={-1}>{confirmationEmail ? "ยืนยันอีเมลของคุณ" : signup ? "สร้างบัญชีของคุณ" : "เข้าสู่ระบบ"}</h1>
      <p className="business-auth__subtitle">{confirmationEmail ? "อีกนิดเดียว ก็เริ่มตั้งค่าร้านได้แล้ว" : signup ? "แค่อีเมลและรหัสผ่าน ก็เริ่มต้นได้" : "เข้ามาจัดการร้านและดูแลแขกตัวน้อย"}</p>
      {confirmationEmail ? <div className="business-auth__confirmation" role="status">
        <CheckCircle size={40} />
        <p>หากอีเมลนี้สมัครได้ คุณจะได้รับลิงก์ยืนยันที่ <strong>{confirmationEmail}</strong></p>
        <p>เปิดลิงก์จากเบราว์เซอร์ที่ใช้สมัครนี้ หรือยืนยันแล้วกลับมาเข้าสู่ระบบ</p>
        <a className="button button--business" href="/business/login">ไปเข้าสู่ระบบ <ArrowRight size={18} /></a>
        <button className="business-auth__text-button" type="button" onClick={() => changeBusinessView(() => { setConfirmationEmail(""); setMessage(""); })}>ใช้อีเมลอื่น</button>
      </div> : <>
        <div className="business-auth__providers">
          <a className="business-auth__provider" href={`/api/auth/google/start${signup ? "?intent=register" : ""}`}><Google size={20} /> Google</a>
          <a className="business-auth__provider business-auth__provider--line" href={`/api/auth/line/start${signup ? "?intent=register" : ""}`}><MessageCircle size={20} /> LINE</a>
        </div>
        <div className="business-auth__divider"><span>หรือใช้อีเมล</span></div>
        <form className="business-auth__form" onSubmit={submit} aria-busy={busy}>
          <fieldset disabled={busy}>
            <label htmlFor="auth-email">อีเมล</label>
            <input id="auth-email" name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="you@example.com" />
            <label htmlFor="auth-password">รหัสผ่าน</label>
            <div className="business-auth__password">
              <input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : 1} maxLength={128} aria-describedby={signup ? "password-hint" : undefined} />
              <button className="business-auth__password-toggle" type="button" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}</button>
            </div>
            {signup && <small id="password-hint">อย่างน้อย 8 ตัวอักษร</small>}
            {error && <p className="business-auth__error" role="alert">{error}</p>}
            <button className="button button--business business-auth__submit" type="submit">{busy ? signup ? "กำลังสร้างบัญชี…" : "กำลังเข้าสู่ระบบ…" : signup ? "สร้างบัญชี" : "เข้าสู่ระบบ"}{!busy && <ArrowRight size={18} />}</button>
          </fieldset>
        </form>
        {signup && <p className="business-auth__legal">อ่าน <a href="/terms">เงื่อนไขการใช้งาน</a> และ <a href="/privacy">นโยบายความเป็นส่วนตัว</a></p>}
        <p className="business-auth__switch">{signup ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?"} <a href={signup ? "/business/login" : "/business/register"}>{signup ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</a></p>
        <p className="business-auth__secure"><LockKey size={16} /> {signup ? "ตั้งค่าร้านหลังสมัคร แก้ไขได้ภายหลัง" : "เข้าใช้ครั้งแรก เราจะพาคุณตั้งค่าร้าน"}</p>
      </>}
    </div>
  </section>;
}
