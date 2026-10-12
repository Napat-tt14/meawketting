"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock, PawPrint, UsersRound } from "../../_components/icons";
import { readBusinessSession } from "../../_backend/be1/configurationCache";
import { getPrototypeBusinessBranch, listPrototypeBookings, listPrototypeCustomers, type DemoBusinessContext } from "../../_prototype/businessState";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { BusinessModal } from "../_components/BusinessModal";
import { changeBusinessView } from "../_components/businessViewTransition";

const lessons = [
  { title: "กำหนดเวลาเปิดร้าน", description: "เลือกวันและเวลาให้ตรงกับร้านของคุณ ระบบจะใช้เวลานี้ช่วยจัดตารางการจอง", action: "ตั้งค่าเวลาเปิดร้าน", href: "/business/settings?section=branches", image: "pet-hotel-transparent.png", Icon: Clock },
  { title: "รู้จักลูกค้าและเพื่อนตัวเล็ก", description: "เพิ่มข้อมูลลูกค้าและสัตว์เลี้ยงไว้ในที่เดียว แล้วเลือกข้อมูลเดิมได้ทุกครั้งที่รับจอง", action: "ไปที่ลูกค้าและสัตว์เลี้ยง", href: "/business/customers", image: "pet-owner-clay.png", Icon: UsersRound },
  { title: "เริ่มการจองแรกของร้าน", description: "เลือกบริการ วันเวลา และสัตว์เลี้ยงในปฏิทิน เมื่อถึงวันนัด ใช้เมนูสแกนเพื่อรับเข้าบริการ", action: "เปิดปฏิทินการจอง", href: "/business/calendar?new=1", image: "pet-daycare-transparent.png", Icon: CalendarDays },
];

export function BusinessGettingStarted({ context }: { context: DemoBusinessContext }) {
  const [step, setStep] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const personId = readBusinessSession()?.person.id;
  const preferenceKey = personId ? `meawketting:business-guide:${personId}:${context.businessId}` : null;
  const branch = getPrototypeBusinessBranch(context.businessId, context.branchId);
  const completed = [!!branch?.operatingHours.some(day => !day.closed), listPrototypeCustomers(context).length > 0, listPrototypeBookings(context).length > 0];

  useEffect(() => {
    if (!preferenceKey) return;
    try { if (window.localStorage.getItem(preferenceKey) === "seen") return; } catch { /* Guidance remains usable without browser storage. */ }
    const frame = window.requestAnimationFrame(() => {
      setStep(0);
      try { window.localStorage.setItem(preferenceKey, "seen"); } catch { /* This preference never blocks business data. */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [preferenceKey]);

  useEffect(() => {
    if (step === null) return;
    const frame = window.requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  const lesson = lessons[step ?? 0];
  function move(next: number) { changeBusinessView(() => setStep(next)); }

  return <>
    <section className="business-getting-started" aria-label="เริ่มต้นใช้งานร้าน">
      <div className="business-getting-started__heading"><span><PawPrint size={21} weight="duotone" /></span><div><h2>เริ่มต้นดูแลร้านของคุณ</h2><p>เตรียมร้านให้พร้อมใน 3 ขั้นตอน</p></div><button type="button" onClick={() => setStep(0)}>ดูคำแนะนำ <ArrowRight size={16} /></button></div>
      <ol>{lessons.map(({ title, href, Icon }, index) => <li key={href} className={completed[index] ? "is-complete" : ""}><Link href={href}><span>{completed[index] ? <Check size={18} /> : <Icon size={18} />}</span><strong>{title}</strong>{completed[index] && <small>พร้อมแล้ว</small>}<ArrowRight size={16} /></Link></li>)}</ol>
    </section>
    <BusinessModal open={step !== null} title="ยินดีต้อนรับสู่ร้านของคุณ" description={`คำแนะนำ ${ (step ?? 0) + 1} จาก ${lessons.length}`} onClose={() => setStep(null)} initialFocusRef={heading} size="small" className="business-guide" closeLabel="ข้ามคำแนะนำ"
      footer={<><button type="button" className="button button--ghost" onClick={() => setStep(null)}>ข้ามตอนนี้</button><div>{step !== null && step > 0 && <button type="button" className="button button--business-ghost" onClick={() => move(step - 1)}><ArrowLeft size={16} /> ย้อนกลับ</button>}<button type="button" className="button button--business" onClick={() => step === lessons.length - 1 ? setStep(null) : move((step ?? 0) + 1)}>{step === lessons.length - 1 ? "พร้อมเริ่มแล้ว" : "ถัดไป"}<ArrowRight size={16} /></button></div></>}>
      <div key={step} className="business-guide__lesson">
        <Image src={`/images/landing/${lesson.image}`} alt="" width={1200} height={800} sizes="260px" loading="eager" unoptimized />
        <ol className="business-guide__steps" aria-label="ความคืบหน้าคำแนะนำ">{lessons.map((item, index) => <li key={item.href} aria-current={step === index ? "step" : undefined}><span className="sr-only">คำแนะนำ {index + 1}</span></li>)}</ol>
        <h3 ref={heading} tabIndex={-1}>{lesson.title}</h3><p>{lesson.description}</p>
        <Link className="business-guide__action" href={lesson.href} onClick={() => setStep(null)}>{lesson.action}<ArrowRight size={17} /></Link>
      </div>
    </BusinessModal>
  </>;
}
