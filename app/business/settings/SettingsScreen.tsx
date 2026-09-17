"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  BUSINESS_SERVICE_MODULES,
  BUSINESS_WEEKDAY_LABELS,
  TEAM_MEMBER_CAPABILITY_LABELS,
  createDefaultOperatingHours,
  getBookingServices,
  getDemoBusinessContextDetails,
  getDemoBusinessContextForBranch,
  getPrototypeBusinessProfile,
  getHotelRooms,
  getPrototypeDaycareZones,
  listPrototypeBusinessBranches,
  listPrototypeTeamMemberFixtures,
  listPrototypeTeamMembers,
  type BusinessServiceModule,
  type BusinessWeekday,
  type PrototypeBusinessBranch,
  type PrototypeBusinessBranchDraft,
  type PrototypeBusinessProfileDraft,
  type PrototypeOperatingHoursEntry,
  type PrototypeTeamMember,
} from "../../_prototype/businessState";
import {
  Be1ClientError,
  saveDurableBranch,
  setDurableBranchActive,
  updateDurableBusiness,
} from "../../_backend/be1/client";
import {
  CheckCircle,
  ChevronRight,
  Clock,
  FileImage,
  MapPin,
  Pencil,
  Plus,
  Save,
  Settings,
  Storefront,
  UsersRound,
} from "../../_components/icons";
import { BusinessAlert } from "../_components/BusinessFeedback";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { useBusinessContext, useBusinessStateReady } from "../_components/useBusinessContext";

type SettingsSection = "profile" | "branches";
type SettingsNotice = {
  businessId: string;
  tone: "success" | "critical" | "info";
  title: string;
  detail: string;
};

const MODULES = Object.entries(BUSINESS_SERVICE_MODULES) as [BusinessServiceModule, { label: string }][];
const emptySubscribe = () => () => {};

function readRequestedSection(): SettingsSection {
  return new URLSearchParams(window.location.search).get("section") === "branches" ? "branches" : "profile";
}

function emptyBranchDraft(businessId: string): PrototypeBusinessBranchDraft {
  return {
    businessId,
    name: "",
    area: "",
    address: "",
    phone: "",
    email: "",
    active: true,
    enabledModules: ["grooming"],
    operatingHours: createDefaultOperatingHours(),
  };
}

function profileToDraft(businessId: string, fixtureOnly = false): PrototypeBusinessProfileDraft {
  const profile = getPrototypeBusinessProfile(businessId, fixtureOnly);
  return profile ? {
    businessId: profile.businessId,
    name: profile.name,
    logoDataUrl: profile.logoDataUrl,
    contactName: profile.contactName,
    phone: profile.phone,
    email: profile.email,
    description: profile.description,
    address: profile.address,
  } : {
    businessId,
    name: "",
    logoDataUrl: null,
    contactName: "",
    phone: "",
    email: "",
    description: "",
    address: "",
  };
}

function branchToDraft(branch: PrototypeBusinessBranch): PrototypeBusinessBranchDraft {
  return {
    branchId: branch.branchId,
    businessId: branch.businessId,
    name: branch.name,
    area: branch.area,
    address: branch.address,
    phone: branch.phone,
    email: branch.email,
    active: branch.active,
    enabledModules: [...branch.enabledModules],
    operatingHours: branch.operatingHours.map((entry) => ({ ...entry })),
  };
}

function branchFailureMessage(error: unknown) {
  const code = error instanceof Be1ClientError ? error.code : "PERSISTENCE_ERROR";
  if (code === "CONFLICT") return "มีสาขาชื่อนี้อยู่แล้ว กรุณาใช้ชื่อที่ต่างออกไป";
  if (code === "LAST_ACTIVE_BRANCH") return "ต้องมีสาขาที่เปิดใช้งานอย่างน้อย 1 สาขา";
  if (code === "FORBIDDEN") return "บัญชีนี้ไม่มีสิทธิ์แก้ไขการตั้งค่าสาขา";
  if (code === "AUTHENTICATION_NOT_CONFIGURED" || code === "UNAUTHENTICATED") return "ยังเชื่อมต่อข้อมูลผู้ใช้งานไม่ได้ กรุณาลองอีกครั้ง";
  if (code === "PERSISTENCE_ERROR") return "ระบบยังบันทึกข้อมูลไม่ได้ กรุณาลองอีกครั้ง";
  return "ตรวจชื่อสาขาและเวลาทำการ แล้วลองบันทึกอีกครั้ง";
}

