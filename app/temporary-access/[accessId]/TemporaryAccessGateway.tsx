"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getPrototypePetBySlug, speciesLabel } from "../../_prototype/consumerPets";
import type { TemporaryAccess } from "../../_prototype/sharingState";
import {
  BUSINESS_FIXTURES,
  accessStatusLabel,
  addAccessEvent,
  formatSharingDate,
  getBusinessBranch,
  getBusinessFixture,
  readTemporaryAccess,
  scopeLabel,
  updateTemporaryAccess,
} from "../../_prototype/sharingState";
import {
  ArrowLeft,
  CheckCircle,
  CircleAlert,
  Clock,
  Eye,
  IdentificationCard,
  Info,
  LockKey,
  QrCode,
  ShieldCheck,
  Storefront,
  UserRoundCheck,
  WifiOff,
} from "../../_components/icons";
import { PetPhoto } from "../../my-pets/_components/PetPhoto";

type GatewayState = "checking" | "valid" | "invalid" | "expired" | "revoked" | "wrong-business" | "suspicious" | "network-error";

export function TemporaryAccessGateway({ accessId }: { accessId: string }) {
  const [gatewayState, setGatewayState] = useState<GatewayState>("checking");
  const [access, setAccess] = useState<TemporaryAccess | null>(null);
  const [businessId, setBusinessId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [contextValidated, setContextValidated] = useState(false);
  const [protectedView, setProtectedView] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const load = useCallback(() => {
    const fixture = new URLSearchParams(window.location.search).get("fixture");
    if (fixture === "network") { setGatewayState("network-error"); return; }
    if (fixture === "suspicious") { setGatewayState("suspicious"); return; }
    if (fixture === "invalid") { setGatewayState("invalid"); return; }
    if (fixture === "expired") { setGatewayState("expired"); return; }
    if (fixture === "revoked") { setGatewayState("revoked"); return; }
    if (fixture === "wrong-business") { setGatewayState("wrong-business"); return; }
    const found = readTemporaryAccess(accessId);
    if (!found) { setGatewayState("invalid"); return; }
    setAccess(found);
    if (found.status === "expired") { setGatewayState("expired"); return; }
    if (found.status === "revoked") { setGatewayState("revoked"); return; }
    if (found.status === "denied" || found.status === "cancelled") { setGatewayState("invalid"); return; }
    setGatewayState("valid");
  }, [accessId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(load);
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  const selectedBusiness = useMemo(() => getBusinessFixture(businessId), [businessId]);
  const selectedBranch = useMemo(() => getBusinessBranch(selectedBusiness, branchId), [selectedBusiness, branchId]);
  const intendedBusiness = useMemo(() => getBusinessFixture(access?.businessId ?? null), [access?.businessId]);
  const intendedBranch = useMemo(() => getBusinessBranch(intendedBusiness, access?.branchId ?? null), [intendedBusiness, access?.branchId]);
  const protectedPet = protectedView && access ? getPrototypePetBySlug(access.petSlug) : null;

  function validateContext() {
    if (!access || !selectedBusiness || !selectedBranch) {
      setAnnouncement("เลือก Business และ Branch fixture ก่อนตรวจ context");
      return;
    }
    if (selectedBusiness.id !== access.businessId || selectedBranch.id !== access.branchId) {
      setGatewayState("wrong-business");
      setContextValidated(false);
      return;
    }
    const checked = addAccessEvent(access, "gateway-checked", "Business context fixture", "ตรวจ Business และ Branch context แบบ UI prototype");
    updateTemporaryAccess(checked);
    setAccess(checked);
    setContextValidated(true);
    setAnnouncement("Business และ Branch fixture ตรงกับ Temporary Access แล้ว");
  }

  function submitRequest() {
    if (!access || !intendedBusiness || !contextValidated) return;
    const current = readTemporaryAccess(access.id);
    if (!current || current.status === "expired" || current.status === "revoked") {
      setGatewayState(current?.status === "revoked" ? "revoked" : "expired");
      setProtectedView(false);
      return;
    }
    if (current.status === "awaiting-owner") {
      setAccess(current);
      setAnnouncement("คำขอนี้กำลังรอ Guardian ตัดสินใจ ข้อมูล Pet ยังไม่ถูกเปิด");
      return;
    }
    const requester = "Front desk member (Demo)";
    if (intendedBusiness.requestMode === "additional-owner-decision" && current.status === "ready") {
      const requested = addAccessEvent({ ...current, status: "awaiting-owner", requester }, "request-sent", requester, "ส่งคำขอเพื่อรอ Guardian ตัดสินใจเพิ่มเติม");
      updateTemporaryAccess(requested);
      setAccess(requested);
      setAnnouncement("ส่งคำขอแล้ว ข้อมูล Pet ยังไม่ถูกเปิดจนกว่า Guardian จะ Approve");
      return;
    }
    const active = addAccessEvent({ ...current, status: "active", requester }, "request-sent", requester, "ยืนยัน Business context และขอเปิด scoped access");
    const viewed = addAccessEvent(active, "viewed", requester, "เปิดข้อมูลเฉพาะ group ที่ Guardian อนุญาต");
    updateTemporaryAccess(viewed);
    setAccess(viewed);
    setProtectedView(true);
    setAnnouncement("เปิดเฉพาะข้อมูลที่ได้รับ consent แล้วใน prototype view");
  }

  if (gatewayState === "checking") {
    return <div className="temporary-gateway shell" aria-busy="true" aria-live="polite"><section className="gateway-checking"><QrCode size={36} weight="bold" /><p className="consumer-kicker">PUB-007 · TEMPORARY BUSINESS QR</p><h1>กำลังตรวจสถานะ Temporary Access</h1><p>ยังไม่แสดงชื่อ รูป หรือข้อมูลการดูแลของ Pet ระหว่างตรวจ</p></section></div>;
  }

  if (gatewayState !== "valid") {
    const stateCopy: Record<Exclude<GatewayState, "checking" | "valid">, { title: string; message: string; icon: "alert" | "offline" }> = {
      invalid: { title: "Temporary QR ไม่ถูกต้อง", message: "ไม่พบ access ที่ใช้ได้ เราไม่ยืนยันว่า Pet รายการใดอยู่เบื้องหลังลิงก์นี้", icon: "alert" },
      expired: { title: "Temporary Access หมดอายุแล้ว", message: "ขอให้ Guardian สร้าง QR ใหม่ เราไม่แสดงข้อมูล Pet จากสิทธิ์เดิม", icon: "alert" },
      revoked: { title: "Guardian ยกเลิกสิทธิ์นี้แล้ว", message: "Business ไม่สามารถเปิดข้อมูลผ่าน access นี้ต่อ และหน้าจอนี้ไม่แสดงข้อมูลเดิม", icon: "alert" },
      "wrong-business": { title: "Business หรือ Branch ไม่ตรง", message: "สลับไปยัง context ที่ถูกต้องหรือขอ QR ใหม่ โดยยังไม่เปิดข้อมูล Pet", icon: "alert" },
      suspicious: { title: "หยุดการเปิด access ชั่วคราว", message: "fixture นี้แสดง suspicious state กรุณาขอให้ Guardian ตรวจ QR ใหม่ โดยไม่มีข้อมูล Pet ถูกเปิด", icon: "alert" },
      "network-error": { title: "ตรวจ Temporary Access ไม่สำเร็จ", message: "ลองใหม่เมื่อการเชื่อมต่อพร้อม เราไม่แสดง cached Pet data ระหว่าง error", icon: "offline" },
    };
    const copy = stateCopy[gatewayState];
    return <SafeGatewayState
      title={copy.title}
      message={copy.message}
      offline={copy.icon === "offline"}
      retryLabel={gatewayState === "wrong-business" ? "เลือก Business context ใหม่" : undefined}
      onRetry={gatewayState === "network-error" ? load : gatewayState === "wrong-business" && access ? () => {
        setGatewayState("valid");
        setBusinessId("");
        setBranchId("");
        setAnnouncement("");
      } : undefined}
    />;
  }

  if (!access) return <SafeGatewayState title="Temporary QR ไม่ถูกต้อง" message="ไม่พบ access ที่ใช้ได้ และไม่มีข้อมูล Pet ถูกเปิด" />;

  return <div className="temporary-gateway shell"><header className="gateway-header"><div className="gateway-type"><QrCode size={28} weight="bold" /><div><p>PUB-007</p><strong>Temporary Business QR</strong><span>ไม่ใช่ Public Safety QR</span></div></div><span className="gateway-status"><CheckCircle size={18} weight="bold" /> Token presentation valid</span></header><p className="prototype-boundary"><CircleAlert size={17} weight="bold" /> UI PROTOTYPE ONLY · การเลือก context ด้านล่างไม่พิสูจน์ membership, role หรือ ownership จริง</p><p className="sr-live" aria-live="polite">{announcement}</p>

    {!contextValidated ? <section className="gateway-context" aria-labelledby="gateway-context-heading"><LockKey size={36} weight="bold" /><p className="consumer-kicker">BUSINESS CONTEXT REQUIRED</p><h1 id="gateway-context-heading">ยืนยัน Business และ Branch ก่อน</h1><p>ก่อนผ่าน boundary นี้ เราแสดงเฉพาะประเภท QR, token presentation status และแบบเลือก Business context เท่านั้น</p><div className="gateway-context-form"><label><span>Business fixture</span><select value={businessId} onChange={(event) => { setBusinessId(event.target.value); setBranchId(""); setAnnouncement(""); }}><option value="">เลือก Business</option>{BUSINESS_FIXTURES.filter((item) => item.verification !== "suspended").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.type}</option>)}</select></label><label><span>Branch fixture</span><select value={branchId} disabled={!selectedBusiness} onChange={(event) => setBranchId(event.target.value)}><option value="">เลือก Branch</option>{selectedBusiness?.branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="gateway-role"><UserRoundCheck size={20} weight="bold" /><span><strong>Front desk member (Demo)</strong><small>Role fixture เพื่ออธิบาย context เท่านั้น</small></span></div><button className="button button--primary button--large" type="button" onClick={validateContext} disabled={!businessId || !branchId}>ตรวจ Business context แบบ Prototype</button></div></section> : null}

    {contextValidated && !protectedView ? <section className="business-request" aria-labelledby="business-request-heading"><div className="business-request__heading"><Storefront size={32} weight="bold" /><div><p className="consumer-kicker">SHARE-007 · BUSINESS ACCESS REQUEST</p><h1 id="business-request-heading">ยืนยันคำขอเข้าถึงชั่วคราว</h1></div></div><div className="gateway-boundary-note"><LockKey size={22} weight="bold" /><p>ยังไม่แสดงชื่อ รูป หรือค่าข้อมูลของ Pet จนกว่า consent status จะ Active</p></div><dl className="business-request-facts"><div><dt>Recipient</dt><dd>{intendedBusiness?.name}<br />{intendedBranch?.name}</dd></div><div><dt>Member / Role fixture</dt><dd>{access.requester ?? "Front desk member (Demo)"}<br /><small>Business เป็นผู้รับข้อมูล ไม่ใช่ Pet owner</small></dd></div><div><dt>Purpose</dt><dd>{access.purpose}</dd></div><div><dt>Requested scope labels</dt><dd>{access.scope.map(scopeLabel).join(" · ")}</dd></div><div><dt>Expiry</dt><dd>{formatSharingDate(access.expiresAt)}</dd></div><div><dt>Consent status</dt><dd>{access.status === "awaiting-owner" ? "รอ Guardian ตัดสินใจเพิ่มเติม" : accessStatusLabel(access.status)}</dd></div></dl>{access.status === "awaiting-owner" ? <div className="gateway-pending"><Clock size={28} weight="bold" /><h2>รอ Guardian ตัดสินใจ</h2><p>ข้อมูล Pet ยังไม่ถูกเปิด เจ้าของสามารถ Approve หรือ Deny จาก owner fixture</p><a className="button button--ghost" href={`/my-pets/${access.petSlug}/sharing?view=decision&accessId=${encodeURIComponent(access.id)}`}>เปิด Owner Consent Decision Demo</a></div> : <button className="button button--primary button--large" type="button" onClick={submitRequest}>{intendedBusiness?.requestMode === "additional-owner-decision" ? "ส่งคำขอให้ Guardian" : "Continue scoped temporary access"}</button>}<button className="button button--ghost" type="button" onClick={() => { setContextValidated(false); setBusinessId(""); setBranchId(""); }}>เปลี่ยน Business / Branch</button></section> : null}

    {protectedView && protectedPet ? <section className="protected-access" aria-labelledby="protected-access-heading"><div className="protected-access__status"><ShieldCheck size={26} weight="bold" /><div><p>ACTIVE TEMPORARY ACCESS</p><strong>แสดงเฉพาะข้อมูลที่ Guardian อนุญาต</strong><span>สิ้นสุด {formatSharingDate(access.expiresAt)}</span></div></div><div className="protected-access__identity">{access.scope.includes("photo") ? <PetPhoto src={protectedPet.photoSrc} name={protectedPet.name} className="pet-photo--card" /> : <span className="protected-photo-hidden"><LockKey size={28} weight="bold" /><small>Photo not shared</small></span>}<div><p className="consumer-kicker">SCOPED PET VIEW · NO OPERATIONS</p><h1 id="protected-access-heading">{protectedPet.name}</h1><p>{speciesLabel(protectedPet.species)}</p></div></div><dl className="protected-scope-values"><div><dt>ชื่อและชนิด</dt><dd>{protectedPet.name} · {speciesLabel(protectedPet.species)}</dd></div>{access.scope.includes("passportReference") ? <div><dt>Pet Passport reference</dt><dd>{protectedPet.passportLabel}</dd></div> : null}</dl><section className="protected-hidden"><LockKey size={22} weight="bold" /><div><h2>ข้อมูลที่ไม่อยู่ใน access นี้</h2><p>ยา ภูมิแพ้ วัคซีน เอกสาร ประวัติธุรกิจ และ Private notes ไม่ถูกเปิด เพราะ model/consent นี้ไม่ได้อนุญาต</p></div></section><p className="sharing-note"><Info size={18} weight="bold" /> Phase D จบที่ scoped data view นี้ ไม่มี Scanner, Intake, Check-in หรือ Service Session</p><button className="button button--ghost" type="button" onClick={() => setProtectedView(false)}><ArrowLeft size={18} weight="bold" /> กลับ Request Detail</button></section> : null}
  </div>;
}

function SafeGatewayState({ title, message, offline = false, retryLabel = "ลองตรวจอีกครั้ง", onRetry }: { title: string; message: string; offline?: boolean; retryLabel?: string; onRetry?: () => void }) {
  const Icon = offline ? WifiOff : CircleAlert;
  return <div className="temporary-gateway shell"><section className="gateway-safe-state" role="alert"><Icon size={44} weight="bold" /><p className="consumer-kicker">PUB-007 · TEMPORARY BUSINESS QR</p><h1>{title}</h1><p>{message}</p><div className="gateway-safe-facts"><span><QrCode size={18} weight="bold" /> QR type: Temporary Business QR</span><span><IdentificationCard size={18} weight="bold" /> Pet identity: not disclosed</span><span><Eye size={18} weight="bold" /> Protected data: not disclosed</span></div><div className="gateway-safe-actions">{onRetry ? <button className="button button--primary" type="button" onClick={onRetry}>{retryLabel}</button> : null}<a className="button button--ghost" href="/">กลับหน้าแรก</a></div></section></div>;
}
