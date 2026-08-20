"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ConsumerPet } from "../../../../_prototype/consumerPets";
import { getPrototypePetBySlug } from "../../../../_prototype/consumerPets";
import type { LostDetails, LostLead, SafetyPrototypeState } from "../../../../_prototype/safetyState";
import {
  formatPrototypeDate,
  publicSafetyIdForPet,
  readSafetyPrototypeState,
  writeSafetyPrototypeState,
} from "../../../../_prototype/safetyState";
import {
  ArrowLeft,
  CheckCircle,
  CircleAlert,
  Clock,
  Eye,
  FileImage,
  Flag,
  MapPin,
  Megaphone,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "../../../../_components/icons";
import { SafetyProfileCard, SafetyStatusBadge } from "../../../../safety/_components/SafetyProfileCard";

type LostView = "start" | "details" | "preview" | "dashboard" | "lead" | "mark-found" | "closed";
type LoadState = "loading" | "ready" | "not-found" | "permission-denied" | "safety-required";

const emptyDetails: LostDetails = {
  lastSeenAt: "",
  area: "",
  distinctiveFeatures: "",
  approach: "",
  photoName: null,
};

export function LostOwnerScreen({ petId }: { petId: string }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [pet, setPet] = useState<ConsumerPet | null>(null);
  const [safety, setSafety] = useState<SafetyPrototypeState | null>(null);
  const [view, setView] = useState<LostView>("start");
  const [details, setDetails] = useState<LostDetails>(emptyDetails);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const load = useCallback(() => {
    const found = getPrototypePetBySlug(petId);
    if (!found) {
      setLoadState("not-found");
      return;
    }
    if (found.guardianRole !== "primary" || new URLSearchParams(window.location.search).get("fixture") === "denied") {
      setLoadState("permission-denied");
      return;
    }
    const stored = readSafetyPrototypeState(found);
    if (stored.status === "not-configured" || stored.status === "disabled") {
      setPet(found);
      setSafety(stored);
      setLoadState("safety-required");
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const leadId = query.get("lead");
    setPet(found);
    setSafety(stored);
    setDetails(stored.lostCase?.details ?? emptyDetails);
    if (stored.status === "lost") setView(leadId ? "lead" : "dashboard");
    else setView("start");
    setSelectedLeadId(leadId);
    setLoadState("ready");
  }, [petId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(load);
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  const fixture = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("fixture");
  const displayLeads = useMemo(() => {
    if (fixture === "no-leads") return [];
    const stored = safety?.lostCase?.leads ?? [];
    if (fixture === "suspicious" && stored.length === 0) {
      return [{
        id: "lead-suspicious-fixture",
        receivedAt: "2026-08-11T11:05:00.000Z",
        message: "ขอให้โอนเงินก่อนจึงจะส่งตำแหน่ง",
        area: "ไม่ได้ระบุพื้นที่ที่ตรวจสอบได้",
        photoName: null,
        trust: "suspicious" as const,
      }];
    }
    return [...stored].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }, [fixture, safety]);
  const selectedLead = displayLeads.find((lead) => lead.id === selectedLeadId) ?? displayLeads[0] ?? null;

  function persist(next: SafetyPrototypeState) {
    setSafety(next);
    writeSafetyPrototypeState(next);
  }

  function updateDetail<Key extends keyof LostDetails>(key: Key, value: LostDetails[Key]) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  function updateLastSeenPart(part: "date" | "time", value: string) {
    setDetails((current) => {
      const [date = "", time = ""] = current.lastSeenAt.split("T");
      return { ...current, lastSeenAt: part === "date" ? `${value}T${time}` : `${date}T${value}` };
    });
  }

  function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(details.lastSeenAt) || !details.area.trim() || !details.distinctiveFeatures.trim() || !details.approach.trim()) {
      setFormError("กรอกวันเวลา บริเวณ จุดสังเกต และวิธีเข้าใกล้ให้ครบ ข้อมูลที่กรอกไว้ยังอยู่ในฟอร์ม");
      return;
    }
    setFormError("");
    setView("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function activateLostMode() {
    if (!safety) return;
    const next: SafetyPrototypeState = {
      ...safety,
      status: "lost",
      lastChanged: new Date().toISOString(),
      publicFields: { photo: true, features: true, approach: true, emergency: true },
      normalPublicFields: safety.publicFields,
      features: details.distinctiveFeatures,
      approach: details.approach,
      emergency: safety.emergency || "ติดต่อผู้ดูแลผ่านปุ่มส่งข้อความในหน้า Public Safety",
      lostCase: {
        phase: "active",
        activatedAt: new Date().toISOString(),
        closedAt: null,
        details,
        leads: safety.lostCase?.leads ?? [],
      },
    };
    persist(next);
    setActionMessage("Lost Mode ทำงานแล้วใน prototype และ Public Safety URL เดิมเปลี่ยนเป็น Lost experience");
    setView("dashboard");
  }

  function setLeadTrust(lead: LostLead, trust: "useful" | "suspicious") {
    if (!safety?.lostCase) return;
    const leads = safety.lostCase.leads.map((candidate) => candidate.id === lead.id ? { ...candidate, trust } : candidate);
    persist({ ...safety, lostCase: { ...safety.lostCase, leads } });
    setActionMessage(trust === "useful" ? "ทำเครื่องหมายเบาะแสนี้ว่ามีประโยชน์แล้ว" : "ทำเครื่องหมายเพื่อตรวจสอบความน่าสงสัยแล้ว");
  }

  function confirmFound() {
    if (!safety?.lostCase) return;
    if (fixture === "mark-found-error") {
      setActionMessage("ยังปิด Lost case ไม่สำเร็จ ข้อมูลและ leads ยังปลอดภัยใน prototype state ลองอีกครั้งหรือกลับ Dashboard");
      return;
    }
    const next: SafetyPrototypeState = {
      ...safety,
      status: "active",
      publicFields: safety.normalPublicFields ?? { photo: false, features: false, approach: false, emergency: false },
      normalPublicFields: undefined,
      lastChanged: new Date().toISOString(),
      lostCase: { ...safety.lostCase, phase: "closed", closedAt: new Date().toISOString() },
    };
    persist(next);
    setActionMessage("ปิด Lost case แล้ว Public URL กลับเป็น Safety Profile");
    setView("closed");
  }

  if (loadState === "loading") return <LostLoading />;
  if (loadState === "not-found") return <LostRecovery title="ไม่พบ Lost case นี้" message="ลิงก์ไม่ตรงกับ Pet ใน prototype และเราไม่ได้เปิดเผยข้อมูลรายการอื่น" />;
  if (loadState === "permission-denied") return <LostRecovery title="คุณยังเริ่ม Lost Mode ไม่ได้" message="Primary Guardian เป็นผู้ควบคุม Lost Mode ใน prototype สมมติฐานนี้ยังไม่ใช่นโยบาย production" />;
  if (loadState === "safety-required" && pet && safety) {
    const safetyHref = pet.prototypeSlug === "claimed-local" ? `/my-pets/${pet.prototypeSlug}#safety-settings` : `/my-pets/${pet.prototypeSlug}/safety`;
    return <LostRecovery title={safety.status === "disabled" ? "Safety Profile ยังปิดอยู่" : "ตั้งค่า Safety QR ก่อน"} message="Lost Mode ใช้ Permanent Public Safety URL เดิม จึงต้องเปิด Safety Profile ก่อน" href={safetyHref} action="ไปที่ Safety" />;
  }
  if (!pet || !safety) return null;

  const publicPath = `/safety/${publicSafetyIdForPet(pet.prototypeSlug)}`;
  const safetyOwnerPath = pet.prototypeSlug === "claimed-local" ? `/my-pets/${pet.prototypeSlug}#safety-settings` : `/my-pets/${pet.prototypeSlug}/safety`;

  return (
    <div className="lost-owner-page shell">
      <a className="consumer-back" href={safetyOwnerPath}><ArrowLeft size={18} weight="bold" /> กลับ Safety</a>
      <p className="prototype-boundary"><CircleAlert size={17} weight="bold" /> PROTOTYPE STATE ONLY · Location ใช้ข้อความระดับบริเวณ ไม่ใช่ GPS และ notification channel ยังเป็น Open Question</p>
      <p className="sr-live" aria-live="polite">{actionMessage}</p>

      {view === "start" ? (
        <section className="lost-sensitive-card" aria-labelledby="start-lost-heading">
          <ShieldAlert size={42} weight="bold" />
          <p className="consumer-kicker">SAFE-004 · SENSITIVE ACTION</p>
          <h1 id="start-lost-heading">เริ่ม Lost Mode อย่างมีสติ</h1>
          <p>ขั้นตอนนี้ยังไม่เปิด Lost Mode ทันที คุณจะกรอกรายละเอียดและตรวจหน้า Public Lost ก่อนยืนยัน</p>
          <ul className="consequence-list">
            <li><CheckCircle size={20} weight="bold" /> Public Safety URL เดิมจะเปลี่ยนเป็น Lost experience</li>
            <li><CheckCircle size={20} weight="bold" /> Finder จะเห็นเฉพาะข้อมูล Lost ที่คุณอนุญาต</li>
            <li><CheckCircle size={20} weight="bold" /> Finder อาจส่ง leads เข้ามาโดยไม่ต้องมีบัญชี</li>
            <li><CheckCircle size={20} weight="bold" /> ไม่มีเบอร์โทรจริง ที่อยู่บ้าน หรือ precise GPS เปิดโดยอัตโนมัติ</li>
          </ul>
          <div className="safety-actions"><a className="button button--ghost" href={safetyOwnerPath}>ยังไม่เริ่ม</a><button className="button button--dark button--large" type="button" onClick={() => setView("details")}>Continue to Lost Details</button></div>
        </section>
      ) : null}

      {view === "details" ? (
        <form className="lost-details-form" onSubmit={submitDetails} noValidate>
          <header><p className="consumer-kicker">SAFE-005</p><h1>รายละเอียดล่าสุดที่ช่วยค้นหา</h1><p>ใช้บริเวณกว้างที่คนเข้าใจได้ หลีกเลี่ยงเลขที่บ้าน พิกัด หรือ precise GPS</p></header>
          {formError ? <div className="form-alert" role="alert" id="lost-form-error"><CircleAlert size={22} weight="bold" /><div><strong>ยังตรวจตัวอย่างไม่ได้</strong><p>{formError}</p></div></div> : null}
          <div className="lost-form-grid">
            <label className="safety-field"><span>วันที่พบล่าสุด <b>จำเป็น</b></span><input type="date" required value={details.lastSeenAt.split("T")[0] ?? ""} aria-describedby={formError ? "lost-form-error" : undefined} onInput={(event) => updateLastSeenPart("date", event.currentTarget.value)} /></label>
            <label className="safety-field"><span>เวลาที่พบล่าสุด <b>จำเป็น</b></span><input type="time" required value={details.lastSeenAt.split("T")[1] ?? ""} aria-describedby={formError ? "lost-form-error" : undefined} onInput={(event) => updateLastSeenPart("time", event.currentTarget.value)} /></label>
            <label className="safety-field"><span>บริเวณที่พบล่าสุด <b>จำเป็น</b></span><input type="text" required placeholder="เช่น บริเวณสวนสาธารณะใกล้ชุมชน" value={details.area} onChange={(event) => updateDetail("area", event.target.value)} /><small>Area-level text เท่านั้น ไม่ใช่ตำแหน่งบ้านหรือ GPS</small></label>
            <label className="safety-field safety-field--wide"><span>สีและจุดสังเกต <b>จำเป็น</b></span><textarea rows={3} required value={details.distinctiveFeatures} onChange={(event) => updateDetail("distinctiveFeatures", event.target.value)} /></label>
            <label className="safety-field safety-field--wide"><span>วิธีเข้าใกล้ <b>จำเป็น</b></span><textarea rows={3} required value={details.approach} onChange={(event) => updateDetail("approach", event.target.value)} /></label>
            <label className="lost-photo-field"><FileImage size={26} weight="bold" /><span><strong>รูปประกาศเพิ่มเติม (ไม่บังคับ)</strong><small>JPG, PNG หรือ WebP · prototype เก็บเฉพาะชื่อไฟล์ใน state นี้</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
              if (fixture === "upload-error") {
                setFormError("อัปโหลดรูปไม่สำเร็จ แต่รายละเอียดอื่นยังอยู่ครบ เลือกรูปใหม่หรือดำเนินการโดยไม่ใส่รูปได้");
                return;
              }
              updateDetail("photoName", event.target.files?.[0]?.name ?? null);
            }} /></label>
          </div>
          <div className="safety-actions"><button className="button button--ghost" type="button" onClick={() => setView("start")}>ย้อนกลับ</button><button className="button button--dark button--large" type="submit"><Eye size={20} weight="bold" /> Preview Lost Page & Poster</button></div>
        </form>
      ) : null}

      {view === "preview" ? (
        <div className="lost-preview-layout">
          <header className="lost-page-heading"><div><p className="consumer-kicker">SAFE-006 · REVIEW BEFORE ACTIVATE</p><h1>ตรวจหน้า Lost และโปสเตอร์</h1></div><SafetyStatusBadge status="active" /></header>
          <div className="lost-preview-grid">
            <SafetyProfileCard pet={pet} state={{ ...safety, status: "lost", features: details.distinctiveFeatures, approach: details.approach, publicFields: { ...safety.publicFields, features: true, approach: true }, lostCase: { phase: "active", activatedAt: null, closedAt: null, details, leads: [] } }} />
            <aside className="lost-poster-preview" aria-label="ตัวอย่างโปสเตอร์ประกาศตามหา">
              <p className="consumer-kicker">POSTER-LIKE VISUAL PROTOTYPE</p><Megaphone size={36} weight="bold" /><strong>กำลังตามหา {pet.name}</strong><span>{details.area}</span><small>{details.distinctiveFeatures}</small><div><ShieldCheck size={18} weight="bold" /> สแกน Public Safety QR เพื่อส่งเบาะแส</div><p>ยังไม่มี PDF หรือ image export จริง</p>
            </aside>
          </div>
          <div className="form-alert form-alert--privacy"><ShieldCheck size={22} weight="bold" /><div><strong>ตรวจ privacy boundary แล้ว</strong><p>ไม่มี private phone, home address, sensitive health details หรือ precise location ใน preview นี้</p></div></div>
          <div className="safety-actions"><button className="button button--ghost" type="button" onClick={() => setView("details")}>กลับไปแก้ไข</button><button className="button button--dark button--large" type="button" onClick={activateLostMode}><ShieldAlert size={20} weight="bold" /> Activate Lost Mode</button></div>
        </div>
      ) : null}

      {view === "dashboard" ? (
        <div className="lost-dashboard">
          <header className="lost-page-heading"><div><p className="consumer-kicker">SAFE-007 · OWNER ONLY</p><h1>Lost Case Dashboard</h1><p>ติดตามสถานะและเบาะแสตามเวลาอย่างสงบ</p></div><SafetyStatusBadge status="lost" /></header>
          <div className="lost-dashboard-grid">
            <section className="lost-leads-panel" aria-labelledby="lost-leads-heading">
              <div className="lost-section-heading"><div><p className="consumer-kicker">FINDER LEADS</p><h2 id="lost-leads-heading">เบาะแสล่าสุด</h2></div><span>{displayLeads.length} รายการ</span></div>
              {displayLeads.length === 0 ? <div className="lost-empty-state"><Clock size={32} weight="bold" /><h3>ยังไม่มีเบาะแส</h3><p>Public Lost Page เปิดอยู่ ระบบต้นแบบจะเก็บ lead ในแท็บนี้เมื่อ Finder ส่งข้อมูล</p><a className="button button--ghost" href={publicPath} target="_blank" rel="noreferrer">เปิด Public Lost Page</a></div> : (
                <ol className="lost-lead-list">
                  {displayLeads.map((lead) => <li key={lead.id}><a href={`?lead=${encodeURIComponent(lead.id)}`} onClick={(event) => { event.preventDefault(); setSelectedLeadId(lead.id); setView("lead"); }}><span className={`lead-trust lead-trust--${lead.trust}`}>{lead.trust === "suspicious" ? <TriangleAlert size={17} weight="bold" /> : <Flag size={17} weight="bold" />} {lead.trust === "suspicious" ? "ควรตรวจสอบ" : lead.trust === "useful" ? "มีประโยชน์" : "ใหม่"}</span><strong>{lead.message}</strong><span><Clock size={16} weight="bold" /> {formatPrototypeDate(lead.receivedAt)}</span><span><MapPin size={16} weight="bold" /> {lead.area || "ไม่ได้ระบุบริเวณ"}</span></a></li>)}
                </ol>
              )}
            </section>
            <aside className="lost-case-summary">
              <ShieldAlert size={30} weight="bold" /><p className="consumer-kicker">ACTIVE CASE</p><h2>{pet.name}</h2>
              <dl><div><dt>เริ่มเมื่อ</dt><dd>{formatPrototypeDate(safety.lostCase?.activatedAt ?? null)}</dd></div><div><dt>บริเวณ</dt><dd>{safety.lostCase?.details.area}</dd></div><div><dt>Public URL</dt><dd>Safety URL เดิม · Lost presentation</dd></div></dl>
              <a className="button button--ghost" href={publicPath} target="_blank" rel="noreferrer"><Eye size={18} weight="bold" /> ดู Public Lost Page</a>
              <button className="button button--dark" type="button" onClick={() => { setActionMessage(""); setView("mark-found"); }}><CheckCircle size={18} weight="bold" /> Mark Pet Found</button>
            </aside>
          </div>
        </div>
      ) : null}

      {view === "lead" && selectedLead ? (
        <article className="lost-lead-detail">
          <button className="consumer-back consumer-back--button" type="button" onClick={() => setView("dashboard")}><ArrowLeft size={18} weight="bold" /> กลับรายการเบาะแส</button>
          <header><div><p className="consumer-kicker">SAFE-009 · GUARDIAN ONLY</p><h1>รายละเอียดเบาะแส</h1></div><span className={`lead-trust lead-trust--${selectedLead.trust}`}>{selectedLead.trust === "suspicious" ? <TriangleAlert size={18} weight="bold" /> : <Flag size={18} weight="bold" />} {selectedLead.trust === "suspicious" ? "ควรตรวจสอบ" : selectedLead.trust === "useful" ? "มีประโยชน์" : "ใหม่"}</span></header>
          <div className="lost-lead-evidence"><section><h2>ข้อความจากผู้พบ</h2><blockquote>{selectedLead.message}</blockquote></section><dl><div><dt>ได้รับเมื่อ</dt><dd>{formatPrototypeDate(selectedLead.receivedAt)}</dd></div><div><dt>บริเวณโดยประมาณ</dt><dd>{selectedLead.area || "ไม่ได้ระบุ"}</dd></div><div><dt>รูปแนบ</dt><dd>{selectedLead.photoName ?? "ไม่มีรูปแนบ"}</dd></div></dl></div>
          <div className="form-alert"><CircleAlert size={22} weight="bold" /><div><strong>Communication prototype</strong><p>ยังไม่มี real messaging และ Finder คนอื่นไม่เห็น lead นี้ อย่าโอนเงินหรือเปิดเผยข้อมูลส่วนตัวก่อนตรวจสอบ</p></div></div>
          <div className="safety-actions"><button className="button button--ghost" type="button" onClick={() => setLeadTrust(selectedLead, "suspicious")}><TriangleAlert size={18} weight="bold" /> Report suspicious</button><button className="button button--primary" type="button" onClick={() => setLeadTrust(selectedLead, "useful")}><CheckCircle size={18} weight="bold" /> Mark useful</button></div>
        </article>
      ) : null}

      {view === "mark-found" ? (
        <section className="lost-sensitive-card lost-sensitive-card--found" aria-labelledby="mark-found-heading">
          <CheckCircle size={42} weight="bold" /><p className="consumer-kicker">SAFE-010 · DEDICATED CONFIRMATION</p><h1 id="mark-found-heading">ยืนยันว่าพบ {pet.name} แล้ว</h1><p>การยืนยันนี้จะปิด Lost case, หยุด Lost state และคืน Public URL ไปเป็น Safety Profile ส่วน lead history จะยังอยู่ใน prototype history</p>
          {actionMessage ? <div className="form-alert" role="alert"><CircleAlert size={22} weight="bold" /><div><strong>สถานะการยืนยัน</strong><p>{actionMessage}</p></div></div> : null}
          <div className="safety-actions"><button className="button button--ghost" type="button" onClick={() => setView("dashboard")}>ยังไม่ปิด กลับ Dashboard</button><button className="button button--dark button--large" type="button" onClick={confirmFound}>Confirm Pet Found</button></div>
        </section>
      ) : null}

      {view === "closed" ? (
        <section className="lost-closed-summary">
          <CheckCircle size={44} weight="bold" /><p className="consumer-kicker">SAFE-011 · CLOSED</p><h1>ปิด Lost case แล้ว</h1><p>{pet.name} กลับสู่ Public Safety Profile ปกติอย่างสงบ</p>
          <dl><div><dt>สถานะ</dt><dd>Found / Closed</dd></div><div><dt>ปิดเมื่อ</dt><dd>{formatPrototypeDate(safety.lostCase?.closedAt ?? null)}</dd></div><div><dt>Safety QR</dt><dd>Active · Public Safety Profile</dd></div><div><dt>Lead history</dt><dd>คงอยู่เฉพาะใน prototype owner state</dd></div></dl>
          <div className="safety-actions"><a className="button button--primary" href={publicPath}><ShieldCheck size={19} weight="bold" /> Return to Safety Profile</a><a className="button button--ghost" href={`/my-pets/${pet.prototypeSlug}`}>Back to Pet</a></div>
        </section>
      ) : null}
    </div>
  );
}

function LostLoading() {
  return <div className="lost-owner-page shell" aria-busy="true"><section className="flow-loading-card"><ShieldAlert size={28} weight="bold" /> กำลังเปิด Lost Mode</section></div>;
}

function LostRecovery({ title, message, href = "/my-pets", action = "กลับ My Pets" }: { title: string; message: string; href?: string; action?: string }) {
  return <div className="lost-owner-page shell"><section className="consumer-recovery" role="alert"><CircleAlert size={40} weight="bold" /><p className="consumer-kicker">Lost recovery</p><h1>{title}</h1><p>{message}</p><div className="consumer-recovery__actions"><a className="button button--ghost" href={href}>{action}</a></div></section></div>;
}
