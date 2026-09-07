"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TemporaryAccess, TemporaryAccessGateState } from "../../../_prototype/sharingState";
import {
  evaluateTemporaryAccess,
  formatSharingDate,
  readTemporaryAccess,
  scopeLabel,
} from "../../../_prototype/sharingState";
import { getPrototypePetBySlug, speciesLabel } from "../../../_prototype/consumerPets";
import type {
  BusinessIntakeRecord,
  CorrectionTopic,
  DemoBusinessContext,
  IntakeTaskState,
} from "../../../_prototype/businessState";
import {
  beginOwnerDecisionPrototype,
  businessRoleLabel,
  businessStaffLabel,
  confirmPrototypeCheckIn,
  DEMO_BUSINESS_CONTEXTS,
  getDemoBusinessContextForBranch,
  getDemoBusinessContextDetails,
  readActiveBusinessContext,
  readBusinessIntake,
  readPrototypeCustomer,
  submitCorrectionSuggestion,
  updateBusinessIntake,
} from "../../../_prototype/businessState";
import { PetPhoto } from "../../../my-pets/_components/PetPhoto";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  CircleAlert,
  Clock,
  EyeSlash,
  IdentificationCard,
  Info,
  LockKey,
  PawPrint,
  Save,
  ShieldCheck,
  Storefront,
  X,
} from "../../../_components/icons";
import { BusinessPageHeader } from "../../_components/BusinessPageHeader";

const BELONGING_OPTIONS = ["กระเป๋าหรือกรง", "สายจูง", "อาหารหรือขนม", "ของเล่น"] as const;

const INTERRUPTION_COPY: Partial<Record<TemporaryAccessGateState, { title: string; message: string }>> = {
  expired: { title: "สิทธิ์เข้าถึงหมดอายุแล้ว", message: "แบบร่างการรับเข้าของร้านยังอยู่ แต่ข้อมูลของน้องถูกซ่อนและยังยืนยันรับเข้าไม่ได้" },
  revoked: { title: "เจ้าของยกเลิกสิทธิ์แล้ว", message: "ขั้นตอนรับเข้าหยุดทันที ข้อมูลของน้องจะไม่ถูกแสดงต่อ และยังยืนยันรับเข้าไม่ได้" },
  "wrong-business": { title: "ร้านหรือสาขาปัจจุบันไม่ตรงแล้ว", message: "เราซ่อนข้อมูลของน้องและหยุดการรับเข้า จนกว่าจะสแกน QR ในร้านและสาขาที่ถูกต้อง" },
  invalid: { title: "สิทธิ์นี้ใช้ต่อไม่ได้", message: "สถานะสิทธิ์เปลี่ยนระหว่างทำงาน ข้อมูลของน้องจึงถูกซ่อนและยังยืนยันรับเข้าไม่ได้" },
};

