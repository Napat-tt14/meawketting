"use client";

import Image from "next/image";
import { Google, LockKey, ShieldCheck, Sparkle, Storefront, UserRoundCheck } from "../../_components/icons";
import { useSearchParams } from "next/navigation";

export function BusinessLoginScreen() {
  const error = useSearchParams().get("error");
  return (
    <section className="business-login business-auth-layout shell" aria-labelledby="business-login-title">
      <div className="business-login__story">
        <span className="business-login__kicker"><Sparkle size={15} weight="fill" /> MEAWKETTING FOR BUSINESS</span>
        <h1 id="business-login-title">กลับมาดูแลร้าน<br />ให้ทุกวัน<span className="business-auth-accent">น่ารักขึ้น</span></h1>
        <p>ทุกการจอง ทุกงานดูแล พร้อมให้คุณไปต่อ<br />เข้ามาเตรียมวันดี ๆ ให้แขกตัวน้อยด้วยกัน</p>
        <div className="business-login__scene">
          <Image
            className="business-login__art"
            src="/images/business/business-auth-welcome.png"
            alt="ภาพประกอบเจ้าของร้านยิ้มต้อนรับพร้อมแมวและสุนัขที่เคาน์เตอร์ร้านดูแลสัตว์เลี้ยง"
            width={1536}
            height={1024}
            sizes="(max-width: 767px) 92vw, 55vw"
            priority
            unoptimized
          />
          <span className="business-login__scene-tag business-login__scene-tag--top"><Storefront size={15} /> วันใหม่ของร้าน เริ่มตรงนี้</span>
          <span className="business-login__scene-tag business-login__scene-tag--bottom"><ShieldCheck size={15} /> ดูแลได้อย่างมั่นใจ</span>
        </div>
        <div className="business-login__trust">
          <span><ShieldCheck size={20} weight="bold" /> ตรวจสิทธิ์ก่อนเปิดข้อมูลของน้อง</span>
          <span><UserRoundCheck size={20} weight="bold" /> แสดงร้าน สาขา และหน้าที่ให้เห็นชัด</span>
        </div>
      </div>
      <div className="business-login__card">
        <span className="business-login__card-kicker">ยินดีต้อนรับกลับมา</span>
        <span className="business-login__icon"><LockKey size={28} weight="bold" /></span>
        <h2>เข้าสู่ระบบ</h2>
        <p>พร้อมดูแลแขกตัวน้อยกันหรือยัง?</p>
        {error && <p role="alert">{error === "not-configured" ? "ช่องทางเข้าสู่ระบบยังไม่พร้อมใช้งาน กรุณาลองอีกครั้งภายหลัง" : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง หรือติดต่อผู้ดูแลร้านหากสิทธิ์ถูกระงับ"}</p>}
        <a className="button button--google button--large button--business-google" href="/api/auth/google/start?returnTo=%2Fbusiness%2Fhome"><Google size={20} aria-hidden="true" />ดำเนินการต่อด้วย Google</a>
        <a className="button button--business-ghost button--large" href="/api/auth/line/start">ดำเนินการต่อด้วย LINE</a>
        <small id="business-login-available">ใช้บัญชีที่เชื่อมกับร้านของคุณ</small>
        <p>ยังไม่มีร้าน? <a href="/business/register">สมัครใช้งานสำหรับธุรกิจ</a></p>
      </div>
    </section>
  );
}