export function SettingsScreen() {
  const { context, revision, selectContext } = useBusinessContext();
  const stateReady = useBusinessStateReady();
  const requestedSection = useSyncExternalStore(emptySubscribe, readRequestedSection, () => "profile" as const);
  const [sectionOverride, setSectionOverride] = useState<SettingsSection | null>(null);
  const section = sectionOverride ?? requestedSection;
  const [profileDrafts, setProfileDrafts] = useState<Record<string, PrototypeBusinessProfileDraft>>({});
  const profileDraft = profileDrafts[context.businessId] ?? profileToDraft(context.businessId, !stateReady);
  const [editingBranch, setEditingBranch] = useState<PrototypeBusinessBranchDraft | null>(null);
  const branchEditorTriggerRef = useRef<HTMLElement | null>(null);
  const [notice, setNotice] = useState<SettingsNotice | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const currentEditingBranch = editingBranch?.businessId === context.businessId ? editingBranch : null;
  const currentNotice = notice?.businessId === context.businessId ? notice : null;

  const details = getDemoBusinessContextDetails(context, !stateReady);
  const branches = useMemo(() => {
    void revision;
    return listPrototypeBusinessBranches(context.businessId, { includeInactive: true, fixtureOnly: !stateReady });
  }, [context.businessId, revision, stateReady]);
  const team = stateReady ? listPrototypeTeamMembers() : listPrototypeTeamMemberFixtures();

  function selectSection(next: SettingsSection) {
    setSectionOverride(next);
    setNotice(null);
    const url = new URL(window.location.href);
    if (next === "branches") url.searchParams.set("section", "branches");
    else url.searchParams.delete("section");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function updateProfileDraft(next: PrototypeBusinessProfileDraft | ((current: PrototypeBusinessProfileDraft) => PrototypeBusinessProfileDraft)) {
    setProfileDrafts((current) => {
      const existing = current[context.businessId] ?? profileToDraft(context.businessId);
      return { ...current, [context.businessId]: typeof next === "function" ? next(existing) : next };
    });
  }

  function showNotice(next: Omit<SettingsNotice, "businessId">) {
    setNotice({ ...next, businessId: context.businessId });
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await updateDurableBusiness({
        businessId: profileDraft.businessId,
        name: profileDraft.name,
        contactName: profileDraft.contactName,
        phone: profileDraft.phone,
        email: profileDraft.email,
        description: profileDraft.description,
        address: profileDraft.address,
      });
      showNotice({ tone: "success", title: "บันทึกข้อมูลร้านแล้ว", detail: "ชื่อและข้อมูลติดต่อใหม่จะแสดงในทุกส่วนของระบบ" });
    } catch (error) {
      const forbidden = error instanceof Be1ClientError && error.code === "FORBIDDEN";
      showNotice({
        tone: "critical",
        title: "บันทึกข้อมูลร้านไม่สำเร็จ",
        detail: forbidden ? "บัญชีนี้ไม่มีสิทธิ์แก้ไขข้อมูลร้าน" : "กรุณาตรวจข้อมูลและลองอีกครั้ง",
      });
    }
  }

  function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_500_000) {
      showNotice({ tone: "critical", title: "ใช้ไฟล์โลโก้นี้ไม่ได้", detail: "เลือกไฟล์ภาพขนาดไม่เกิน 1.5 MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateProfileDraft((current) => ({ ...current, logoDataUrl: reader.result as string }));
        setNotice(null);
      }
    };
    reader.onerror = () => showNotice({ tone: "critical", title: "อ่านไฟล์โลโก้ไม่สำเร็จ", detail: "กรุณาเลือกไฟล์อื่นแล้วลองอีกครั้ง" });
    reader.readAsDataURL(file);
  }

  function openBranchEditor(branch?: PrototypeBusinessBranch) {
    branchEditorTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditingBranch(branch ? branchToDraft(branch) : emptyBranchDraft(context.businessId));
    setNotice(null);
    window.requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      editor.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      editor.querySelector<HTMLInputElement>("input:not([disabled])")?.focus({ preventScroll: true });
    });
  }

  async function handleBranchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentEditingBranch) return;
    const created = !currentEditingBranch.branchId;
    try {
      await saveDurableBranch({
        ...currentEditingBranch,
        timezone: "Asia/Bangkok",
      });
      closeBranchEditor();
      showNotice({
        tone: "success",
        title: created ? "เพิ่มสาขาแล้ว" : "บันทึกข้อมูลสาขาแล้ว",
        detail: "การตั้งค่าบริการและเวลาทำการถูกนำไปใช้กับปฏิทินและงานของสาขานี้แล้ว",
      });
    } catch (error) {
      showNotice({ tone: "critical", title: "บันทึกสาขาไม่สำเร็จ", detail: branchFailureMessage(error) });
    }
  }

  function closeBranchEditor() {
    setEditingBranch(null);
    window.requestAnimationFrame(() => branchEditorTriggerRef.current?.focus());
  }

  async function toggleBranchActive(branch: PrototypeBusinessBranch) {
    try {
      await setDurableBranchActive(branch.businessId, branch.branchId, !branch.active);
      showNotice({
        tone: "success",
        title: branch.active ? "ปิดใช้งานสาขาแล้ว" : "เปิดใช้งานสาขาแล้ว",
        detail: branch.active ? "สาขานี้จะไม่อยู่ในตัวเลือกสำหรับงานใหม่" : "สาขานี้กลับมาอยู่ในตัวเลือกและพร้อมรับงานใหม่แล้ว",
      });
    } catch (error) {
      showNotice({ tone: "critical", title: "เปลี่ยนสถานะสาขาไม่สำเร็จ", detail: branchFailureMessage(error) });
    }
  }

  return (
    <div className="business-settings shell" key={context.businessId}>
      <BusinessPageHeader
        title="ตั้งค่า"
        context={`${details.business?.name ?? "ร้าน"} · จัดการข้อมูลร้าน สาขา และบริการที่เปิดใช้`}
      />

      <div className="settings-layout">
      <aside className="settings-rail">
      <span className="settings-rail__label">พื้นที่จัดการร้าน</span>
      <nav className="settings-section-nav" aria-label="ส่วนการตั้งค่า">
        <button type="button" className={section === "profile" ? "is-active" : ""} aria-current={section === "profile" ? "page" : undefined} onClick={() => selectSection("profile")}>
          <Settings size={19} /><span className="settings-nav-copy"><strong>ข้อมูลร้าน</strong><small>ชื่อ โลโก้ และผู้ติดต่อ</small></span>
        </button>
        <button type="button" className={section === "branches" ? "is-active" : ""} aria-current={section === "branches" ? "page" : undefined} onClick={() => selectSection("branches")}>
          <Storefront size={19} /><span className="settings-nav-copy"><strong>สาขา <span>{branches.length}</span></strong><small>บริการและเวลาทำการ</small></span>
        </button>
      </nav>
      <div className="settings-rail__note"><h2>ตั้งค่าให้ตรงกับหน้าร้าน</h2><p>ข้อมูลร้านใช้ร่วมกันทุกสาขา ส่วนบริการและเวลาทำการกำหนดแยกในแต่ละสาขา</p><a href="/business/team">จัดการทีมงาน <ChevronRight size={16} /></a></div>
      </aside>
      <div className="settings-content">

      {currentNotice ? <BusinessAlert tone={currentNotice.tone} title={currentNotice.title} className="business-settings__notice"><p>{currentNotice.detail}</p></BusinessAlert> : null}

      {section === "profile" ? (
        <ProfileEditor draft={profileDraft} onChange={updateProfileDraft} onLogoChange={handleLogo} onSubmit={handleProfileSubmit} />
      ) : (
        <section className="settings-branches" aria-labelledby="settings-branches-title">
          <header className="settings-section-heading">
            <div>
              <span className="settings-section-heading__icon"><Storefront size={20} /></span>
              <div><h2 id="settings-branches-title">สาขา</h2><p>ตั้งค่าบริการ เวลาเปิด–ปิด และข้อมูลติดต่อของแต่ละสาขา</p></div>
            </div>
            <button className="button button--business" type="button" onClick={() => openBranchEditor()}><Plus size={18} />เพิ่มสาขา</button>
          </header>

          <div className="settings-branch-list">
            {branches.map((branch) => (
              <BranchCard key={branch.branchId} branch={branch} current={branch.branchId === context.branchId} fixtureOnly={!stateReady} team={team.filter((member) => member.businessId === branch.businessId && member.branchIds.includes(branch.branchId))} onOpenTeam={() => selectContext(getDemoBusinessContextForBranch(branch.businessId, branch.branchId).key)} onEdit={() => openBranchEditor(branch)} onToggleActive={() => toggleBranchActive(branch)} />
            ))}
          </div>

          {currentEditingBranch ? (
            <div ref={editorRef} className="settings-branch-editor-anchor">
              <BranchEditor draft={currentEditingBranch} onChange={setEditingBranch} onSubmit={handleBranchSubmit} onCancel={closeBranchEditor} />
            </div>
          ) : null}
        </section>
      )}
      </div>
      </div>
    </div>
  );
}

