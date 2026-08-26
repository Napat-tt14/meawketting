"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleAuthButton } from "../../_components/GoogleAuthButton";
import { LockKey, ShieldCheck, UserRoundCheck } from "../../_components/icons";

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
        <h1 id="business-login-title">พื้นที่ทำงานสำหรับร้านและทีมดูแลสัตว์</h1>
        <p>เปิดงานของสาขา ดูการจอง ค้นหาลูกค้า และสแกนรับน้องเข้าร้าน</p>
        <div className="business-login__trust">
          <span><ShieldCheck size={20} weight="bold" /> ตรวจสิทธิ์ก่อนเปิดข้อมูลของน้อง</span>
          <span><UserRoundCheck size={20} weight="bold" /> แสดงร้าน สาขา และหน้าที่ให้เห็นชัด</span>
        </div>
      </div>
      <div className="business-login__card">
        <span className="business-login__icon"><LockKey size={28} weight="bold" /></span>
        <h2>เข้าสู่ระบบ</h2>
        <GoogleAuthButton busy={busy} onClick={continueWithGoogle} className="button--business-google" />
        <small>การเชื่อมต่อ Google อยู่ระหว่างเตรียมใช้งาน</small>
      </div>
    </section>
  );
}