export function BusinessIntake({ intakeId }: { intakeId: string }) {
  const [record, setRecord] = useState<BusinessIntakeRecord | null>(null);
  const [access, setAccess] = useState<TemporaryAccess | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionTopic, setCorrectionTopic] = useState<CorrectionTopic>("name");
  const [suggestedValue, setSuggestedValue] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [correctionError, setCorrectionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkInError, setCheckInError] = useState("");
  const [activeContext, setActiveContext] = useState<DemoBusinessContext>(DEMO_BUSINESS_CONTEXTS[0]);
  const stateHeadingRef = useRef<HTMLHeadingElement>(null);
  const suggestionInputRef = useRef<HTMLInputElement>(null);
  const correctionTriggerRef = useRef<HTMLButtonElement>(null);
  const correctionSheetRef = useRef<HTMLElement>(null);

  const refresh = useCallback((announce = false) => {
    setActiveContext(readActiveBusinessContext());
    const currentRecord = readBusinessIntake(intakeId);
    if (!currentRecord) {
      setLoaded(true);
      setRecord(null);
      setAccess(null);
      return;
    }
    let currentAccess = readTemporaryAccess(currentRecord.accessId);
    if (currentAccess?.status === "ready" && currentAccess.consentStatus === "additional-decision-needed") {
      currentAccess = beginOwnerDecisionPrototype(currentAccess.id, currentRecord.staffLabel);
    }
    setRecord(currentRecord);
    setAccess(currentAccess);
    setLoaded(true);
    if (announce) setAnnouncement("ตรวจสถานะการอนุญาตล่าสุดแล้ว");
  }, [intakeId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => refresh());
    const onState = () => refresh();
    window.addEventListener("meawketting:sharing-state", onState);
    window.addEventListener("meawketting:business-state", onState);
    const interval = window.setInterval(() => refresh(), 1_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("meawketting:sharing-state", onState);
      window.removeEventListener("meawketting:business-state", onState);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    if (loaded) window.requestAnimationFrame(() => stateHeadingRef.current?.focus());
  }, [loaded, record?.taskState, access?.status]);

  useEffect(() => {
    if (!correctionOpen) return;
    const frame = window.requestAnimationFrame(() => suggestionInputRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleCorrectionKeys(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeCorrection();
        return;
      }
      if (event.key !== "Tab" || !correctionSheetRef.current) return;
      const focusable = [...correctionSheetRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (!focusable.includes(document.activeElement as HTMLElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleCorrectionKeys);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleCorrectionKeys);
    };
  }, [correctionOpen]);

  const context = useMemo<DemoBusinessContext>(() => getDemoBusinessContextForBranch(
    record?.businessId,
    record?.branchId,
  ), [record]);
  const details = useMemo(() => getDemoBusinessContextDetails(context), [context]);
  const gate = record ? evaluateTemporaryAccess(access, activeContext.businessId, activeContext.branchId) : "invalid";
  const consentActive = Boolean(access && gate === "valid" && access.status === "active");
  const pet = consentActive && access ? getPrototypePetBySlug(access.petSlug) : null;
  const knownCustomer = consentActive && record?.customerId ? readPrototypeCustomer(record.customerId) : null;
  const knownPet = knownCustomer && record?.petRelationshipId
    ? knownCustomer.pets.find((item) => item.id === record.petRelationshipId) ?? null
    : null;
  const interruption = !consentActive && access?.status !== "awaiting-owner"
    ? INTERRUPTION_COPY[gate]
    : null;

  function persist(update: (current: BusinessIntakeRecord) => BusinessIntakeRecord, message?: string) {
    if (!record) return;
    const next = updateBusinessIntake(record.id, update);
    if (!next) {
      setAnnouncement("บันทึกแบบร่างการรับเข้าไม่สำเร็จ กรุณาลองอีกครั้ง");
      return;
    }
    setRecord(next);
    if (message) setAnnouncement(message);
  }

  function moveTo(taskState: IntakeTaskState) {
    if (!consentActive && taskState !== "allowed-data") {
      setCheckInError("เจ้าของยังไม่ได้อนุญาต จึงไปขั้นยืนยันรับเข้าต่อไม่ได้");
      return;
    }
    persist((current) => ({ ...current, taskState }), "เปลี่ยนขั้นตอนแล้ว");
  }

  function toggleBelonging(item: string) {
    persist((current) => ({
      ...current,
      belongings: current.belongings.includes(item)
        ? current.belongings.filter((value) => value !== item)
        : [...current.belongings, item],
    }), "บันทึกของที่นำมาด้วยแล้ว");
  }

  function closeCorrection() {
    setCorrectionOpen(false);
    setCorrectionError("");
    setSuggestedValue("");
    setCorrectionNote("");
    window.requestAnimationFrame(() => correctionTriggerRef.current?.focus());
  }

  function submitCorrection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record || !pet || !suggestedValue.trim()) {
      setCorrectionError("กรอกข้อมูลที่ต้องการเสนอให้เจ้าของตรวจสอบ");
      suggestionInputRef.current?.focus();
      return;
    }
    const currentValues: Record<CorrectionTopic, string> = {
      name: pet.name,
      species: speciesLabel(pet.species),
      "passport-reference": pet.passportLabel,
    };
    const next = submitCorrectionSuggestion(record.id, {
      topic: correctionTopic,
      currentValue: currentValues[correctionTopic],
      suggestedValue: suggestedValue.trim(),
      note: correctionNote.trim(),
    });
    if (next) {
      setRecord(next);
      setAnnouncement("ส่งข้อเสนอแก้ไขแล้ว ข้อมูลต้นฉบับของน้องยังไม่เปลี่ยน");
      closeCorrection();
    }
  }

  function confirmCheckIn() {
    if (!record || submitting || record.checkInState === "checked-in") return;
    setSubmitting(true);
    setCheckInError("");
    window.setTimeout(() => {
      const result = confirmPrototypeCheckIn(record.id, activeContext);
      if (result.ok) {
        setRecord(result.record);
        setAnnouncement(result.duplicate ? "รายการนี้รับเข้าแล้ว จึงไม่สร้างซ้ำ" : "รับเข้าเรียบร้อย");
      } else {
        setCheckInError(result.reason === "expired"
          ? "สิทธิ์เข้าถึงหมดอายุแล้ว จึงไม่สามารถยืนยันรับเข้าได้"
          : result.reason === "revoked"
            ? "เจ้าของยกเลิกสิทธิ์แล้ว จึงไม่สามารถยืนยันรับเข้าได้"
            : "สิทธิ์ ร้าน หรือสาขาเปลี่ยนระหว่างยืนยัน กรุณาสแกนใหม่");
        refresh();
      }
      setSubmitting(false);
    }, 420);
  }

  if (!loaded) {
    return <div className="business-shell business-shell--narrow shell" aria-busy="true"><BusinessPageHeader title="รับน้องเข้าร้าน" context="กำลังเปิดแบบร่าง" /></div>;
  }

  if (!record) {
    return <div className="business-shell business-shell--narrow shell"><BusinessPageHeader title="รับน้องเข้าร้าน" /><section className="intake-blocked business-state-enter" role="alert"><CircleAlert size={40} weight="bold" /><h2 ref={stateHeadingRef} tabIndex={-1}>ไม่พบแบบร่างการรับเข้านี้</h2><p>ยังไม่มีข้อมูลที่ต้องมีสิทธิ์ถูกเปิด</p><a className="button button--business" href="/business/scan">กลับหน้าสแกนรับเข้า</a></section></div>;
  }

  if (interruption) {
    return <div className="business-shell business-shell--narrow shell"><BusinessPageHeader title="รับน้องเข้าร้าน" /><section className="intake-blocked business-state-enter" role="alert"><LockKey size={40} weight="bold" /><h2 ref={stateHeadingRef} tabIndex={-1}>{interruption.title}</h2><p>{interruption.message}</p><div className="intake-draft-preserved"><Save size={20} weight="bold" /><span><strong>แบบร่างการรับเข้ายังอยู่</strong><small>ของที่นำมาด้วยและหมายเหตุของร้านเก็บแยกจากข้อมูลต้นฉบับของน้อง</small></span></div><div className="scanner-actions"><a className="button button--business" href="/business/scan">ขอและสแกน QR ใหม่</a><a className="button button--ghost" href="/business/scan">กลับหน้าสแกน</a></div></section></div>;
  }

  if (!consentActive || access?.status === "awaiting-owner") {
    return <div className="business-shell business-shell--narrow shell"><BusinessPageHeader title="รับน้องเข้าร้าน" /><p className="sr-live" role="status" aria-live="polite">{announcement}</p><section className="awaiting-consent business-state-enter" aria-labelledby="awaiting-heading"><Clock size={40} weight="bold" /><h2 ref={stateHeadingRef} id="awaiting-heading" tabIndex={-1}>รอเจ้าของอนุมัติ</h2><p>ยังไม่แสดงชื่อ รูป หมายเลขอ้างอิง Passport หรือข้อมูลของน้องที่ต้องมีสิทธิ์</p><dl className="consent-facts"><div><dt>ร้าน</dt><dd>{details.business?.name}</dd></div><div><dt>สาขา</dt><dd>{details.branch?.name}</dd></div><div><dt>ใช้เพื่อ</dt><dd>{access?.purpose ?? record.servicePurpose}</dd></div><div><dt>ข้อมูลที่ขอ</dt><dd>{access?.scope.map(scopeLabel).join(" · ") ?? record.sharedScope.map(scopeLabel).join(" · ")}</dd></div><div><dt>สถานะ</dt><dd>รอการตอบกลับจากเจ้าของ</dd></div></dl><div className="awaiting-privacy"><LockKey size={22} weight="bold" /><span><strong>ข้อมูลของน้องยังถูกซ่อน</strong><small>พนักงานร้านไม่สามารถอนุมัติแทนเจ้าของได้</small></span></div><div className="scanner-actions"><button className="button button--business" type="button" onClick={() => refresh(true)}>ตรวจสถานะอีกครั้ง</button><a className="button button--ghost" href="/business/scan">ยกเลิกและกลับหน้าสแกน</a></div></section></div>;
  }

  if (!pet || !access) {
    return <div className="business-shell business-shell--narrow shell"><BusinessPageHeader title="รับน้องเข้าร้าน" /><section className="intake-blocked business-state-enter" role="alert"><CircleAlert size={40} weight="bold" /><h2 ref={stateHeadingRef} tabIndex={-1}>เปิดข้อมูลที่ร้านได้รับไม่สำเร็จ</h2><p>ขั้นตอนถูกหยุดโดยไม่แสดงข้อมูลของน้อง กรุณาสแกน QR ใหม่</p><a className="button button--business" href="/business/scan">กลับหน้าสแกนรับเข้า</a></section></div>;
  }

  const currentValue = correctionTopic === "name" ? pet.name : correctionTopic === "species" ? speciesLabel(pet.species) : pet.passportLabel;

  return (
    <div className="business-shell shell">
      <header className="business-task-heading business-task-heading--with-progress">
        <div><h1>รับน้องเข้าร้าน</h1><p>ตรวจข้อมูลที่ได้รับและบันทึกข้อมูลของร้าน</p></div>
        <ol className="intake-progress" aria-label="ความคืบหน้าการรับเข้า"><li className={record.taskState === "allowed-data" ? "is-active" : "is-complete"}><span>1</span> ข้อมูลที่ได้รับ</li><li className={record.taskState === "intake" ? "is-active" : record.taskState === "review" || record.taskState === "complete" ? "is-complete" : ""}><span>2</span> บันทึกรับเข้า</li><li className={record.taskState === "review" ? "is-active" : record.taskState === "complete" ? "is-complete" : ""}><span>3</span> ตรวจทาน</li></ol>
      </header>
      <p className="sr-live" role="status" aria-live="polite">{announcement}</p>

      {record.taskState === "allowed-data" ? (
        <section className="allowed-data-layout business-state-enter" aria-labelledby="allowed-data-heading">
          <div className="allowed-data-main">
            <div className="intake-state-heading"><h2 ref={stateHeadingRef} id="allowed-data-heading" tabIndex={-1}>ข้อมูลที่ร้านได้รับ</h2></div>
            <article className="allowed-pet-card">
              {access.scope.includes("photo") ? <PetPhoto src={pet.photoSrc} name={pet.name} className="pet-photo--card" /> : <span className="allowed-photo-hidden"><EyeSlash size={28} weight="bold" /><small>ไม่ได้แชร์รูป</small></span>}
              <div><span>ข้อมูลจากเจ้าของ · ดูอย่างเดียว</span><h3>{pet.name}</h3><p>{speciesLabel(pet.species)}</p></div>
              <span className="access-active-badge"><CheckCircle size={18} weight="bold" /> สิทธิ์ยังใช้งานได้</span>
            </article>
            {knownCustomer && knownPet ? <section className="allowed-group"><h3><Storefront size={20} weight="bold" /> ความสัมพันธ์ที่ร้านรู้จักแล้ว</h3><dl><div><dt>ผู้ติดต่อหลัก</dt><dd>{knownCustomer.name}</dd></div><div><dt>รายชื่อในร้าน</dt><dd>{knownPet.name}</dd></div></dl><p>ใช้เชื่อมบริบทการรับเข้ากับข้อมูลของร้านเท่านั้น ไม่สร้างลูกค้าใหม่ และไม่แก้ Pet Passport</p></section> : null}
            <section className="allowed-group"><h3><Check size={20} weight="bold" /> เปิดให้ร้าน</h3><dl><div><dt>ชื่อ</dt><dd>{pet.name}</dd></div><div><dt>ชนิดสัตว์</dt><dd>{speciesLabel(pet.species)}</dd></div>{access.scope.includes("passportReference") ? <div><dt>หมายเลขอ้างอิง Passport</dt><dd>{pet.passportLabel}</dd></div> : null}{access.scope.includes("photo") ? <div><dt>รูป</dt><dd>เปิดให้ดูตามสิทธิ์นี้</dd></div> : null}</dl></section>
            <section className="not-shared-group"><h3><EyeSlash size={20} weight="bold" /> ไม่ได้เปิดให้ร้าน</h3><ul>{!access.scope.includes("photo") ? <li>รูปสัตว์เลี้ยง</li> : null}{!access.scope.includes("passportReference") ? <li>หมายเลขอ้างอิง Passport</li> : null}<li>ยา ภูมิแพ้ วัคซีน ประวัติสุขภาพ และเอกสาร — สิทธิ์ครั้งนี้ไม่ครอบคลุมข้อมูลประเภทนี้</li><li>บันทึกส่วนตัวและข้อมูลของเจ้าของ</li></ul><p>ส่วนนี้บอกเพียงประเภทข้อมูลที่ไม่ได้รับ โดยไม่เปิดค่าข้างใน</p></section>
          </div>
          <aside className="consent-snapshot"><div className="consent-snapshot__heading"><ShieldCheck size={24} weight="bold" /><h2>สิทธิ์การดูข้อมูล</h2></div><dl><div><dt>ร้าน</dt><dd>{details.business?.name}</dd></div><div><dt>สาขา</dt><dd>{details.branch?.name}</dd></div><div><dt>ใช้เพื่อ</dt><dd>{access.purpose}</dd></div><div><dt>ข้อมูลที่เปิด</dt><dd>{access.scope.map(scopeLabel).join(" · ")}</dd></div><div><dt>หมดอายุ</dt><dd>{formatSharingDate(access.expiresAt)}</dd></div></dl><button ref={correctionTriggerRef} className="button button--ghost" type="button" onClick={() => setCorrectionOpen(true)}>เสนอแก้ไขข้อมูล</button></aside>
          <div className="intake-sticky-actions"><a className="button button--ghost" href="/business/scan"><ArrowLeft size={18} weight="bold" /> กลับหน้าสแกน</a><button className="button button--business button--large" type="button" onClick={() => moveTo("intake")}>บันทึกรับเข้า</button></div>
        </section>
      ) : null}

      {record.taskState === "intake" ? (
        <section className="intake-form-layout business-state-enter" aria-labelledby="intake-form-heading">
          <aside className="intake-context-card"><PawPrint size={28} weight="bold" /><span><small>กำลังรับเข้า</small><strong>{pet.name}</strong><small>{details.business?.name} · {details.branch?.name}</small></span><dl><div><dt>งานบริการ</dt><dd>{record.servicePurpose}</dd></div><div><dt>พนักงาน</dt><dd>{businessStaffLabel(record.staffLabel)}<br />{businessRoleLabel(record.role)}</dd></div><div><dt>สิทธิ์ดูข้อมูล</dt><dd>ใช้ได้ถึง {formatSharingDate(access.expiresAt)}</dd></div></dl></aside>
          <form className="intake-form" onSubmit={(event) => { event.preventDefault(); moveTo("review"); }}>
            <div className="intake-state-heading"><h2 ref={stateHeadingRef} id="intake-form-heading" tabIndex={-1}>บันทึกรับเข้า</h2><p>ข้อมูลส่วนนี้เป็นของร้าน และไม่แก้ Pet Passport</p></div>
            <fieldset className="belongings-fieldset"><legend>ของที่เจ้าของนำมาด้วย</legend><p>เลือกเฉพาะสิ่งที่รับมอบจริง</p><div>{BELONGING_OPTIONS.map((item) => <label key={item}><input type="checkbox" checked={record.belongings.includes(item)} onChange={() => toggleBelonging(item)} /><span><Check size={18} weight="bold" /> {item}</span></label>)}</div></fieldset>
            <label className="business-field" htmlFor="business-note"><span>หมายเหตุการรับเข้า</span><textarea id="business-note" rows={5} value={record.businessNote} aria-describedby="business-note-help" placeholder="ข้อเท็จจริงขณะรับเข้า เช่น มาถึงเวลาใด หรือฝากของไว้ตรงไหน" onChange={(event) => persist((current) => ({ ...current, businessNote: event.target.value }), "บันทึกหมายเหตุการรับเข้าแล้ว")} /><small id="business-note-help">หมายเหตุนี้เป็นข้อมูลของร้าน และไม่เพิ่มข้อมูลสุขภาพให้น้อง</small></label>
            <section className="relevant-instruction"><Info size={22} weight="bold" /><div><h3>คำแนะนำที่เกี่ยวข้อง</h3><p>สิทธิ์นี้ไม่มีคำแนะนำการดูแล จึงไม่มีการสร้างข้อมูลสุขภาพหรือคำแนะนำเพิ่ม</p></div></section>
            {record.correctionSuggestion ? <section className="correction-submitted"><CheckCircle size={22} weight="bold" /><div><h3>ส่งข้อเสนอแก้ไขแล้ว</h3><p>{record.correctionSuggestion.currentValue} → {record.correctionSuggestion.suggestedValue}</p><small>ข้อมูลต้นฉบับของน้องยังไม่เปลี่ยน</small></div></section> : null}
            <button ref={correctionTriggerRef} className="button button--ghost" type="button" onClick={() => setCorrectionOpen(true)}>เสนอแก้ไขข้อมูล</button>
            <div className="intake-sticky-actions"><button className="button button--ghost" type="button" onClick={() => moveTo("allowed-data")}>กลับไปดูข้อมูลที่ได้รับ</button><button className="button button--business button--large" type="submit">ตรวจทานก่อนรับเข้า</button></div>
          </form>
        </section>
      ) : null}

      {record.taskState === "review" ? (
        <section className="checkin-review business-state-enter" aria-labelledby="checkin-review-heading">
          <div className="intake-state-heading"><h2 ref={stateHeadingRef} id="checkin-review-heading" tabIndex={-1}>ตรวจทานก่อนรับเข้า</h2></div>
          <div className="review-stack"><ReviewRow label="น้อง" value={`${pet.name} · ${speciesLabel(pet.species)}`} icon="pet" /><ReviewRow label="ร้านและสาขา" value={`${details.business?.name} · ${details.branch?.name}`} icon="business" /><ReviewRow label="งานบริการ" value={record.servicePurpose} icon="service" /><ReviewRow label="ข้อมูลการดูแลที่ได้รับ" value="ไม่มีคำแนะนำการดูแลอยู่ในสิทธิ์นี้" icon="shared" /><ReviewRow label="ของที่นำมาด้วย" value={record.belongings.length > 0 ? record.belongings.join(" · ") : "ไม่ได้บันทึกของที่นำมาด้วย"} icon="shared" /><ReviewRow label="หมายเหตุการรับเข้า" value={record.businessNote.trim() || "ไม่ได้เพิ่มหมายเหตุ"} icon="shared" /><ReviewRow label="สิทธิ์ดูข้อมูล" value={`ใช้งานได้ · หมดอายุ ${formatSharingDate(access.expiresAt)}`} icon="consent" /></div>
          {checkInError ? <p className="checkin-error" role="alert"><CircleAlert size={18} weight="bold" /> {checkInError}</p> : null}
          <div className="intake-sticky-actions"><button className="button button--ghost" type="button" onClick={() => moveTo("intake")}>แก้บันทึกรับเข้า</button><button className="button button--business button--large" type="button" aria-busy={submitting} disabled={submitting || record.checkInState === "checked-in"} onClick={confirmCheckIn}>{submitting ? "กำลังยืนยันรับเข้า" : "ยืนยันรับเข้า"}</button></div>
        </section>
      ) : null}

      {record.taskState === "complete" || record.checkInState === "checked-in" ? (
        <section className="checkin-complete business-state-enter" aria-labelledby="checkin-complete-heading"><span className="checkin-complete__icon"><CheckCircle size={48} weight="bold" /></span><h2 ref={stateHeadingRef} id="checkin-complete-heading" tabIndex={-1}>รับเข้าเรียบร้อย</h2><p>{pet.name} เข้ารับบริการกับ {details.business?.name} · {details.branch?.name}</p><dl><div><dt>เวลารับเข้า</dt><dd>{formatSharingDate(record.checkedInAt)}</dd></div><div><dt>งานบริการ</dt><dd>{record.servicePurpose}</dd></div><div><dt>เลขอ้างอิงรายการ</dt><dd><code>{record.prototypeSessionReference}</code><small>ใช้ติดตามรายการในอุปกรณ์นี้</small></dd></div></dl><div className="scanner-actions">{record.daycareAttendanceId ? <a className="button button--business button--large" href={`/business/daycare?attendanceId=${encodeURIComponent(record.daycareAttendanceId)}`}>ไปที่รายการ Daycare</a> : null}{record.hotelStayId ? <a className="button button--business button--large" href={`/business/hotel?stayId=${encodeURIComponent(record.hotelStayId)}`}>ระบุห้องและไปที่โรงแรม</a> : null}{record.serviceJobId ? <a className="button button--business button--large" href={`/business/grooming?jobId=${encodeURIComponent(record.serviceJobId)}`}>ไปที่งานอาบน้ำ / ตัดขน</a> : null}<a className="button button--ghost" href="/business/scan">สแกนน้องตัวถัดไป</a></div></section>
      ) : null}

      {correctionOpen ? (
        <div className="correction-layer" role="presentation">
          <button className="correction-backdrop" type="button" tabIndex={-1} aria-label="ปิดหน้าต่างเสนอแก้ไขข้อมูล" onClick={closeCorrection} />
          <section ref={correctionSheetRef} className="correction-sheet" role="dialog" aria-modal="true" aria-labelledby="correction-heading">
            <header><h2 id="correction-heading">เสนอแก้ไขข้อมูล</h2><button type="button" aria-label="ปิดหน้าต่างเสนอแก้ไขข้อมูล" onClick={closeCorrection}><X size={20} weight="bold" /></button></header>
            <form onSubmit={submitCorrection}>
              <label className="business-field" htmlFor="correction-topic"><span>ข้อมูลที่ต้องการเสนอแก้</span><select id="correction-topic" value={correctionTopic} onChange={(event) => { setCorrectionTopic(event.target.value as CorrectionTopic); setSuggestedValue(""); }}><option value="name">ชื่อ</option><option value="species">ชนิดสัตว์</option>{access.scope.includes("passportReference") ? <option value="passport-reference">หมายเลขอ้างอิง Passport</option> : null}</select></label>
              <div className="current-visible-value"><span>ข้อมูลปัจจุบันที่ร้านเห็น</span><strong>{currentValue}</strong></div>
              <label className="business-field" htmlFor="suggested-value"><span>ข้อมูลที่เสนอ</span><input ref={suggestionInputRef} id="suggested-value" value={suggestedValue} aria-invalid={Boolean(correctionError)} aria-describedby={correctionError ? "correction-error" : "correction-help"} onChange={(event) => { setSuggestedValue(event.target.value); setCorrectionError(""); }} /><small id="correction-help">ข้อเสนอนี้ไม่แก้ข้อมูลต้นฉบับของน้องโดยตรง</small></label>
              <label className="business-field" htmlFor="correction-note"><span>หมายเหตุเพิ่มเติม (ไม่บังคับ)</span><textarea id="correction-note" rows={3} value={correctionNote} onChange={(event) => setCorrectionNote(event.target.value)} /></label>
              {correctionError ? <p id="correction-error" className="field-error" role="alert"><CircleAlert size={18} weight="bold" /> {correctionError}</p> : null}
              <div className="scanner-actions"><button className="button button--ghost" type="button" onClick={closeCorrection}>ยกเลิก</button><button className="button button--business" type="submit">ส่งข้อเสนอแก้ไข</button></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ReviewRow({ label, value, icon }: { label: string; value: string; icon: "pet" | "business" | "service" | "shared" | "consent" }) {
  const Icon = icon === "pet" ? PawPrint : icon === "business" ? Storefront : icon === "service" ? IdentificationCard : icon === "consent" ? ShieldCheck : Check;
  return <section className="review-row"><span><Icon size={22} weight="bold" /></span><div><h3>{label}</h3><p>{value}</p></div></section>;
}
