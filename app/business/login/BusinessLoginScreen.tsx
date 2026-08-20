"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleAuthButton } from "../../_components/GoogleAuthButton";
import { LockKey, ShieldCheck, Storefront, UserRoundCheck } from "../../_components/icons";

export function BusinessLoginScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function continueWithGoogle() {
    if (busy) return;
    setBusy(true);
    const requested = new URLSearchParams(window.location.search).get("returnTo");
    const returnTo = requested?.startsWith("/business/") && requested !== "/business/login" ? requested : "/business/home";
    window.setTimeout(() => router.push(returnTo), 420);
  }

  return (
    <section className="business-login shell" aria-labelledby="business-login-title">
      <div className="business-login__story">
        <p className="business-eyebrow"><Storefront size={18} weight="bold" /> Meawketting Business</p>
        <h1 id="business-login-title">เข้าสู่ระบบสำหรับร้าน<br />และทีมดูแลสัตว์</h1>
        <p>เปิดพื้นที่ทำงานของร้าน ตรวจสาขาและหน้าที่ปัจจุบันก่อนเริ่มสแกนรับน้องเข้าร้าน</p>
        <div className="business-login__trust">
          <span><ShieldCheck size={20} weight="bold" /> ตรวจสิทธิ์ก่อนเปิดข้อมูลของน้อง</span>
          <span><UserRoundCheck size={20} weight="bold" /> แสดงร้าน สาขา และหน้าที่ให้เห็นชัด</span>
        </div>
      </div>
      <div className="business-login__card">
        <span className="business-login__icon"><LockKey size={28} weight="bold" /></span>
        <p className="business-eyebrow">เข้าสู่พื้นที่ทำงาน</p>
        <h2>ดำเนินการต่อด้วยบัญชีของคุณ</h2>
        <p>ในระบบจริง บัญชีบุคคลเดียวสามารถเป็นทั้งผู้ดูแลสัตว์และสมาชิกของร้านได้ แต่แต่ละพื้นที่มีหน้าจอและสิทธิ์แยกกัน</p>
        <GoogleAuthButton busy={busy} onClick={continueWithGoogle} className="button--business-google" />
        <small>หน้านี้เป็นต้นแบบ ยังไม่ได้เชื่อม Google หรือสร้างการเข้าสู่ระบบจริง</small>
      </div>
    </section>
  );
}
