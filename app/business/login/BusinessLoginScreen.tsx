"use client";

import { Google, LockKey, ShieldCheck, UserRoundCheck } from "../../_components/icons";
import { useSearchParams } from "next/navigation";

export function BusinessLoginScreen() {
  const error = useSearchParams().get("error");
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
        {error && <p role="alert">{error === "not-configured" ? "ช่องทางเข้าสู่ระบบยังไม่พร้อมใช้งาน กรุณาลองอีกครั้งภายหลัง" : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง หรือติดต่อผู้ดูแลร้านหากสิทธิ์ถูกระงับ"}</p>}
        <a className="button button--google button--large button--business-google" href="/api/auth/google/start?returnTo=%2Fbusiness%2Fhome"><Google size={20} aria-hidden="true" />ดำเนินการต่อด้วย Google</a>
        <a className="button button--business-ghost button--large" href="/api/auth/line/start">ดำเนินการต่อด้วย LINE</a>
        <small id="business-login-available">ใช้บัญชีที่เชื่อมกับร้านของคุณ</small>
        <p>ยังไม่มีร้าน? <a href="/business/register">สมัครใช้งานสำหรับธุรกิจ</a></p>
      </div>
    </section>
  );
}
