"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { ConsumerPet } from "../../../_prototype/consumerPets";
import { getPrototypePetBySlug, guardianRoleLabel, speciesLabel } from "../../../_prototype/consumerPets";
import type { BusinessFixture, SharingDraft, TemporaryAccess } from "../../../_prototype/sharingState";
import {
  BUSINESS_FIXTURES,
  DURATION_PRESETS,
  accessStatusLabel,
  addAccessEvent,
  browserTimezoneLabel,
  clearSharingDraft,
  createTemporaryAccess,
  formatSharingDate,
  getBusinessBranch,
  getBusinessFixture,
  getDraftExpiry,
  listTemporaryAccessForPet,
  readSharingDraft,
  readTemporaryAccess,
  scopeLabel,
  selectedScopeKeys,
  updateTemporaryAccess,
  writeSharingDraft,
} from "../../../_prototype/sharingState";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle,
  CircleAlert,
  CircleDashed,
  Clock,
  Eye,
  EyeSlash,
  Info,
  LockKey,
  QrCode,
  Search,
  ShieldCheck,
  Storefront,
  UserRoundCheck,
  WifiOff,
} from "../../../_components/icons";
import { PetPhoto } from "../../_components/PetPhoto";

type OwnerView = "start" | "business" | "scope" | "duration" | "consent" | "qr" | "access" | "revoke" | "history" | "decision";
type LoadState = "loading" | "ready" | "not-found" | "permission-denied";
type BusinessSearchState = "ready" | "loading" | "error";

const ownerViews: OwnerView[] = ["start", "business", "scope", "duration", "consent", "qr", "access", "revoke", "history", "decision"];

function parseView(value: string | null): OwnerView {
  return ownerViews.includes(value as OwnerView) ? value as OwnerView : "start";
}

