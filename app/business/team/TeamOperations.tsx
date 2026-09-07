"use client";

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  BOOKING_DEMO_DATE,
  TEAM_MEMBER_CAPABILITY_LABELS,
  createPrototypeTeamMember,
  evaluatePrototypeTeamMemberAvailability,
  getDemoBusinessContextDetails,
  getPrototypeTeamMemberWorkload,
  listPrototypeTeamMemberFixtures,
  listPrototypeTeamMembers,
  listPrototypeBusinessContexts,
  setPrototypeTeamMemberActive,
  updatePrototypeTeamMember,
  type PrototypeTeamMember,
  type PrototypeTeamMemberAvailabilityWindow,
  type PrototypeTeamMemberDraft,
  type PrototypeTeamMemberWorkload,
  type TeamMemberAvailabilityResult,
  type TeamMemberAvailabilityState,
  type TeamMemberCapability,
  type TeamMemberRole,
} from "../../_prototype/businessState";
import {
  CheckCircle,
  CircleAlert,
  CircleOff,
  Clock,
  Info,
  Pencil,
  Plus,
  TriangleAlert,
  UsersRound,
} from "../../_components/icons";
import { BusinessAlert } from "../_components/BusinessFeedback";
import { BusinessDataTable } from "../_components/BusinessDataTable";
import { BusinessStaffAvatar } from "../_components/BusinessIdentityAvatar";
import { BusinessModal } from "../_components/BusinessModal";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { BusinessSearchField } from "../_components/BusinessSearchField";
import { BusinessSegmentedControl } from "../_components/BusinessSegmentedControl";
import { useBusinessContext, useBusinessStateReady } from "../_components/useBusinessContext";

type AvailabilityFilter = "all" | "working" | "unavailable" | "inactive";
type TeamEditorState = { mode: "create" } | { mode: "edit"; member: PrototypeTeamMember };

const ROLE_LABELS: Record<TeamMemberRole, string> = {
  owner: "เจ้าของ",
  manager: "ผู้จัดการ",
  staff: "พนักงาน",
};

const CAPABILITY_LABELS = TEAM_MEMBER_CAPABILITY_LABELS;

const AVAILABILITY_LABELS: Record<TeamMemberAvailabilityState | "inactive" | "unknown", string> = {
  working: "พร้อมรับงาน",
  unavailable: "ไม่พร้อม",
  break: "พัก",
  "time-off": "หยุด / ลา",
  inactive: "ไม่ใช้งาน",
  unknown: "ยังไม่ระบุ",
};

const AVAILABILITY_FILTER_OPTIONS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "working", label: "พร้อม" },
  { value: "unavailable", label: "ไม่พร้อม" },
  { value: "inactive", label: "ไม่ใช้งาน" },
] as const;

const CAPABILITY_OPTIONS = Object.entries(CAPABILITY_LABELS) as [TeamMemberCapability, string][];
const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [TeamMemberRole, string][];

type BranchOption = { id: string; label: string };
type TeamNotice = { tone: "success" | "critical"; title: string; detail: string };

