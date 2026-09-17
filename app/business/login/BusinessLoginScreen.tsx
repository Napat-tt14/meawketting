"use client";

import { Google, LockKey, ShieldCheck, UserRoundCheck } from "../../_components/icons";

export function BusinessLoginScreen() {
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
        <a className="button button--google button--large button--business-google" href="/api/auth/google/start?returnTo=%2Fbusiness%2Fhome"><Google size={20} aria-hidden="true" />ดำเนินการต่อด้วย Google</a>
        <small id="business-login-available">ใช้บัญชี Google ที่ได้รับอนุญาตสำหรับร้านเท่านั้น</small>
      </div>
    </section>
  );
}