function ProfileEditor({
  draft,
  onChange,
  onLogoChange,
  onSubmit,
}: {
  draft: PrototypeBusinessProfileDraft;
  onChange: (next: PrototypeBusinessProfileDraft) => void;
  onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const initials = draft.name.trim().slice(0, 2) || "MK";
  return (
    <form className="settings-form" onSubmit={onSubmit} aria-labelledby="settings-profile-title">
      <header className="settings-section-heading">
        <div>
          <span className="settings-section-heading__icon"><Settings size={20} /></span>
          <div><h2 id="settings-profile-title">ข้อมูลร้าน</h2><p>ข้อมูลหลักนี้ใช้ร่วมกันในทุกสาขา</p></div>
        </div>
      </header>

      <section className="settings-form-section" aria-labelledby="settings-brand-title">
        <div className="settings-form-section__intro"><h3 id="settings-brand-title">ชื่อและโลโก้</h3><p>ช่วยให้ทีมเห็นร้านที่กำลังจัดการได้ชัดเจน</p></div>
        <div className="settings-logo-field">
          <div className="settings-logo-preview" aria-label="ภาพโลโก้ร้าน">
            {draft.logoDataUrl ? <Image src={draft.logoDataUrl} alt="" width={80} height={80} unoptimized /> : <strong aria-hidden="true">{initials}</strong>}
          </div>
          <div>
            <label className="button button--business-ghost settings-logo-upload">
              <FileImage size={18} />เลือกโลโก้
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogoChange} />
            </label>
            <small>PNG, JPG หรือ WebP ขนาดไม่เกิน 1.5 MB</small>
            <small>แสดงเฉพาะหน้านี้ ยังไม่บันทึกโลโก้</small>
            {draft.logoDataUrl ? <button className="settings-text-action" type="button" onClick={() => onChange({ ...draft, logoDataUrl: null })}>นำโลโก้ออก</button> : null}
          </div>
        </div>
        <SettingsField label="ชื่อร้าน" required>
          <input required value={draft.name} onChange={(event) => onChange({ ...draft, name: event.currentTarget.value })} autoComplete="organization" />
        </SettingsField>
        <SettingsField label="เกี่ยวกับร้าน" hint="ข้อความสั้น ๆ สำหรับช่วยให้ทีมรู้จักร้าน">
          <textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.currentTarget.value })} rows={3} />
        </SettingsField>
      </section>

      <section className="settings-form-section" aria-labelledby="settings-contact-title">
        <div className="settings-form-section__intro"><h3 id="settings-contact-title">ผู้ติดต่อหลัก</h3><p>ใช้เป็นข้อมูลติดต่อระดับร้าน ไม่ผูกกับสาขาใดสาขาหนึ่ง</p></div>
        <div className="settings-form-grid">
          <SettingsField label="ชื่อผู้ติดต่อ"><input value={draft.contactName} onChange={(event) => onChange({ ...draft, contactName: event.currentTarget.value })} autoComplete="name" /></SettingsField>
          <SettingsField label="เบอร์โทร"><input type="tel" value={draft.phone} onChange={(event) => onChange({ ...draft, phone: event.currentTarget.value })} autoComplete="tel" /></SettingsField>
          <SettingsField label="อีเมล"><input type="email" value={draft.email} onChange={(event) => onChange({ ...draft, email: event.currentTarget.value })} autoComplete="email" /></SettingsField>
          <SettingsField label="ที่อยู่จดทะเบียน"><textarea value={draft.address} onChange={(event) => onChange({ ...draft, address: event.currentTarget.value })} rows={2} autoComplete="street-address" /></SettingsField>
        </div>
      </section>

      <footer className="settings-form-actions"><button className="button button--business" type="submit"><Save size={18} />บันทึกข้อมูลร้าน</button></footer>
    </form>
  );
}

