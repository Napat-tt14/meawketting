"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DRAFT_PASSPORT_STORAGE_KEY } from "../create-passport/DraftPassportContext";
import { IdentificationCard, LockKey, LogIn, ShieldCheck } from "../_components/icons";
import { GoogleAuthButton } from "../_components/GoogleAuthButton";

export function LoginScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function continueWithGoogle() {
    if (busy) return;
    setBusy(true);
    const query = new URLSearchParams(window.location.search);
    const returnTo = query.get("returnTo")?.startsWith("/") ? query.get("returnTo")! : "/my-pets";
    if (query.get("intent") === "save-passport") {
      try {
        const raw = window.sessionStorage.getItem(DRAFT_PASSPORT_STORAGE_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as Record<string, unknown>;
          window.sessionStorage.setItem(DRAFT_PASSPORT_STORAGE_KEY, JSON.stringify({ ...draft, prototypeClaimed: true }));
        }
      } catch {
        // Mock login still continues; the destination owns its recovery state.
      }
    }
    window.setTimeout(() => router.push(returnTo), 450);
  }

  return (
    <section className="login-layout shell">
      <div className="login-story page-reveal">
        <span className="section-label"><IdentificationCard size={16} weight="fill" /> Meawketting account</span>
        <h1>กลับมาดูแลเรื่องของน้องได้ทุกเวลา</h1>
        <p>เข้าสู่ระบบเพื่อบันทึก Passport และเปิดดูสัตว์เลี้ยงของคุณในที่เดียว</p>
        <div className="login-trust-list">
          <span><ShieldCheck size={20} weight="bold" /> แชร์เฉพาะข้อมูลที่คุณเลือก</span>
          <span><LockKey size={20} weight="bold" /> สิทธิ์การเข้าถึงแยกตามวัตถุประสงค์</span>
        </div>
      </div>
      <div className="login-card page-reveal page-reveal--late">
        <span className="login-card__icon"><LogIn size={28} weight="bold" /></span>
        <p className="consumer-kicker">Login</p>
        <h2>เข้าสู่ระบบ Meawketting</h2>
        <p>หน้านี้เป็น mock สำหรับทดสอบ flow เท่านั้น</p>
        <GoogleAuthButton busy={busy} onClick={continueWithGoogle} />
        <small>ยังไม่มีการเชื่อมบัญชี Google หรือสร้าง session จริง</small>
      </div>
    </section>
  );
}
