"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Google, LockKey, MessageCircle, PawPrint, ShieldCheck } from "../../_components/icons";

export function BusinessAuthScreen({ mode }: { mode: "login" | "register" }) {
  const signup = mode === "register";
  const queryError = useSearchParams().get("error");
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

  const error = queryError ? queryError === "origin-mismatch"
    ? "ที่อยู่เว็บนี้ยังไม่รองรับการเข้าสู่ระบบ กรุณาเปิดจากที่อยู่หลักของระบบ"
    : queryError === "not-configured"
    ? "ช่องทางเข้าสู่ระบบยังไม่พร้อมใช้งาน กรุณาลองอีกครั้งภายหลัง"
    : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง หรือติดต่อผู้ดูแลร้านหากสิทธิ์ถูกระงับ" : "";

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
      <h1 id="business-auth-title">{signup ? "สร้างบัญชีของคุณ" : "เข้าสู่ระบบ"}</h1>
      <p className="business-auth__subtitle">{signup ? "เริ่มต้นด้วยบัญชี Google หรือ LINE ของคุณ" : "เข้ามาจัดการร้านและดูแลแขกตัวน้อย"}</p>
        <div className="business-auth__providers">
          <a className="business-auth__provider" href={`/api/auth/google/start${signup ? "?intent=register" : ""}`}><Google size={20} /> Google</a>
          <a className="business-auth__provider business-auth__provider--line" href={`/api/auth/line/start${signup ? "?intent=register" : ""}`}><MessageCircle size={20} /> LINE</a>
        </div>
        {error && <p className="business-auth__error" role="alert">{error}</p>}
        {signup && <p className="business-auth__legal">อ่าน <a href="/terms">เงื่อนไขการใช้งาน</a> และ <a href="/privacy">นโยบายความเป็นส่วนตัว</a></p>}
        <p className="business-auth__switch">{signup ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?"} <a href={signup ? "/business/login" : "/business/register"}>{signup ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</a></p>
        <p className="business-auth__secure"><LockKey size={16} /> {signup ? "ตั้งค่าร้านหลังสมัคร แก้ไขได้ภายหลัง" : "เข้าใช้ครั้งแรก เราจะพาคุณตั้งค่าร้าน"}</p>
    </div>
  </section>;
}