function BranchCard({ branch, current, fixtureOnly, team, onOpenTeam, onEdit, onToggleActive }: { branch: PrototypeBusinessBranch; current: boolean; fixtureOnly: boolean; team: PrototypeTeamMember[]; onOpenTeam: () => void; onEdit: () => void; onToggleActive: () => void }) {
  const openDays = branch.operatingHours.filter((entry) => !entry.closed);
  const timeRanges = [...new Set(openDays.map((entry) => `${entry.open}–${entry.close}`))];
  const hoursSummary = !openDays.length ? "ปิดทุกวัน" : `${openDays.length} วันต่อสัปดาห์ · ${timeRanges.length === 1 ? timeRanges[0] : "เวลาต่างกันตามวัน"}`;
  const branchContext = getDemoBusinessContextForBranch(branch.businessId, branch.branchId, fixtureOnly);
  const services = getBookingServices(branchContext, fixtureOnly);
  const hotelCapacity = getHotelRooms(branchContext, fixtureOnly).reduce((total, room) => total + room.capacity, 0);
  const daycareCapacity = getPrototypeDaycareZones(branchContext, fixtureOnly).reduce((total, zone) => total + zone.capacity, 0);
  return (
    <article className={`settings-branch-card${!branch.active ? " is-inactive" : ""}`}>
      <header>
        <span className="settings-branch-card__mark"><MapPin size={19} /></span>
        <div>
          <div className="settings-branch-card__title"><h3>{branch.name}</h3>{current ? <span>สาขาปัจจุบัน</span> : null}</div>
          <p>{branch.area || branch.address || "ยังไม่ได้ระบุพื้นที่"}</p>
        </div>
        <span className={`settings-status${branch.active ? " is-active" : ""}`}><i aria-hidden="true" />{branch.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span>
      </header>
      <dl>
        <div><dt>บริการ</dt><dd>{branch.enabledModules.length ? branch.enabledModules.map((module) => BUSINESS_SERVICE_MODULES[module].label).join(" · ") : "ยังไม่เปิดบริการ"}</dd></div>
        <div><dt>เวลาทำการ</dt><dd>{hoursSummary}</dd></div>
        <div><dt>ติดต่อ</dt><dd>{branch.phone || branch.email || "ยังไม่ได้ระบุ"}</dd></div>
        <div><dt>ทีมประจำสาขา</dt><dd>{team.length ? `${team.length} คนที่เปิดใช้งาน · ${team.map((member) => member.name).join(", ")}` : "ยังไม่มีทีมที่เปิดใช้งาน"}</dd></div>
        {team.length ? <div><dt>ความสามารถ</dt><dd>{[...new Set(team.flatMap((member) => member.capabilities))].map((capability) => TEAM_MEMBER_CAPABILITY_LABELS[capability]).join(" · ")}</dd></div> : null}
      </dl>
      {services.length ? <details className="settings-branch-services">
        <summary>บริการและทรัพยากร</summary>
        <ul>{services.map((service) => <li key={service.id}><strong>{service.label}</strong><span>{service.defaultDurationMinutes ? `${service.defaultDurationMinutes} นาทีต่อการจอง` : service.module === "hotel" ? `เข้าพักตามช่วงวันที่ · ความจุ ${hotelCapacity} ตัว` : `ดูแลรายวัน · ความจุ ${daycareCapacity} ตัว`}</span></li>)}</ul>
        <p>ใช้เวลาและทรัพยากรชุดเดียวกับปฏิทินและงานบริการ</p>
      </details> : null}
      <footer>
        <button className="button button--business-ghost" type="button" onClick={onEdit}><Pencil size={17} />แก้ไข</button>
        {branch.active ? <a className="button button--business-ghost" href="/business/team" onClick={onOpenTeam} aria-label={`ดูทีม ${branch.name}`}><UsersRound size={17} />ดูทีม</a> : null}
        <label className="settings-switch">
          <input type="checkbox" checked={branch.active} onChange={onToggleActive} aria-label={`เปิดใช้งานสาขา ${branch.name}`} />
          <span aria-hidden="true"><i /></span>
          <strong>{branch.active ? "ใช้งานอยู่" : "เปิดใช้งาน"}</strong>
        </label>
      </footer>
    </article>
  );
}

function BranchEditor({ draft, onChange, onSubmit, onCancel }: { draft: PrototypeBusinessBranchDraft; onChange: (next: PrototypeBusinessBranchDraft) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const title = draft.branchId ? `แก้ไข ${draft.name}` : "เพิ่มสาขา";
  function toggleModule(module: BusinessServiceModule) {
    const enabledModules = draft.enabledModules.includes(module)
      ? draft.enabledModules.filter((item) => item !== module)
      : [...draft.enabledModules, module];
    onChange({ ...draft, enabledModules });
  }
  function changeHours(day: BusinessWeekday, patch: Partial<PrototypeOperatingHoursEntry>) {
    onChange({ ...draft, operatingHours: draft.operatingHours.map((entry) => entry.day === day ? { ...entry, ...patch } : entry) });
  }
  return (
    <form className="settings-form settings-branch-editor" onSubmit={onSubmit} aria-labelledby="settings-branch-editor-title">
      <header className="settings-section-heading settings-branch-editor__heading">
        <div><span className="settings-section-heading__icon"><Storefront size={20} /></span><div><h2 id="settings-branch-editor-title">{title}</h2><p>ข้อมูลนี้กำหนดสิ่งที่ทีมเห็นและงานใหม่ที่สาขารับได้</p></div></div>
        <button className="settings-editor-close" type="button" onClick={onCancel} aria-label="ปิดแบบฟอร์มแก้ไขสาขา">ปิด</button>
      </header>

      <section className="settings-form-section" aria-labelledby="branch-basics-title">
        <div className="settings-form-section__intro"><h3 id="branch-basics-title">ข้อมูลสาขา</h3><p>ใช้ชื่อสั้นที่ทีมแยกจากสาขาอื่นได้ทันที</p></div>
        <div className="settings-form-grid">
          <SettingsField label="ชื่อสาขา" required><input required value={draft.name} onChange={(event) => onChange({ ...draft, name: event.currentTarget.value })} /></SettingsField>
          <SettingsField label="พื้นที่ / ย่าน"><input value={draft.area} onChange={(event) => onChange({ ...draft, area: event.currentTarget.value })} placeholder="เช่น อารีย์, ทองหล่อ" /></SettingsField>
          <SettingsField label="เบอร์โทรสาขา"><input type="tel" value={draft.phone} onChange={(event) => onChange({ ...draft, phone: event.currentTarget.value })} /></SettingsField>
          <SettingsField label="อีเมลสาขา"><input type="email" value={draft.email} onChange={(event) => onChange({ ...draft, email: event.currentTarget.value })} /></SettingsField>
          <SettingsField label="ที่อยู่สาขา"><textarea value={draft.address} onChange={(event) => onChange({ ...draft, address: event.currentTarget.value })} rows={2} /></SettingsField>
        </div>
      </section>

      <section className="settings-form-section" aria-labelledby="branch-modules-title">
        <div className="settings-form-section__intro"><h3 id="branch-modules-title">บริการที่เปิดใช้</h3><p>ปิดบริการเพื่อหยุดรับงานใหม่ ข้อมูลเดิมยังคงอยู่</p></div>
        <div className="settings-module-options">
          {MODULES.map(([module, moduleDetails]) => {
            const checked = draft.enabledModules.includes(module);
            return (
              <label key={module} className={checked ? "is-checked" : ""}>
                <input type="checkbox" checked={checked} onChange={() => toggleModule(module)} />
                <span><strong>{moduleDetails.label}</strong><small>{module === "grooming" ? "นัดหมายและคิวงานบริการ" : module === "hotel" ? "การเข้าพัก ห้อง และงานดูแล" : "รับเข้า โซน และกิจกรรมระหว่างวัน"}</small></span>
                <i aria-hidden="true"><CheckCircle size={18} /></i>
              </label>
            );
          })}
        </div>
      </section>

      <section className="settings-form-section" aria-labelledby="branch-hours-title">
        <div className="settings-form-section__intro"><h3 id="branch-hours-title">เวลาทำการ</h3><p>ระบบใช้เวลานี้ตรวจงานใหม่ในปฏิทินของสาขา</p></div>
        <div className="settings-hours" role="group" aria-label="เวลาทำการรายวัน">
          {draft.operatingHours.map((entry) => (
            <div key={entry.day} className={entry.closed ? "is-closed" : ""}>
              <strong>{BUSINESS_WEEKDAY_LABELS[entry.day]}</strong>
              <label className="settings-switch settings-hours__closed">
                <input type="checkbox" checked={!entry.closed} onChange={(event) => changeHours(entry.day, { closed: !event.currentTarget.checked })} aria-label={`เปิดทำการวัน${BUSINESS_WEEKDAY_LABELS[entry.day]}`} />
                <span aria-hidden="true"><i /></span>
                <b>{entry.closed ? "ปิด" : "เปิด"}</b>
              </label>
              <label><span className="sr-only">เวลาเปิดวัน{BUSINESS_WEEKDAY_LABELS[entry.day]}</span><Clock size={16} /><input type="time" value={entry.open} required={!entry.closed} disabled={entry.closed} onChange={(event) => changeHours(entry.day, { open: event.currentTarget.value })} /></label>
              <ChevronRight size={16} />
              <label><span className="sr-only">เวลาปิดวัน{BUSINESS_WEEKDAY_LABELS[entry.day]}</span><input type="time" value={entry.close} required={!entry.closed} disabled={entry.closed} onChange={(event) => changeHours(entry.day, { close: event.currentTarget.value })} /></label>
            </div>
          ))}
        </div>
      </section>

      <footer className="settings-form-actions">
        <button className="button button--business-ghost" type="button" onClick={onCancel}>ยกเลิก</button>
        <button className="button button--business" type="submit"><Save size={18} />{draft.branchId ? "บันทึกสาขา" : "เพิ่มสาขา"}</button>
      </footer>
    </form>
  );
}

function SettingsField({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="settings-field">
      <span>{label}{required ? <em aria-hidden="true">*</em> : null}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}