export function TeamOperations() {
  const { context, revision } = useBusinessContext();
  const stateReady = useBusinessStateReady();
  const [query, setQuery] = useState("");
  const [capability, setCapability] = useState<"all" | TeamMemberCapability>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
  const [editor, setEditor] = useState<TeamEditorState | null>(null);
  const [notice, setNotice] = useState<TeamNotice | null>(null);

  const branchOptions = getBusinessBranchOptions(context.businessId, !stateReady);
  const details = getDemoBusinessContextDetails(context, !stateReady);
  const allMembers = useMemo(
    () => {
      // The local store emits a revision without replacing the context object.
      void revision;
      return stateReady
        ? listPrototypeTeamMembers(context, { includeInactive: true })
        : listPrototypeTeamMemberFixtures(context, { includeInactive: true });
    },
    [context, revision, stateReady],
  );
  const availabilityByStaffId = useMemo(
    () => new Map(allMembers.map((member) => [
      member.staffId,
      evaluatePrototypeTeamMemberAvailability(member, BOOKING_DEMO_DATE),
    ])),
    [allMembers],
  );
  const workloadByStaffId = useMemo(
    () => new Map(allMembers.map((member) => [
      member.staffId,
      getPrototypeTeamMemberWorkload(member.staffId, context, BOOKING_DEMO_DATE, !stateReady),
    ])),
    [allMembers, context, stateReady],
  );

  const visibleMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("th-TH");
    return allMembers.filter((member) => {
      const availability = availabilityByStaffId.get(member.staffId) ?? unknownAvailability();
      const matchesQuery = !normalizedQuery || `${member.name} ${ROLE_LABELS[member.role]} ${member.capabilities.map((item) => CAPABILITY_LABELS[item]).join(" ")}`
        .toLocaleLowerCase("th-TH")
        .includes(normalizedQuery);
      const matchesCapability = capability === "all" || member.capabilities.includes(capability);
      const matchesAvailability = availabilityFilter === "all"
        || (availabilityFilter === "working" && member.active && availability.available)
        || (availabilityFilter === "inactive" && !member.active)
        || (availabilityFilter === "unavailable" && member.active && !availability.available);
      return matchesQuery && matchesCapability && matchesAvailability;
    });
  }, [allMembers, availabilityByStaffId, availabilityFilter, capability, query]);

  const summary = useMemo(() => {
    const active = allMembers.filter((member) => member.active);
    const working = active.filter((member) => availabilityByStaffId.get(member.staffId)?.available).length;
    const unavailable = active.length - working;
    const attention = active.filter((member) => workloadByStaffId.get(member.staffId)?.overload).length;
    return { total: allMembers.length, active: active.length, working, unavailable, attention };
  }, [allMembers, availabilityByStaffId, workloadByStaffId]);

  function handleSave(draft: PrototypeTeamMemberDraft) {
    const result = editor?.mode === "edit"
      ? updatePrototypeTeamMember(editor.member.staffId, draft, context)
      : createPrototypeTeamMember(draft, context);
    if (!result.ok) {
      setNotice({
        tone: "critical",
        title: editor?.mode === "edit" ? "บันทึกข้อมูลทีมไม่สำเร็จ" : "เพิ่มพนักงานไม่สำเร็จ",
        detail: messageForMutationFailure(result.reason),
      });
      return;
    }
    setEditor(null);
    setNotice({
      tone: "success",
      title: editor?.mode === "edit" ? "บันทึกข้อมูลทีมแล้ว" : "เพิ่มพนักงานแล้ว",
      detail: "อัปเดตรายชื่อทีมสำหรับการมอบหมายงานแล้ว",
    });
  }

  function handleActiveChange(member: PrototypeTeamMember) {
    const result = setPrototypeTeamMemberActive(member.staffId, !member.active, context);
    if (!result.ok) {
      setNotice({
        tone: "critical",
        title: "เปลี่ยนสถานะพนักงานไม่สำเร็จ",
        detail: messageForMutationFailure(result.reason),
      });
      return;
    }
    setNotice({
      tone: "success",
      title: member.active ? "ปิดใช้งานพนักงานแล้ว" : "เปิดใช้งานพนักงานแล้ว",
      detail: member.active ? "จะไม่สามารถรับการมอบหมายงานใหม่ได้" : "พนักงานกลับมาอยู่ในรายการสำหรับการมอบหมายงานแล้ว",
    });
  }

  return (
    <div className="business-team shell" key={context.key}>
      <BusinessPageHeader
        title="ทีม"
        context={`${details.business?.name ?? "ร้าน"} · ${details.branch?.name ?? "สาขา"} · ดูคนที่ทำงานและความพร้อมของวันนี้`}
        actions={<button className="button button--business" type="button" onClick={() => setEditor({ mode: "create" })}><Plus size={18} />เพิ่มพนักงาน</button>}
      />

      <section className="team-prototype-note" aria-label="ขอบเขตการจัดการทีม">
        <Info size={20} />
        <span>
          <strong>ทีมและความสามารถของสาขา</strong>
          <small>ดูบทบาท ความสามารถ สาขา ความพร้อม และงานวันนี้ เพื่อช่วยมอบหมายงาน</small>
        </span>
      </section>

      {notice ? <BusinessAlert tone={notice.tone} title={notice.title} className="business-team__notice"><p>{notice.detail}</p></BusinessAlert> : null}

      <section className="team-summary-grid" aria-label="ภาพรวมทีมของสาขาปัจจุบัน">
        <SummaryCard icon={<UsersRound size={18} />} label="ทีมสาขานี้" value={summary.total} detail={`ใช้งาน ${summary.active} คน`} />
        <SummaryCard tone="working" icon={<CheckCircle size={18} />} label="พร้อมรับงาน" value={summary.working} detail="ตามความพร้อมของวันนี้" />
        <SummaryCard tone="unavailable" icon={<Clock size={18} />} label="ไม่พร้อมตอนนี้" value={summary.unavailable} detail="พัก หยุด หรือไม่อยู่ในเวลางาน" />
        <SummaryCard tone="attention" icon={<TriangleAlert size={18} />} label="ต้องดู workload" value={summary.attention} detail="มี conflict หรือภาระงานที่ต้องตรวจ" />
      </section>

      <section className="team-directory" aria-labelledby="team-directory-title">
        <header className="team-directory__header">
          <div>
            <h2 id="team-directory-title">รายชื่อทีม</h2>
            <p>เปลี่ยนสาขาจากตัวเลือกด้านบนเพื่อดูรายชื่อที่สาขานั้น โดยคนที่อยู่หลายสาขายังคงเป็นคนเดียวกัน</p>
          </div>
          <button className="button button--business-ghost" type="button" onClick={() => setEditor({ mode: "create" })}><Plus size={18} />เพิ่มพนักงาน</button>
        </header>

        <div className="team-directory__filters" aria-label="ค้นหาและกรองรายชื่อทีม">
          <BusinessSearchField
            containerClassName="team-search"
            label="ค้นหาชื่อ บทบาท หรือความสามารถ"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="ค้นหาชื่อ บทบาท หรือความสามารถ"
          />
          <label className="team-directory__filter-field">
            <span>รับงานด้าน</span>
            <select value={capability} onChange={(event) => setCapability(event.currentTarget.value as "all" | TeamMemberCapability)}>
              <option value="all">ทุกความสามารถ</option>
              {CAPABILITY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <BusinessSegmentedControl
            className="team-directory__availability-filter"
            ariaLabel="กรองตามความพร้อม"
            value={availabilityFilter}
            options={AVAILABILITY_FILTER_OPTIONS}
            onChange={setAvailabilityFilter}
          />
        </div>

        {visibleMembers.length > 0 ? (
          <>
            <div className="team-directory__table">
              <BusinessDataTable caption="รายชื่อพนักงานของสาขาปัจจุบัน">
                <thead>
                  <tr>
                    <th scope="col">ทีม</th>
                    <th scope="col">สาขา</th>
                    <th scope="col">รับงานด้าน</th>
                    <th scope="col">สถานะ</th>
                    <th scope="col">งานวันนี้</th>
                    <th scope="col"><span className="sr-only">จัดการพนักงาน</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map((member) => (
                    <TeamMemberTableRow
                      key={member.staffId}
                      member={member}
                      availability={availabilityByStaffId.get(member.staffId) ?? unknownAvailability()}
                      workload={workloadByStaffId.get(member.staffId) ?? emptyWorkload()}
                      branches={branchOptions}
                      onEdit={() => setEditor({ mode: "edit", member })}
                      onActiveChange={() => handleActiveChange(member)}
                    />
                  ))}
                </tbody>
              </BusinessDataTable>
            </div>
            <div className="team-mobile-cards" aria-label="รายชื่อทีมแบบการ์ด">
              {visibleMembers.map((member) => (
                <TeamMemberCard
                  key={member.staffId}
                  member={member}
                  availability={availabilityByStaffId.get(member.staffId) ?? unknownAvailability()}
                  workload={workloadByStaffId.get(member.staffId) ?? emptyWorkload()}
                  branches={branchOptions}
                  onEdit={() => setEditor({ mode: "edit", member })}
                  onActiveChange={() => handleActiveChange(member)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="team-empty" role="status">
            <UsersRound size={28} />
            <strong>ไม่พบพนักงานตามตัวกรองนี้</strong>
            <p>ลองเปลี่ยนคำค้นหา ความสามารถ หรือความพร้อม หรือเพิ่มพนักงานสำหรับสาขานี้</p>
          </div>
        )}
      </section>

      {editor ? (
        <TeamMemberEditor
          key={editor.mode === "edit" ? editor.member.staffId : "new-team-member"}
          member={editor.mode === "edit" ? editor.member : null}
          branchOptions={branchOptions}
          currentBranchId={context.branchId}
          onClose={() => setEditor(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
  tone?: "working" | "unavailable" | "attention";
}) {
  return (
    <article className={`team-summary-card${tone ? ` team-summary-card--${tone}` : ""}`}>
      <span className="team-summary-card__heading">{icon}{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function TeamMemberTableRow({
  member,
  availability,
  workload,
  branches,
  onEdit,
  onActiveChange,
}: {
  member: PrototypeTeamMember;
  availability: TeamMemberAvailabilityResult;
  workload: PrototypeTeamMemberWorkload;
  branches: readonly BranchOption[];
  onEdit: () => void;
  onActiveChange: () => void;
}) {
  return (
    <tr>
      <td><MemberIdentity member={member} /></td>
      <td><MemberBranches member={member} branches={branches} /></td>
      <td><CapabilityList capabilities={member.capabilities} /></td>
      <td><AvailabilityPill availability={availability} /></td>
      <td><WorkloadSummary workload={workload} /></td>
      <td><MemberActions member={member} onEdit={onEdit} onActiveChange={onActiveChange} /></td>
    </tr>
  );
}

function TeamMemberCard({
  member,
  availability,
  workload,
  branches,
  onEdit,
  onActiveChange,
}: {
  member: PrototypeTeamMember;
  availability: TeamMemberAvailabilityResult;
  workload: PrototypeTeamMemberWorkload;
  branches: readonly BranchOption[];
  onEdit: () => void;
  onActiveChange: () => void;
}) {
  return (
    <article className="team-member-card">
      <header className="team-member-card__header">
        <MemberIdentity member={member} />
        <AvailabilityPill availability={availability} />
      </header>
      <div className="team-member-card__facts">
        <div className="team-member-card__fact"><span>สาขา</span><MemberBranches member={member} branches={branches} /></div>
        <div className="team-member-card__fact"><span>รับงานด้าน</span><CapabilityList capabilities={member.capabilities} /></div>
        <div className="team-member-card__fact"><span>งานวันนี้</span><WorkloadSummary workload={workload} /></div>
        <div className="team-member-card__fact"><span>บทบาท</span><span className="team-role-pill">{ROLE_LABELS[member.role]}</span></div>
      </div>
      <div className="team-member-card__actions"><MemberActions member={member} onEdit={onEdit} onActiveChange={onActiveChange} /></div>
    </article>
  );
}

function MemberIdentity({ member }: { member: PrototypeTeamMember }) {
  return (
    <span className="team-member-identity">
      <BusinessStaffAvatar name={member.name} />
      <span className="team-member-identity__copy">
        <strong>{member.name}</strong>
        <span className="team-role-pill">{ROLE_LABELS[member.role]}</span>
      </span>
    </span>
  );
}

function MemberBranches({ member, branches }: { member: PrototypeTeamMember; branches: readonly BranchOption[] }) {
  const labels = member.branchIds.map((branchId) => branches.find((branch) => branch.id === branchId)?.label ?? branchId);
  return (
    <span className="team-member-branches">
      <small>{labels.join(" · ") || "ยังไม่ระบุสาขา"}</small>
    </span>
  );
}

function CapabilityList({ capabilities }: { capabilities: readonly TeamMemberCapability[] }) {
  return capabilities.length > 0 ? (
    <span className="team-capability-list">
      {capabilities.map((capability) => <span className={`team-capability-pill team-capability-pill--${capability}`} key={capability}>{CAPABILITY_LABELS[capability]}</span>)}
    </span>
  ) : <small className="team-member-branches">ยังไม่กำหนด</small>;
}

function AvailabilityPill({ availability }: { availability: TeamMemberAvailabilityResult }) {
  const Icon = availability.available ? CheckCircle : availability.state === "inactive" ? CircleOff : Clock;
  return <span className={`team-availability-pill team-availability-pill--${availability.state}`}><Icon size={14} />{availability.available ? "พร้อมรับงาน" : AVAILABILITY_LABELS[availability.state]}</span>;
}

function WorkloadSummary({ workload }: { workload: PrototypeTeamMemberWorkload }) {
  return (
    <span className="team-member-workload">
      <strong>{workload.today} งาน · กำลังทำ {workload.inProgress ? 1 : 0}</strong>
      {workload.overload ? <small className="team-member-workload__warning"><CircleAlert size={13} />conflict {workload.conflicts} · ตรวจ workload</small> : <small>{workload.next ? `ถัดไป ${workload.next.startsAt.slice(11, 16)} · ${workload.next.label}` : "ยังไม่มีงานถัดไป"}</small>}
    </span>
  );
}

function MemberActions({ member, onEdit, onActiveChange }: { member: PrototypeTeamMember; onEdit: () => void; onActiveChange: () => void }) {
  return (
    <span className="team-member-actions">
      <button type="button" onClick={onEdit}><Pencil size={15} />แก้ไข</button>
      <button className={member.active ? "team-member-actions__deactivate" : "team-member-actions__activate"} type="button" onClick={onActiveChange}>{member.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
    </span>
  );
}

function TeamMemberEditor({
  member,
  branchOptions,
  currentBranchId,
  onClose,
  onSave,
}: {
  member: PrototypeTeamMember | null;
  branchOptions: readonly BranchOption[];
  currentBranchId: string;
  onClose: () => void;
  onSave: (draft: PrototypeTeamMemberDraft) => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(member?.name ?? "");
  const [role, setRole] = useState<TeamMemberRole>(member?.role ?? "staff");
  const [branchIds, setBranchIds] = useState<string[]>(member?.branchIds ?? (currentBranchId ? [currentBranchId] : (branchOptions[0] ? [branchOptions[0].id] : [])));
  const [capabilities, setCapabilities] = useState<TeamMemberCapability[]>(member?.capabilities ?? []);
  const [active, setActive] = useState(member?.active ?? true);
  const [availability, setAvailability] = useState<PrototypeTeamMemberAvailabilityWindow[]>(() => (
    member?.availability.map((item) => ({ ...item })) ?? [newAvailabilityWindow(0)]
  ));
  const [formError, setFormError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("กรุณาระบุชื่อพนักงาน");
      nameRef.current?.focus();
      return;
    }
    if (branchIds.length === 0) {
      setFormError("เลือกอย่างน้อยหนึ่งสาขาสำหรับพนักงานคนนี้");
      return;
    }
    if (capabilities.length === 0) {
      setFormError("เลือกอย่างน้อยหนึ่งประเภทงานที่พนักงานรับได้");
      return;
    }
    if (availability.some((window) => !window.start || !window.end || window.start >= window.end)) {
      setFormError("ตรวจสอบช่วงเวลาความพร้อมให้เริ่มก่อนสิ้นสุด");
      return;
    }
    onSave({
      staffId: member?.staffId,
      branchIds,
      name: trimmedName,
      avatarSeed: trimmedName,
      role,
      capabilities,
      active,
      availability: availability.map((window) => ({ ...window, note: window.note?.trim() || null })),
    });
  }

  function toggleBranch(branchId: string) {
    setBranchIds((current) => current.includes(branchId) ? current.filter((item) => item !== branchId) : [...current, branchId]);
  }

  function toggleCapability(capability: TeamMemberCapability) {
    setCapabilities((current) => current.includes(capability) ? current.filter((item) => item !== capability) : [...current, capability]);
  }

  function updateAvailability(index: number, patch: Partial<PrototypeTeamMemberAvailabilityWindow>) {
    setAvailability((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  return (
    <BusinessModal
      open
      title={member ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงาน"}
      description="กำหนดข้อมูลพนักงาน สาขาที่ทำงาน และประเภทงานที่รับได้"
      onClose={onClose}
      initialFocusRef={nameRef}
      size="large"
      className="team-editor-modal"
      footer={(
        <div className="team-editor__footer">
          <button className="button button--business-ghost" type="button" onClick={onClose}>ยกเลิก</button>
          <button className="button button--business" type="submit" form="team-member-editor"><CheckCircle size={17} />{member ? "บันทึกข้อมูล" : "เพิ่มพนักงาน"}</button>
        </div>
      )}
    >
      <form id="team-member-editor" className="team-editor" onSubmit={submit}>
        <p className="team-editor__intro">ข้อมูลนี้ใช้ค้นหาพนักงานและช่วยมอบหมายงานของสาขา</p>
        {formError ? <BusinessAlert tone="critical" title="ตรวจสอบข้อมูล" role="alert"><p>{formError}</p></BusinessAlert> : null}
        <div className="team-editor__grid">
          <label><span>ชื่อพนักงาน</span><input ref={nameRef} type="text" maxLength={80} value={name} onChange={(event) => setName(event.currentTarget.value)} placeholder="เช่น พิมพ์ชนก" required /></label>
          <label><span>บทบาทที่แสดง</span><select value={role} onChange={(event) => setRole(event.currentTarget.value as TeamMemberRole)}>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>

        <fieldset>
          <legend>สาขาที่ทำงาน</legend>
          <div className="team-editor__check-grid">
            {branchOptions.map((branch) => <label key={branch.id}><input type="checkbox" checked={branchIds.includes(branch.id)} onChange={() => toggleBranch(branch.id)} />{branch.label}</label>)}
          </div>
        </fieldset>

        <fieldset>
          <legend>รับงานด้าน</legend>
          <div className="team-editor__check-grid">
            {CAPABILITY_OPTIONS.map(([value, label]) => <label key={value}><input type="checkbox" checked={capabilities.includes(value)} onChange={() => toggleCapability(value)} />{label}</label>)}
          </div>
        </fieldset>

        <section className="team-editor__availability" aria-labelledby="team-availability-heading">
          <header><div><h3 id="team-availability-heading">ความพร้อมในการทำงาน</h3><p>กำหนดเวลาทำงาน พัก หรือไม่พร้อม เพื่อช่วยจัดงานให้เหมาะสม</p></div></header>
          {availability.map((window, index) => (
            <div className="team-editor__availability-row" key={window.id}>
              <label><span>สถานะ</span><select value={window.state} onChange={(event) => updateAvailability(index, { state: event.currentTarget.value as TeamMemberAvailabilityState })}>{(["working", "unavailable", "break", "time-off"] as TeamMemberAvailabilityState[]).map((state) => <option key={state} value={state}>{AVAILABILITY_LABELS[state]}</option>)}</select></label>
              <label><span>เริ่ม</span><input type="datetime-local" value={window.start} onChange={(event) => updateAvailability(index, { start: event.currentTarget.value })} /></label>
              <label><span>สิ้นสุด</span><input type="datetime-local" value={window.end} onChange={(event) => updateAvailability(index, { end: event.currentTarget.value })} /></label>
              <button type="button" aria-label={`ลบช่วงเวลาที่ ${index + 1}`} onClick={() => setAvailability((current) => current.filter((_, itemIndex) => itemIndex !== index))}><CircleOff size={18} /></button>
            </div>
          ))}
          <button className="team-editor__add-availability" type="button" onClick={() => setAvailability((current) => [...current, newAvailabilityWindow(current.length)])}><Plus size={16} />เพิ่มช่วงเวลา</button>
        </section>

        <label className="team-editor__active"><input type="checkbox" checked={active} onChange={(event) => setActive(event.currentTarget.checked)} />เปิดใช้งานพนักงานคนนี้สำหรับงานใหม่</label>
      </form>
    </BusinessModal>
  );
}

function getBusinessBranchOptions(businessId: string, fixtureOnly = false): BranchOption[] {
  const options = new Map<string, BranchOption>();
  listPrototypeBusinessContexts(businessId, fixtureOnly)
    .filter((context) => context.businessId === businessId)
    .forEach((context) => {
      const branch = getDemoBusinessContextDetails(context, fixtureOnly).branch;
      if (branch) options.set(branch.id, { id: branch.id, label: branch.name });
    });
  return [...options.values()];
}

function newAvailabilityWindow(index: number): PrototypeTeamMemberAvailabilityWindow {
  return {
    id: `team-ui-availability-${Date.now()}-${index}`,
    state: "working",
    start: `${BOOKING_DEMO_DATE}T08:00`,
    end: `${BOOKING_DEMO_DATE}T18:00`,
    note: null,
  };
}

function unknownAvailability(): TeamMemberAvailabilityResult {
  return { available: false, state: "unknown", interval: null, conflicts: [] };
}

function emptyWorkload(): PrototypeTeamMemberWorkload {
  return { items: [], today: 0, inProgress: null, next: null, conflicts: 0, overload: false };
}

function messageForMutationFailure(reason: unknown) {
  switch (reason) {
    case "missing": return "ไม่พบพนักงานในสาขาปัจจุบัน";
    case "wrong-context": return "รายการนี้ไม่ได้อยู่ในร้านหรือสาขาปัจจุบัน";
    case "invalid": return "ข้อมูลพนักงานหรือช่วงเวลาความพร้อมยังไม่ถูกต้อง";
    case "storage": return "ไม่สามารถบันทึกข้อมูลในเบราว์เซอร์นี้ได้";
    default: return "ลองตรวจสอบข้อมูลและบันทึกอีกครั้ง";
  }
}