export function SharingOwnerScreen({ petId }: { petId: string }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [pet, setPet] = useState<ConsumerPet | null>(null);
  const [draft, setDraft] = useState<SharingDraft | null>(null);
  const [view, setView] = useState<OwnerView>("start");
  const [fixture, setFixture] = useState<string | null>(null);
  const [accesses, setAccesses] = useState<TemporaryAccess[]>([]);
  const [access, setAccess] = useState<TemporaryAccess | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchState, setSearchState] = useState<BusinessSearchState>("ready");
  const [activeResult, setActiveResult] = useState(0);
  const [revokeComplete, setRevokeComplete] = useState(false);

  const loadFromUrl = useCallback(() => {
    const found = getPrototypePetBySlug(petId);
    if (!found) {
      setLoadState("not-found");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const currentFixture = params.get("fixture");
    if (found.guardianRole !== "primary" || currentFixture === "permission-changed") {
      setLoadState("permission-denied");
      return;
    }
    const nextView = parseView(params.get("view"));
    const accessId = params.get("accessId");
    setPet(found);
    setDraft(readSharingDraft(found.prototypeSlug));
    setAccesses(listTemporaryAccessForPet(found.prototypeSlug));
    setAccess(accessId ? readTemporaryAccess(accessId) : listTemporaryAccessForPet(found.prototypeSlug)[0] ?? null);
    setView(nextView);
    setFixture(currentFixture);
    setSearchState(currentFixture === "business-error" ? "error" : "ready");
    setLoadState("ready");
  }, [petId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(loadFromUrl);
    const onPopState = () => loadFromUrl();
    window.addEventListener("popstate", onPopState);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", onPopState);
    };
  }, [loadFromUrl]);

  useEffect(() => {
    if (searchState !== "loading") return;
    const timer = window.setTimeout(() => setSearchState("ready"), 180);
    return () => window.clearTimeout(timer);
  }, [searchState, searchTerm]);

  const business = useMemo(() => getBusinessFixture(draft?.businessId ?? null), [draft?.businessId]);
  const branch = useMemo(() => getBusinessBranch(business, draft?.branchId ?? null), [business, draft?.branchId]);
  const expiry = useMemo(() => draft ? getDraftExpiry(draft) : null, [draft]);

  const filteredBusinesses = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("th").replace(/^code:\s*/, "");
    if (!query) return BUSINESS_FIXTURES;
    return BUSINESS_FIXTURES.filter((candidate) => {
      const haystack = [candidate.name, candidate.type, ...candidate.branches.flatMap((item) => [item.name, item.area, item.demoCode])].join(" ").toLocaleLowerCase("th");
      return haystack.includes(query);
    });
  }, [searchTerm]);

  function persistDraft(updater: (current: SharingDraft) => SharingDraft, message?: string) {
    if (!draft) return;
    const next = updater(draft);
    setDraft(next);
    if (!writeSharingDraft(next)) setAnnouncement("บันทึก state ต้นแบบในแท็บนี้ไม่สำเร็จ กรุณาลองอีกครั้ง");
    else if (message) setAnnouncement(message);
  }

  function navigate(nextView: OwnerView, accessId?: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    if (accessId) url.searchParams.set("accessId", accessId);
    else if (nextView === "start" || nextView === "business" || nextView === "scope" || nextView === "duration" || nextView === "consent") url.searchParams.delete("accessId");
    url.searchParams.delete("fixture");
    window.history.pushState({}, "", `${url.pathname}${url.search}`);
    setFixture(null);
    setView(nextView);
    if (accessId) setAccess(readTemporaryAccess(accessId));
    setAnnouncement("");
    setRevokeComplete(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function refreshAccess(nextAccess?: TemporaryAccess | null) {
    if (!pet) return;
    setAccesses(listTemporaryAccessForPet(pet.prototypeSlug));
    if (nextAccess) setAccess(readTemporaryAccess(nextAccess.id));
  }

  function chooseBusiness(selected: BusinessFixture) {
    persistDraft((current) => ({ ...current, businessId: selected.id, branchId: selected.branches[0]?.id ?? null }), `เลือก ${selected.name} แล้ว โปรดตรวจสาขา`);
  }

  function confirmConsent() {
    if (!pet || !draft || !business || !branch || !expiry) {
      setAnnouncement("ข้อมูล consent ยังไม่ครบ โปรดตรวจ Business, Scope และ Duration");
      return;
    }
    if (fixture === "consent-changed") {
      setAnnouncement("ข้อมูลที่ใช้ทำ consent เปลี่ยนใน fixture นี้ โปรดทบทวนสรุปอีกครั้งก่อนสร้าง QR");
      return;
    }
    if (fixture === "qr-error") {
      setAnnouncement("สร้าง QR ต้นแบบไม่สำเร็จ ข้อมูล Business, Scope และ Duration ยังอยู่ครบ");
      return;
    }
    const created = createTemporaryAccess(pet, draft);
    if (!created) {
      setAnnouncement("สร้าง Temporary Access ไม่สำเร็จ โปรดตรวจข้อมูลแล้วลองอีกครั้ง");
      return;
    }
    clearSharingDraft(pet.prototypeSlug);
    setAccess(created);
    refreshAccess(created);
    navigate("qr", created.id);
  }

  function revokeAccess() {
    if (!access || access.status === "revoked" || access.status === "expired") return;
    if (fixture === "revoke-error") {
      const failed = addAccessEvent(access, "revoke-failed", "Primary Guardian (Prototype)", "Revoke fixture ไม่สำเร็จ และสิทธิ์เดิมไม่ถูกเปลี่ยน");
      updateTemporaryAccess(failed);
      setAccess(failed);
      setAnnouncement("ยกเลิกสิทธิ์ไม่สำเร็จใน fixture นี้ สิทธิ์เดิมยังไม่เปลี่ยน ลองอีกครั้งได้");
      return;
    }
    const revoked = addAccessEvent({ ...access, status: "revoked", revokedAt: new Date().toISOString() }, "revoked", "Primary Guardian (Prototype)", "Guardian ยกเลิก Temporary Access ก่อนวันหมดอายุ");
    updateTemporaryAccess(revoked);
    setAccess(revoked);
    refreshAccess(revoked);
    setRevokeComplete(true);
    setAnnouncement("ยกเลิก Temporary Access แล้วใน prototype state");
  }

  function decideAccess(decision: "approved" | "denied") {
    if (!access || access.status !== "awaiting-owner") return;
    const decidedAt = new Date().toISOString();
    const next = addAccessEvent(
      { ...access, status: decision === "approved" ? "active" : "denied", consentStatus: decision, decisionAt: decidedAt },
      decision === "approved" ? "approved" : "denied",
      "Primary Guardian (Prototype)",
      decision === "approved" ? "อนุมัติ Temporary Access ตามขอบเขตเดิม" : "ปฏิเสธคำขอ Temporary Access",
    );
    updateTemporaryAccess(next);
    setAccess(next);
    refreshAccess(next);
    setAnnouncement(decision === "approved" ? "อนุมัติ Temporary Access แล้ว" : "ปฏิเสธคำขอแล้ว โดยไม่ได้เปิดข้อมูลให้ Business");
  }

  if (loadState === "loading") return <ShareLoading />;
  if (loadState === "not-found") return <ShareRecovery title="ไม่พบ Pet สำหรับการแชร์" message="ลิงก์นี้ไม่ตรงกับ Pet ใน prototype และเราไม่ได้แสดงข้อมูลของรายการอื่นแทน" />;
  if (loadState === "permission-denied") return <ShareRecovery title="คุณยังสร้าง Temporary Access ไม่ได้" message="ต้นแบบนี้ให้ Primary Guardian เป็นผู้อนุมัติเท่านั้น นี่เป็นสมมติฐานที่ย้อนกลับได้; นโยบาย Co-guardian ยังเป็นคำถามเปิด" />;
  if (!pet || !draft) return null;

  const lifecycleBlocked = pet.lifecycle !== "active";

  return (
    <div className="sharing-page shell">
      <a className="consumer-back" href={`/my-pets/${pet.prototypeSlug}`}><ArrowLeft size={18} weight="bold" /> กลับ Pet Detail</a>
      <p className="prototype-boundary sharing-boundary"><CircleAlert size={17} weight="bold" /> PROTOTYPE STATE ONLY · ไม่มี Backend, real authorization, real token security หรือ production expiry enforcement</p>
      <p className="sr-live" aria-live="polite" aria-atomic="true">{announcement}</p>

      {view === "start" ? (
        <StartView pet={pet} lifecycleBlocked={lifecycleBlocked} activeCount={accesses.filter((item) => item.status === "active" || item.status === "ready" || item.status === "awaiting-owner").length} onStart={() => navigate("business")} onHistory={() => navigate("history")} />
      ) : null}

      {view === "business" ? (
        <section className="sharing-task" aria-labelledby="business-heading">
          <FlowHeading headingId="business-heading" step="SHARE-002 · 1/4" title="เลือกร้านและสาขาที่จะรับข้อมูล" description="การเลือก recipient ยังไม่เปิดข้อมูล Pet จนกว่าจะตรวจ Scope, Duration และยืนยัน Consent" />
          <div className="sharing-business-layout">
            <div className="sharing-card">
              <label className="sharing-search" htmlFor="business-search"><span>ค้นหาชื่อ ประเภท สาขา หรือ Demo code</span><span className="sharing-search__input"><Search size={20} weight="bold" /><input id="business-search" role="combobox" aria-controls="business-results" aria-expanded="true" aria-activedescendant={filteredBusinesses[activeResult] ? `business-result-${filteredBusinesses[activeResult].id}` : undefined} value={searchTerm} placeholder="เช่น Grooming หรือ GG-R9" onChange={(event) => { setSearchTerm(event.target.value); setActiveResult(0); setSearchState("loading"); }} onKeyDown={(event) => {
                if (event.key === "ArrowDown") { event.preventDefault(); setActiveResult((current) => Math.min(current + 1, Math.max(filteredBusinesses.length - 1, 0))); }
                if (event.key === "ArrowUp") { event.preventDefault(); setActiveResult((current) => Math.max(current - 1, 0)); }
                if (event.key === "Enter" && filteredBusinesses[activeResult]) { event.preventDefault(); chooseBusiness(filteredBusinesses[activeResult]); }
              }} /></span></label>
              <div className="business-results-meta" aria-live="polite">{searchState === "loading" ? "กำลังค้นหา Business fixture" : searchState === "error" ? "ค้นหาไม่สำเร็จ" : `พบ ${filteredBusinesses.length} รายการ Demo`}</div>
              {searchState === "error" ? <div className="sharing-inline-state" role="alert"><WifiOff size={24} weight="bold" /><div><strong>ค้นหา Business fixture ไม่สำเร็จ</strong><p>คำค้นและ draft ยังอยู่ครบ</p><button type="button" className="button button--ghost" onClick={() => { setSearchState("ready"); setFixture(null); }}>ลองค้นหาอีกครั้ง</button></div></div> : null}
              {searchState === "ready" && filteredBusinesses.length === 0 ? <div className="sharing-inline-state"><Search size={24} weight="bold" /><div><strong>{searchTerm.toLowerCase().startsWith("code:") ? "Demo code ไม่ถูกต้อง" : "ไม่พบ Business ที่ตรงกัน"}</strong><p>ตรวจตัวสะกด ค้นด้วยประเภท หรือใช้ code รูปแบบ Demo เช่น GG-R9</p><button type="button" className="button button--ghost" onClick={() => setSearchTerm("")}>ดู Business ทั้งหมด</button></div></div> : null}
              {searchState === "ready" ? <div id="business-results" className="business-result-list" role="listbox" aria-label="Business fixtures">{filteredBusinesses.map((candidate, index) => <button id={`business-result-${candidate.id}`} type="button" role="option" aria-selected={business?.id === candidate.id} className={`business-result${business?.id === candidate.id ? " is-selected" : ""}${candidate.verification === "suspended" ? " is-suspended" : ""}`} key={candidate.id} onClick={() => chooseBusiness(candidate)} onMouseEnter={() => setActiveResult(index)}><span className="business-result__icon"><Storefront size={24} weight="bold" /></span><span><strong>{candidate.name}</strong><small>{candidate.type} · {candidate.branches.map((item) => item.name).join(", ")}</small><BusinessVerificationText business={candidate} /></span><span className="business-result__selection">{business?.id === candidate.id ? <><Check size={16} weight="bold" /> เลือกแล้ว</> : "เลือก"}</span></button>)}</div> : null}
            </div>

            <aside className="sharing-summary-card" aria-labelledby="selected-recipient-heading">
              <p className="consumer-kicker">SELECTED RECIPIENT</p><h2 id="selected-recipient-heading">ผู้รับข้อมูล</h2>
              {!business ? <div className="sharing-empty"><CircleDashed size={24} weight="bold" /><p>เลือก Business เพื่อดูชื่อ สาขา และสถานะก่อนดำเนินการ</p></div> : <><div className="recipient-identity"><Storefront size={28} weight="bold" /><div><strong>{business.name}</strong><span>{business.type}</span></div></div><BusinessVerificationText business={business} /><fieldset className="branch-options"><legend>เลือกสาขาให้ชัดเจน</legend>{business.branches.map((item) => <label key={item.id} className={branch?.id === item.id ? "is-selected" : undefined}><input type="radio" name="branch" aria-label={`${item.name} ${item.area}`} checked={branch?.id === item.id} onChange={() => persistDraft((current) => ({ ...current, branchId: item.id }), `เลือก ${item.name} แล้ว`)} /><span><strong>{item.name}</strong><small>{item.area} · Code {item.demoCode}</small></span></label>)}</fieldset>{business.verification === "suspended" ? <p className="inline-warning" role="alert"><CircleAlert size={18} weight="bold" /> Business fixture นี้ถูกระงับ จึงไปขั้น Scope ไม่ได้</p> : null}</>}
            </aside>
          </div>
          <FlowActions back={() => navigate("start")} next={() => navigate("scope")} nextLabel="เลือกขอบเขตข้อมูล" disabled={!business || !branch || business.verification === "suspended"} />
        </section>
      ) : null}

      {view === "scope" ? (
        <section className="sharing-task" aria-labelledby="scope-heading">
          <FlowHeading headingId="scope-heading" step="SHARE-003 · 2/4" title="เลือกข้อมูลที่ Business จะเห็น" description="ข้อมูลละเอียดอ่อนและข้อมูลเสริมไม่ถูกเลือกไว้ล่วงหน้า; Private notes ไม่สามารถแชร์จาก flow นี้" />
          <RecipientRibbon business={business} branch={branch?.name ?? null} />
          <div className="scope-layout">
            <section className="sharing-card" aria-labelledby="available-scope-heading">
              <div className="sharing-section-heading"><Eye size={24} weight="bold" /><div><p className="consumer-kicker">SHARED IF SELECTED</p><h2 id="available-scope-heading">ข้อมูลที่ model ปัจจุบันรองรับ</h2></div></div>
              <fieldset className="scope-options"><legend>เลือกขอบเขตสำหรับ Temporary Access นี้</legend>
                <label className="scope-option is-selected is-required"><input type="checkbox" checked disabled /><span><strong>ชื่อและชนิดสัตว์เลี้ยง</strong><small>จำเป็นเพื่อระบุ Pet ที่อยู่ใน access นี้ เหตุผลนี้แสดงไว้ชัดและไม่ขยายไปยัง health data</small></span><span className="scope-option__state"><LockKey size={16} weight="bold" /> จำเป็น</span></label>
                <label className={`scope-option${draft.selectedScope.photo ? " is-selected" : ""}${!pet.photoSrc ? " is-unavailable" : ""}`}><input type="checkbox" checked={draft.selectedScope.photo} disabled={!pet.photoSrc} onChange={(event) => persistDraft((current) => ({ ...current, selectedScope: { ...current.selectedScope, photo: event.target.checked } }), event.target.checked ? "เพิ่มรูปสัตว์เลี้ยงในขอบเขตแล้ว" : "ซ่อนรูปสัตว์เลี้ยงแล้ว")} /><span><strong>รูปสัตว์เลี้ยง · ข้อมูลส่วนบุคคลเพิ่มเติม</strong><small>{pet.photoSrc ? "ไม่ถูกเลือกไว้ล่วงหน้า เลือกเฉพาะเมื่อจำเป็นต่อ purpose นี้" : "Pet นี้ยังไม่มีรูป จึงไม่สามารถแชร์ group นี้"}</small></span><span className="scope-option__state">{draft.selectedScope.photo ? <><Check size={16} weight="bold" /> แชร์</> : <><EyeSlash size={16} weight="bold" /> ซ่อน</>}</span></label>
                <label className={`scope-option${draft.selectedScope.passportReference ? " is-selected" : ""}`}><input type="checkbox" checked={draft.selectedScope.passportReference} onChange={(event) => persistDraft((current) => ({ ...current, selectedScope: { ...current.selectedScope, passportReference: event.target.checked } }), event.target.checked ? "เพิ่มข้อมูลอ้างอิง Pet Passport แล้ว" : "ซ่อนข้อมูลอ้างอิง Pet Passport แล้ว")} /><span><strong>ข้อมูลอ้างอิง Pet Passport</strong><small>แสดงเฉพาะ label ที่ model มีอยู่ ไม่เปิดเอกสารหรือประวัติอื่น</small></span><span className="scope-option__state">{draft.selectedScope.passportReference ? <><Check size={16} weight="bold" /> แชร์</> : <><EyeSlash size={16} weight="bold" /> ซ่อน</>}</span></label>
              </fieldset>
              {fixture === "scope-invalid" ? <p className="inline-warning" role="alert"><CircleAlert size={18} weight="bold" /> Scope fixture ไม่ถูกต้อง กรุณาทบทวนรายการที่แชร์ โดย state ที่เลือกไว้ยังอยู่ครบ</p> : null}
            </section>
            <aside className="scope-live-summary">
              <section className="sharing-summary-card sharing-summary-card--shared"><p className="consumer-kicker">SHARED</p><h2><Eye size={20} weight="bold" /> Business จะเห็น</h2><ul>{selectedScopeKeys(draft).map((key) => <li key={key}><CheckCircle size={17} weight="bold" /> {scopeLabel(key)}</li>)}</ul></section>
              <section className="sharing-summary-card sharing-summary-card--hidden"><p className="consumer-kicker">NOT SHARED / HIDDEN</p><h2><EyeSlash size={20} weight="bold" /> ยังคงซ่อน</h2><ul>{!draft.selectedScope.photo ? <li>รูปสัตว์เลี้ยง</li> : null}{!draft.selectedScope.passportReference ? <li>ข้อมูลอ้างอิง Pet Passport</li> : null}<li>ยา ภูมิแพ้ วัคซีน และข้อมูลสุขภาพ — model นี้ยังไม่มีข้อมูล</li><li>เอกสารอื่นและประวัติธุรกิจ</li><li><strong>Private notes — ไม่แชร์จาก flow นี้</strong></li></ul></section>
            </aside>
          </div>
          <FlowActions back={() => navigate("business")} next={() => navigate("duration")} nextLabel="กำหนดระยะเวลา" />
        </section>
      ) : null}

      {view === "duration" ? (
        <section className="sharing-task sharing-task--narrow" aria-labelledby="duration-heading">
          <FlowHeading headingId="duration-heading" step="SHARE-004 · 3/4" title="กำหนดวันและเวลาหมดอายุ" description="Preset ทั้งหมดเป็นสมมติฐาน Prototype ที่ย้อนกลับได้ เพราะ maximum และ one-time behavior ยังเป็น OQ-B02" />
          <RecipientRibbon business={business} branch={branch?.name ?? null} />
          <div className="sharing-card duration-card"><fieldset className="duration-options"><legend>เลือกระยะเวลา Temporary Access</legend>{DURATION_PRESETS.map((minutes) => <label key={minutes} className={draft.durationMinutes === minutes ? "is-selected" : undefined}><input type="radio" name="duration" aria-label={`Temporary Access ${minutes < 1440 ? `${minutes / 60} ชั่วโมง` : "24 ชั่วโมง"}`} checked={draft.durationMinutes === minutes} onChange={() => persistDraft((current) => ({ ...current, durationMinutes: minutes, durationChosenAt: new Date().toISOString() }), `เลือก ${minutes / 60} ชั่วโมงแล้ว`)} /><span><strong>{minutes < 1440 ? `${minutes / 60} ชั่วโมง` : "24 ชั่วโมง"}</strong><small>Prototype assumption · ยกเลิกก่อนครบเวลาได้</small></span></label>)}</fieldset>
            <section className="exact-expiry" aria-live="polite"><Clock size={28} weight="bold" /><div><p>วันและเวลาสิ้นสุดที่แน่นอน</p><strong>{expiry ? formatSharingDate(expiry) : "เลือก duration เพื่อคำนวณเวลาสิ้นสุด"}</strong><small>แสดงตามเวลาท้องถิ่นของ browser: {browserTimezoneLabel()}</small></div></section>
            <p className="sharing-note"><Info size={18} weight="bold" /> Guardian ยกเลิกสิทธิ์ได้ก่อน expiry จาก Active Access Detail; local clock นี้เป็น presentation behavior ไม่ใช่ production enforcement</p>
            {fixture === "duration-invalid" ? <p className="inline-warning" role="alert"><CircleAlert size={18} weight="bold" /> ค่า duration fixture ไม่ถูกต้อง เลือก preset ใหม่โดยข้อมูล Business และ Scope จะไม่หาย</p> : null}
          </div>
          <FlowActions back={() => navigate("scope")} next={() => navigate("consent")} nextLabel="ตรวจ Consent Summary" disabled={!expiry} />
        </section>
      ) : null}

      {view === "consent" ? (
        <section className="sharing-task sharing-task--review" aria-labelledby="consent-heading">
          <FlowHeading headingId="consent-heading" step="SHARE-005 · 4/4" title="ตรวจ Consent ก่อนสร้าง QR" description="สรุปนี้ใช้ภาษาที่อ่านได้โดยไม่ซ่อนสาระสำคัญไว้ใน Terms" />
          <article className="consent-document">
            <div className="consent-document__type"><QrCode size={24} weight="bold" /><div><p>QR TYPE</p><strong>Temporary Business QR</strong><span>Business-specific · Scoped · Revocable</span></div></div>
            <ConsentRow label="ใครจะเห็น" value={business && branch ? `${business.name} · ${branch.name}` : "ยังไม่ได้เลือก"} action="แก้ Business" onEdit={() => navigate("business")} />
            <ConsentRow label="Pet" value={`${pet.name} · ${speciesLabel(pet.species)}`} />
            <ConsentRow label="ใช้เพื่ออะไร" value={business?.purpose ?? "ยังไม่ได้กำหนด"} />
            <ConsentList label="ข้อมูลที่แชร์" items={selectedScopeKeys(draft).map(scopeLabel)} action="แก้ Scope" onEdit={() => navigate("scope")} tone="shared" />
            <ConsentList label="ข้อมูลที่ซ่อน" items={[...(!draft.selectedScope.photo ? ["รูปสัตว์เลี้ยง"] : []), ...(!draft.selectedScope.passportReference ? ["ข้อมูลอ้างอิง Pet Passport"] : []), "ข้อมูลสุขภาพ ยา ภูมิแพ้ วัคซีน และเอกสารที่ไม่ได้เลือก", "Private notes"]} tone="hidden" />
            <ConsentRow label="เห็นถึงเมื่อไร" value={expiry ? formatSharingDate(expiry) : "ยังไม่ได้กำหนด"} action="แก้ Duration" onEdit={() => navigate("duration")} />
            <ConsentRow label="ยกเลิกอย่างไร" value="เปิด Active Access Detail แล้วเลือก Revoke Temporary Access ได้ก่อน expiry" />
            <section className="consent-consequence"><ShieldCheck size={24} weight="bold" /><div><h2>ผลของการยืนยัน</h2><p>ระบบต้นแบบจะสร้าง QR สำหรับ Business และ Branch ที่ระบุ โดยเปิดเฉพาะ group ด้านบนจนถึงเวลาที่แสดงหรือจนกว่า Guardian จะ revoke</p></div></section>
            {announcement ? <p className="inline-warning" role="alert"><CircleAlert size={18} weight="bold" /> {announcement}</p> : null}
          </article>
          <div className="flow-actions flow-actions--review"><button className="button button--ghost" type="button" onClick={() => navigate("duration")}><ArrowLeft size={18} weight="bold" /> กลับไปแก้</button><button className="button button--primary button--large" type="button" onClick={confirmConsent}><QrCode size={20} weight="bold" /> ยืนยันและสร้าง Temporary Business QR</button></div>
        </section>
      ) : null}

      {view === "qr" ? <TemporaryQrView pet={pet} access={access} onAccess={() => access && navigate("access", access.id)} onRevoke={() => access && navigate("revoke", access.id)} onHistory={() => navigate("history")} /> : null}
      {view === "access" ? <AccessDetailView access={access} onQr={() => access && navigate("qr", access.id)} onRevoke={() => access && navigate("revoke", access.id)} onHistory={() => navigate("history")} /> : null}
      {view === "revoke" ? <RevokeView access={access} complete={revokeComplete} message={announcement} onConfirm={revokeAccess} onBack={() => access && navigate("access", access.id)} onHistory={() => navigate("history")} /> : null}
      {view === "history" ? <HistoryView accesses={accesses} onOpen={(item) => { setAccess(item); navigate("access", item.id); }} onStart={() => { setDraft(readSharingDraft(pet.prototypeSlug)); navigate("start"); }} /> : null}
      {view === "decision" ? <DecisionView pet={pet} access={access} message={announcement} onApprove={() => decideAccess("approved")} onDeny={() => decideAccess("denied")} onDetail={() => access && navigate("access", access.id)} /> : null}
    </div>
  );
}

function StartView({ pet, lifecycleBlocked, activeCount, onStart, onHistory }: { pet: ConsumerPet; lifecycleBlocked: boolean; activeCount: number; onStart: () => void; onHistory: () => void }) {
  return <section className="sharing-start" aria-labelledby="sharing-start-heading"><div className="sharing-start__hero"><div><p className="consumer-kicker">SHARE-001 · TEMPORARY BUSINESS ACCESS</p><h1 id="sharing-start-heading">แชร์ข้อมูลที่จำเป็นให้ Business ชั่วคราว</h1><p>ระบุผู้รับ เลือกข้อมูล กำหนดเวลาสิ้นสุด และยกเลิกได้จาก Access Detail โดย Public Safety QR ยังคงเป็นคนละระบบ</p></div><div className="sharing-pet-summary"><PetPhoto src={pet.photoSrc} name={pet.name} className="pet-photo--card" /><div><small>SELECTED PET</small><strong>{pet.name}</strong><span>{speciesLabel(pet.species)} · {guardianRoleLabel(pet.guardianRole)}</span></div></div></div>
    {lifecycleBlocked ? <div className="sharing-blocker" role="alert"><CircleAlert size={28} weight="bold" /><div><h2>ยังเริ่มการแชร์จากสถานะนี้ไม่ได้</h2><p>Pet อยู่ในสถานะ {pet.lifecycle}. Lifecycle policy ยังเปิดอยู่ จึงใช้ blocker ที่ย้อนกลับได้และไม่เดากติกา production</p><a className="button button--ghost" href={`/my-pets/${pet.prototypeSlug}`}>กลับ Pet Detail</a></div></div> : <><ol className="sharing-promise-list"><li><Storefront size={24} weight="bold" /><span><strong>Business-specific</strong> ระบุชื่อและสาขาก่อนแชร์</span></li><li><Eye size={24} weight="bold" /><span><strong>Scoped</strong> เห็นเฉพาะ group ที่ Guardian เลือก</span></li><li><Clock size={24} weight="bold" /><span><strong>Temporary</strong> แสดงวันและเวลาหมดอายุที่แน่นอน</span></li><li><ShieldCheck size={24} weight="bold" /><span><strong>Revocable</strong> ยกเลิกได้ก่อน expiry พร้อม Access History</span></li></ol><div className="sharing-start__actions"><button className="button button--primary button--large" type="button" onClick={onStart}><Storefront size={20} weight="bold" /> Share with a Business</button><button className="button button--ghost" type="button" onClick={onHistory}>ดู Access History{activeCount ? ` · ${activeCount} active` : ""}</button><a className="button button--ghost" href={`/my-pets/${pet.prototypeSlug}`}>ยกเลิก</a></div><details className="sharing-learn"><summary>Learn how access works</summary><p>QR นี้ไม่ใช่ Public Safety QR, ไม่เปิดทุกข้อมูล, และไม่รับประกัน security ฝั่ง production ซึ่งยังไม่ได้ implement</p></details></>}
  </section>;
}

function FlowHeading({ headingId, step, title, description }: { headingId?: string; step: string; title: string; description: string }) {
  return <header className="sharing-flow-heading"><p className="consumer-kicker">{step}</p><h1 id={headingId}>{title}</h1><p>{description}</p></header>;
}

function FlowActions({ back, next, nextLabel, disabled = false }: { back: () => void; next: () => void; nextLabel: string; disabled?: boolean }) {
  return <div className="flow-actions"><button className="button button--ghost" type="button" onClick={back}><ArrowLeft size={18} weight="bold" /> ย้อนกลับ</button><button className="button button--primary button--large" type="button" disabled={disabled} onClick={next}>{nextLabel} <ArrowRight size={18} weight="bold" /></button></div>;
}

function BusinessVerificationText({ business }: { business: BusinessFixture }) {
  const label = business.verification === "verified" ? "Verified identity fixture" : business.verification === "unverified" ? "Unverified fixture" : business.verification === "pending" ? "Pending fixture" : "Suspended fixture";
  return <span className={`business-verification business-verification--${business.verification}`}><BadgeCheck size={16} weight="bold" /><span><b>{label}</b><small>{business.verificationExplanation}</small></span></span>;
}

function RecipientRibbon({ business, branch }: { business: BusinessFixture | null; branch: string | null }) {
  return <div className="recipient-ribbon"><Storefront size={22} weight="bold" /><span><small>RECIPIENT</small><strong>{business && branch ? `${business.name} · ${branch}` : "กลับไปเลือก Business และ Branch"}</strong></span></div>;
}

function ConsentRow({ label, value, action, onEdit }: { label: string; value: string; action?: string; onEdit?: () => void }) {
  return <section className="consent-row"><div><p>{label}</p><strong>{value}</strong></div>{action && onEdit ? <button type="button" onClick={onEdit}>{action}</button> : null}</section>;
}

function ConsentList({ label, items, action, onEdit, tone }: { label: string; items: string[]; action?: string; onEdit?: () => void; tone: "shared" | "hidden" }) {
  return <section className={`consent-row consent-row--list consent-row--${tone}`}><div><p>{label}</p><ul>{items.map((item) => <li key={item}>{tone === "shared" ? <Check size={16} weight="bold" /> : <EyeSlash size={16} weight="bold" />} {item}</li>)}</ul></div>{action && onEdit ? <button type="button" onClick={onEdit}>{action}</button> : null}</section>;
}

function TemporaryQrView({ pet, access, onAccess, onRevoke, onHistory }: { pet: ConsumerPet; access: TemporaryAccess | null; onAccess: () => void; onRevoke: () => void; onHistory: () => void }) {
  if (!access) return <MissingAccessState />;
  const business = getBusinessFixture(access.businessId);
  const branch = getBusinessBranch(business, access.branchId);
  const gatewayPath = `/temporary-access/${access.id}`;
  const qrValue = typeof window === "undefined" ? `https://prototype.local${gatewayPath}` : `${window.location.origin}${gatewayPath}`;
  const showQr = access.status === "ready" || access.status === "active" || access.status === "awaiting-owner";
  return <section className="sharing-task sharing-task--qr" aria-labelledby="temporary-qr-heading"><FlowHeading headingId="temporary-qr-heading" step="SHARE-006" title="Temporary Business QR" description="ให้ Business ที่ระบุเปิด gateway นี้; QR ไม่ใช่ Public Safety identity และไม่มี Lost Mode" /><div className="temporary-qr-card"><div className="temporary-qr-card__status"><AccessStatusBadge access={access} /><span>Temporary Business QR</span></div>{showQr ? <div className="temporary-qr-visual"><QRCodeSVG value={qrValue} size={232} level="M" marginSize={3} bgColor="var(--color-meaw-white)" fgColor="var(--color-meaw-ink-950)" title={`Temporary Business QR สำหรับ ${business?.name ?? "Business fixture"}`} /></div> : <div className="temporary-qr-unavailable"><CircleAlert size={40} weight="bold" /><strong>QR นี้ไม่พร้อมให้ใช้แล้ว</strong><p>{accessStatusLabel(access.status)}</p></div>}<dl className="temporary-qr-facts"><div><dt>Business / Branch</dt><dd>{business?.name ?? "Unknown fixture"}<br />{branch?.name ?? "Unknown branch"}</dd></div><div><dt>Purpose</dt><dd>{access.purpose}</dd></div><div><dt>Pet</dt><dd>{pet.name}</dd></div><div><dt>หมดอายุ</dt><dd>{formatSharingDate(access.expiresAt)}</dd></div><div><dt>ขอบเขต</dt><dd>{access.scope.map(scopeLabel).join(" · ")}</dd></div><div><dt>Fallback code</dt><dd><code>{access.fallbackCode}</code></dd></div></dl><p className="sharing-note"><Info size={18} weight="bold" /> QR สามารถถูกบันทึกเป็นภาพได้ สิทธิ์นี้เป็นแบบชั่วคราวและ revoke ได้; ไม่มีการอ้างว่าป้องกัน screenshot หรือ enforce security จริง</p><div className="temporary-qr-actions">{showQr ? <a className="button button--primary" href={gatewayPath}><QrCode size={19} weight="bold" /> เปิด Gateway Demo</a> : null}<button className="button button--ghost" type="button" onClick={onAccess}>ดู Active Access Detail</button>{showQr ? <button className="button button--ghost" type="button" onClick={onRevoke}>Revoke access</button> : null}<button className="button button--ghost" type="button" onClick={onHistory}>Access History</button></div></div></section>;
}

function AccessStatusBadge({ access }: { access: TemporaryAccess }) {
  return <span className={`temporary-access-status temporary-access-status--${access.status}`}><span aria-hidden="true" /> {accessStatusLabel(access.status)}</span>;
}

function AccessDetailView({ access, onQr, onRevoke, onHistory }: { access: TemporaryAccess | null; onQr: () => void; onRevoke: () => void; onHistory: () => void }) {
  if (!access) return <MissingAccessState />;
  const business = getBusinessFixture(access.businessId);
  const branch = getBusinessBranch(business, access.branchId);
  const revocable = access.status === "active" || access.status === "ready" || access.status === "awaiting-owner";
  return <section className="sharing-task" aria-labelledby="access-detail-heading"><FlowHeading headingId="access-detail-heading" step="SHARE-009" title="Active Access Detail" description="ดูว่าใครยังเห็นอะไร อยู่ในสถานะใด และถึงเมื่อไร" /><div className="access-detail-layout"><section className="sharing-card"><div className="access-detail-title"><Storefront size={28} weight="bold" /><div><p className="consumer-kicker">TEMPORARY BUSINESS ACCESS</p><h2>{business?.name ?? "Business fixture"}</h2><span>{branch?.name ?? "Branch unavailable"}</span></div><AccessStatusBadge access={access} /></div><dl className="access-detail-facts"><div><dt>Purpose</dt><dd>{access.purpose}</dd></div><div><dt>Shared scope</dt><dd>{access.scope.map(scopeLabel).join(" · ")}</dd></div><div><dt>สร้างเมื่อ</dt><dd>{formatSharingDate(access.createdAt)}</dd></div><div><dt>หมดอายุ</dt><dd>{formatSharingDate(access.expiresAt)}</dd></div>{access.revokedAt ? <div><dt>ยกเลิกเมื่อ</dt><dd>{formatSharingDate(access.revokedAt)}</dd></div> : null}</dl><div className="access-detail-actions"><button type="button" className="button button--ghost" onClick={onQr}>ดู Temporary QR</button>{revocable ? <button type="button" className="button button--dark" onClick={onRevoke}>Revoke Temporary Access</button> : null}<button type="button" className="button button--ghost" onClick={onHistory}>Access History</button></div></section><aside className="sharing-summary-card access-events"><p className="consumer-kicker">ACCESS EVENTS · PROTOTYPE</p><h2>เหตุการณ์ของสิทธิ์นี้</h2><ol>{[...access.events].reverse().map((item) => <li key={item.id}><span /><div><strong>{item.summary}</strong><small>{item.actor} · {formatSharingDate(item.occurredAt)}</small></div></li>)}</ol><p>History นี้ไม่บันทึกค่าข้อมูลสุขภาพหรือ field values</p></aside></div></section>;
}

function RevokeView({ access, complete, message, onConfirm, onBack, onHistory }: { access: TemporaryAccess | null; complete: boolean; message: string; onConfirm: () => void; onBack: () => void; onHistory: () => void }) {
  if (!access) return <MissingAccessState />;
  const business = getBusinessFixture(access.businessId);
  if (complete || access.status === "revoked") return <section className="sharing-task sharing-task--narrow"><div className="revoke-result"><CheckCircle size={44} weight="bold" /><p className="consumer-kicker">SHARE-010 · RESULT</p><h1>ยกเลิก Temporary Access แล้ว</h1><p>{business?.name ?? "Business fixture"} จะไม่สามารถเปิดข้อมูลผ่าน access นี้ต่อใน prototype presentation</p><p className="sharing-note"><Info size={18} weight="bold" /> ผลต่อ Service Session จริงยังเป็น future production policy และไม่ได้ถูกยกเลิกโดยหน้าจอนี้</p><div className="revoke-result__actions"><button className="button button--primary" type="button" onClick={onHistory}>ดู Access History</button><button className="button button--ghost" type="button" onClick={onBack}>ดูรายละเอียด</button></div></div></section>;
  return <section className="sharing-task sharing-task--narrow" aria-labelledby="revoke-heading"><FlowHeading headingId="revoke-heading" step="SHARE-010 · L2" title="ยกเลิก Temporary Access นี้หรือไม่" description="ตรวจผลกระทบก่อนยืนยัน การยกเลิกเปลี่ยนเฉพาะ access นี้" /><div className="revoke-confirm"><ShieldCheck size={34} weight="bold" /><h2>{business?.name ?? "Business fixture"}</h2><ul><li>Business จะไม่สามารถเปิดข้อมูลผ่าน access นี้ต่อ</li><li>ขอบเขตเดิมจะยังปรากฏเป็นชื่อ group ใน Access History</li><li>ไม่ได้อ้างว่ายกเลิก Service Session, booking หรือ operation จริง</li></ul><dl><div><dt>หมดอายุเดิม</dt><dd>{formatSharingDate(access.expiresAt)}</dd></div><div><dt>สถานะปัจจุบัน</dt><dd>{accessStatusLabel(access.status)}</dd></div></dl>{message ? <p className="inline-warning" role="alert"><CircleAlert size={18} weight="bold" /> {message}</p> : null}<div className="flow-actions"><button className="button button--ghost" type="button" onClick={onBack}>ยังไม่ยกเลิก</button><button className="button button--dark button--large" type="button" onClick={onConfirm}>Revoke Temporary Access</button></div></div></section>;
}

function HistoryView({ accesses, onOpen, onStart }: { accesses: TemporaryAccess[]; onOpen: (access: TemporaryAccess) => void; onStart: () => void }) {
  return <section className="sharing-task" aria-labelledby="history-heading"><FlowHeading headingId="history-heading" step="SHARE-011" title="Access History" description="ประวัตินี้ตอบว่าใครเข้าถึงข้อมูลเมื่อไร ไม่ใช่ Service History หรือรายการบริการที่ Pet ได้รับ" />{accesses.length === 0 ? <div className="sharing-empty-history"><Clock size={38} weight="bold" /><h2>ยังไม่มีประวัติการแชร์</h2><p>เมื่อสร้าง Temporary Business Access รายการจะปรากฏที่นี่</p><button className="button button--primary" type="button" onClick={onStart}>เริ่ม Share with a Business</button></div> : <div className="access-history-list">{accesses.map((item) => { const business = getBusinessFixture(item.businessId); const branch = getBusinessBranch(business, item.branchId); return <article className="access-history-card" key={item.id}><div className="access-history-card__main"><Storefront size={24} weight="bold" /><div><h2>{business?.name ?? "Business fixture"}</h2><p>{branch?.name ?? "Branch unavailable"}</p></div><AccessStatusBadge access={item} /></div><dl><div><dt>สร้าง</dt><dd>{formatSharingDate(item.createdAt)}</dd></div><div><dt>หมดอายุ</dt><dd>{formatSharingDate(item.expiresAt)}</dd></div>{item.revokedAt ? <div><dt>ยกเลิก</dt><dd>{formatSharingDate(item.revokedAt)}</dd></div> : null}<div><dt>Events</dt><dd>{item.events.length} รายการ</dd></div></dl><button type="button" className="button button--ghost" onClick={() => onOpen(item)}>เปิด Access Detail</button></article>; })}</div>}<div className="history-actions"><button className="button button--primary" type="button" onClick={onStart}>สร้าง Temporary Access ใหม่</button><a className="button button--ghost" href="/my-pets">กลับ My Pets</a></div></section>;
}

function DecisionView({ pet, access, message, onApprove, onDeny, onDetail }: { pet: ConsumerPet; access: TemporaryAccess | null; message: string; onApprove: () => void; onDeny: () => void; onDetail: () => void }) {
  if (!access) return <MissingAccessState />;
  const business = getBusinessFixture(access.businessId);
  const branch = getBusinessBranch(business, access.branchId);
  if (access.status !== "awaiting-owner") return <section className="sharing-task sharing-task--review"><div className="decision-complete"><CheckCircle size={40} weight="bold" /><p className="consumer-kicker">SHARE-008 · DECIDED</p><h1>คำขอนี้ถูกตัดสินแล้ว</h1><p>{accessStatusLabel(access.status)} ระบบต้นแบบป้องกันการตัดสินซ้ำ</p><button type="button" className="button button--primary" onClick={onDetail}>เปิด Access Detail</button></div></section>;
  return <section className="sharing-task sharing-task--review" aria-labelledby="decision-heading"><FlowHeading headingId="decision-heading" step="SHARE-008" title="ทบทวนคำขอจาก Business" description="การ Approve จะเปิดเฉพาะขอบเขตเดิมจนถึงเวลาที่กำหนด ส่วน Deny เป็น safe action และไม่ลบประวัติ" /><article className="consent-document"><div className="requester-card"><UserRoundCheck size={28} weight="bold" /><div><p>REQUESTER FIXTURE</p><strong>{access.requester ?? "Front desk member (Demo)"}</strong><span>ผู้รับข้อมูล ไม่ใช่ Pet owner และยังไม่มี membership check จริง</span></div></div><ConsentRow label="Business / Branch" value={`${business?.name ?? "Business fixture"} · ${branch?.name ?? "Branch fixture"}`} /><ConsentRow label="Pet" value={`${pet.name} · ${speciesLabel(pet.species)}`} /><ConsentRow label="Purpose" value={access.purpose} /><ConsentList label="Requested scope" items={access.scope.map(scopeLabel)} tone="shared" /><ConsentRow label="Duration / Expiry" value={formatSharingDate(access.expiresAt)} />{message ? <p className="inline-warning" role="status"><Info size={18} weight="bold" /> {message}</p> : null}<div className="decision-actions"><button type="button" className="button button--primary button--large" onClick={onApprove}>Approve Temporary Access</button><button type="button" className="button button--ghost button--large" onClick={onDeny}>Deny request</button></div></article></section>;
}

function MissingAccessState() {
  return <section className="sharing-task sharing-task--narrow"><div className="sharing-inline-state" role="alert"><CircleAlert size={32} weight="bold" /><div><h1>ไม่พบ Temporary Access</h1><p>ลิงก์อาจไม่ตรงกับ state ในแท็บนี้ เราไม่ได้แสดงข้อมูลของ access อื่นแทน</p><a className="button button--ghost" href="/my-pets">กลับ My Pets</a></div></div></section>;
}

function ShareLoading() {
  return <div className="sharing-page shell" aria-busy="true"><section className="flow-loading-card"><QrCode size={28} weight="bold" /> กำลังเปิด Temporary Business Sharing</section></div>;
}

function ShareRecovery({ title, message }: { title: string; message: string }) {
  return <div className="sharing-page shell"><section className="consumer-recovery" role="alert"><CircleAlert size={40} weight="bold" /><p className="consumer-kicker">Sharing recovery</p><h1>{title}</h1><p>{message}</p><div className="consumer-recovery__actions"><a className="button button--ghost" href="/my-pets">กลับ My Pets</a></div></section></div>;
}
