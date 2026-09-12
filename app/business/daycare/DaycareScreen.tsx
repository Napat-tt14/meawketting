"use client";

import { businessToday } from "../../_backend/shared/businessClock";

import { type KeyboardEvent, useCallback, useRef, useState } from "react";
import {
  DAYCARE_ATTENDANCE_STATUS_LABELS,
  getEnabledBusinessModules,
  getPrototypeDaycareZoneAvailability,
  getPrototypeDaycareZones,
  listPrototypeDaycareAttendanceFixtures,
  listPrototypeDaycareAttendances,
  listPrototypeTeamMemberFixtures,
  listPrototypeTeamMembers,
  readPrototypeCustomer,
  readPrototypeCustomerFixture,
  summarizePrototypeDaycare,
  type BusinessLocalPetRelationship,
  type DaycareAttendanceStatus,
  type PrototypeCustomer,
  type PrototypeDaycareAttendance,
  type PrototypeTeamMember,
} from "../../_prototype/businessState";
import {
  CalendarDays,
  CheckCircle,
  CircleAlert,
  Clock,
  MapPin,
  PawPrint,
  Plus,
  Search,
  UsersRound,
} from "../../_components/icons";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { useBusinessContext, useBusinessStateReady } from "../_components/useBusinessContext";
import { calendarDateLabel } from "../calendar/calendarPresentation";
import { DaycareAttendanceDetail } from "./DaycareAttendanceDetail";

type DaycareLane = "arrival" | "care" | "pickup" | "done";
type DaycareMobileView = "all" | DaycareLane;

type DaycareItem = {
  attendance: PrototypeDaycareAttendance;
  customer: PrototypeCustomer;
  pet: BusinessLocalPetRelationship;
  zoneLabel: string;
  staffName: string;
};

const DAYCARE_LANES: readonly { key: DaycareLane; label: string; description: string }[] = [
  { key: "arrival", label: "รอรับเข้า", description: "รายการที่ยังไม่มา" },
  { key: "care", label: "กำลังดูแล", description: "รับเข้าและอยู่ใน Daycare" },
  { key: "pickup", label: "พร้อมรับกลับ", description: "รอลูกค้ามารับ" },
  { key: "done", label: "รับกลับแล้ว", description: "รายการที่ปิดรอบวันนี้" },
];

function daycareLaneForStatus(status: DaycareAttendanceStatus): DaycareLane {
  if (status === "booked") return "arrival";
  if (status === "checked-in" || status === "active") return "care";
  if (status === "ready-for-pickup") return "pickup";
  return "done";
}

function attentionLabel(item: DaycareItem) {
  if (item.attendance.status === "booked" && !item.attendance.zoneId) return "ต้องเลือกโซนก่อนรับเข้า";
  if ((item.attendance.status === "checked-in" || item.attendance.status === "active") && !item.attendance.responsibleStaffId) return "ยังไม่มอบหมายผู้ดูแล";
  if (item.attendance.status === "ready-for-pickup") return "พร้อมให้ลูกค้ามารับ";
  return null;
}

function DaycareCard({ item, onOpen }: { item: DaycareItem; onOpen: (item: DaycareItem, source: HTMLElement) => void }) {
  const attention = attentionLabel(item);
  return (
    <button
      className={`daycare-card daycare-card--${item.attendance.status}${attention ? " has-attention" : ""}`}
      type="button"
      onClick={(event) => onOpen(item, event.currentTarget)}
      aria-label={`เปิดรายการ Daycare ของ ${item.pet.name} สถานะ ${DAYCARE_ATTENDANCE_STATUS_LABELS[item.attendance.status]}`}
    >
      <span className="daycare-card__header">
        <BusinessPetAvatar pet={item.pet} size="medium" />
        <span className="daycare-card__identity"><strong>{item.pet.name}</strong><small>{item.customer.name}</small></span>
        <span className={`daycare-status daycare-status--${item.attendance.status}`}>{DAYCARE_ATTENDANCE_STATUS_LABELS[item.attendance.status]}</span>
      </span>
      <span className="daycare-card__facts">
        <span><MapPin size={16} />{item.zoneLabel}</span>
        <span><UsersRound size={16} />{item.staffName}</span>
        <span><Clock size={16} />รับ {item.attendance.dropOffWindow ?? "ไม่ระบุ"} · กลับ {item.attendance.pickupWindow ?? "ไม่ระบุ"}</span>
        <span><CheckCircle size={16} />บันทึกดูแล {item.attendance.careEvents.length} รายการ</span>
      </span>
      {attention ? <span className="daycare-card__attention"><CircleAlert size={16} />{attention}</span> : null}
    </button>
  );
}

export function DaycareScreen({ launchAttendanceId = null }: { launchAttendanceId?: string | null }) {
  const { context, revision } = useBusinessContext();
  const stateReady = useBusinessStateReady();
  const [date, setDate] = useState<string>(businessToday(context));
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState<DaycareMobileView>("all");
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(launchAttendanceId);
  const [notice, setNotice] = useState<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  void revision;

  const daycareEnabled = getEnabledBusinessModules(context, !stateReady).includes("daycare");
  const allAttendances = stateReady
    ? listPrototypeDaycareAttendances(context, { includeClosed: true })
    : listPrototypeDaycareAttendanceFixtures(context, { includeClosed: true });
  const zones = getPrototypeDaycareZones(context);
  const staff = (stateReady
    ? listPrototypeTeamMembers(context, { capability: "daycare", includeInactive: true })
    : listPrototypeTeamMemberFixtures(context, { capability: "daycare", includeInactive: true })) as readonly PrototypeTeamMember[];

  const allItems = allAttendances.flatMap((attendance) => {
    const customer = stateReady ? readPrototypeCustomer(attendance.customerId) : readPrototypeCustomerFixture(attendance.customerId);
    const pet = customer?.pets.find((candidate) => candidate.id === attendance.petId) ?? null;
    if (!customer || !pet) return [];
    const zoneLabel = zones.find((zone) => zone.id === attendance.zoneId)?.label ?? "ยังไม่ระบุโซน";
    const staffName = staff.find((member) => member.staffId === attendance.responsibleStaffId)?.name ?? "ยังไม่มอบหมาย";
    return [{ attendance, customer, pet, zoneLabel, staffName } satisfies DaycareItem];
  });

  const dateItems = allItems.filter((item) => item.attendance.attendanceDate === date && item.attendance.status !== "cancelled");
  const normalizedQuery = query.trim().toLocaleLowerCase("th-TH");
  const visibleItems = dateItems.filter((item) => {
    if (!normalizedQuery) return true;
    return `${item.pet.name} ${item.customer.name} ${item.zoneLabel} ${item.staffName}`.toLocaleLowerCase("th-TH").includes(normalizedQuery);
  });
  const laneItems = (lane: DaycareLane) => visibleItems.filter((item) => daycareLaneForStatus(item.attendance.status) === lane);
  const mobileItems = mobileView === "all" ? visibleItems : laneItems(mobileView);
  const summary = summarizePrototypeDaycare(context, date, !stateReady);
  const selectedItem = allItems.find((item) => item.attendance.daycareAttendanceId === selectedAttendanceId) ?? null;

  function openAttendance(item: DaycareItem, source: HTMLElement) {
    openerRef.current = source;
    setSelectedAttendanceId(item.attendance.daycareAttendanceId);
    setNotice(null);
  }

  const closeAttendance = useCallback(() => {
    setSelectedAttendanceId(null);
    window.requestAnimationFrame(() => openerRef.current?.focus());
  }, []);

  function moveMobileTabFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    if (tabs.length === 0) return;
    const currentIndex = Math.max(0, tabs.indexOf(document.activeElement as HTMLButtonElement));
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    const nextValue = nextTab?.dataset.daycareTab as DaycareMobileView | undefined;
    if (!nextTab || !nextValue) return;
    event.preventDefault();
    nextTab.focus();
    setMobileView(nextValue);
  }

  if (!daycareEnabled) {
    return (
      <div className="business-daycare shell business-daycare--blocked">
        <BusinessPageHeader title="Daycare" />
        <section className="daycare-empty-state" role="status">
          <PawPrint size={34} />
          <div><h2>สาขานี้ยังไม่เปิด Daycare</h2><p>เปิดโมดูล Daycare ในการตั้งค่าสาขาเพื่อเริ่มวางแผนพื้นที่และงานดูแล</p></div>
          <Link className="button button--business" href="/business/settings?section=branches">ตั้งค่าสาขา</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="business-daycare shell">
      <BusinessPageHeader
        title="Daycare"
        context={`${calendarDateLabel(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · ${summary.occupied} ตัวอยู่ในพื้นที่ดูแล`}
        actions={<Link className="button button--business" href="/business/calendar?new=1"><Plus size={18} />เพิ่มการจอง</Link>}
      />

      <section className="daycare-summary" aria-labelledby="daycare-summary-title">
        <header><div><span>ภาพรวมสาขา</span><h2 id="daycare-summary-title">งาน Daycare วันนี้</h2></div><PawPrint size={22} /></header>
        <div className="daycare-summary__stats">
          <article><span>ทั้งหมด</span><strong>{summary.total}</strong><small>รายการของน้องวันนี้</small></article>
          <article><span>รอรับเข้า</span><strong>{summary.booked}</strong><small>เตรียม Intake และโซน</small></article>
          <article><span>กำลังดูแล</span><strong>{summary.checkedIn + summary.active}</strong><small>อยู่ในพื้นที่ {summary.occupied} ตัว</small></article>
          <article><span>พร้อมรับกลับ</span><strong>{summary.readyForPickup}</strong><small>แจ้งลูกค้าและตรวจยอด</small></article>
          <article><span>ความจุคงเหลือ</span><strong>{summary.available}</strong><small>จากทั้งหมด {summary.capacity} ตำแหน่ง</small></article>
        </div>
      </section>

      <section className="daycare-toolbar" aria-label="เลือกวันและค้นหารายการ Daycare">
        <label><span>วันที่</span><input type="date" value={date} onChange={(event) => { if (event.currentTarget.value) setDate(event.currentTarget.value); }} /></label>
        <button type="button" onClick={() => setDate(businessToday(context))}><CalendarDays size={17} />วันนี้</button>
        <label className="daycare-toolbar__search"><Search size={19} /><span className="sr-only">ค้นหารายการ Daycare</span><input value={query} onInput={(event) => setQuery(event.currentTarget.value)} placeholder="ค้นหาน้อง ลูกค้า โซน หรือผู้ดูแล" /></label>
      </section>

      {notice ? <p className="business-daycare__notice" role="status" aria-live="polite"><CheckCircle size={17} />{notice}</p> : null}

      <section className="daycare-zones" aria-labelledby="daycare-zones-title">
        <header><div><span>พื้นที่พร้อมใช้งาน</span><h2 id="daycare-zones-title">โซนดูแล</h2></div><MapPin size={21} /></header>
        <div className="daycare-zones__list">
          {zones.map((zone) => {
            const availability = getPrototypeDaycareZoneAvailability(context, zone.id, date);
            const percentage = availability.capacity > 0 ? Math.round((availability.used / availability.capacity) * 100) : 0;
            return (
              <article key={zone.id} className={availability.available ? "" : "is-full"}>
                <span><strong>{zone.label}</strong><small>{availability.available ? `ว่าง ${availability.remaining}` : "เต็มแล้ว"}</small></span>
                <div role="progressbar" aria-label={`${zone.label} ใช้ ${availability.used} จาก ${availability.capacity}`} aria-valuemin={0} aria-valuemax={availability.capacity} aria-valuenow={availability.used}><span style={{ width: `${percentage}%` }} /></div>
                <b>{availability.used} / {availability.capacity}</b>
              </article>
            );
          })}
        </div>
      </section>

      <div className="daycare-mobile-tabs" role="tablist" aria-label="กรองรายการ Daycare บนมือถือ" tabIndex={-1} onKeyDown={moveMobileTabFocus}>
        {([{"key":"all","label":"ทั้งหมด"}, ...DAYCARE_LANES] as readonly { key: DaycareMobileView; label: string }[]).map((option) => {
          const count = option.key === "all" ? visibleItems.length : laneItems(option.key).length;
          return <button key={option.key} id={`daycare-mobile-tab-${option.key}`} type="button" role="tab" tabIndex={mobileView === option.key ? 0 : -1} data-daycare-tab={option.key} aria-controls="daycare-mobile-panel" aria-selected={mobileView === option.key} onClick={() => setMobileView(option.key)}>{option.label}<span>{count}</span></button>;
        })}
      </div>

      <section className="daycare-board" aria-label="กระดานปฏิบัติงาน Daycare">
        {DAYCARE_LANES.map((lane) => {
          const items = laneItems(lane.key);
          return (
            <section className={`daycare-board__lane daycare-board__lane--${lane.key}`} key={lane.key} aria-labelledby={`daycare-lane-${lane.key}`}>
              <header><div><h2 id={`daycare-lane-${lane.key}`}>{lane.label}</h2><small>{lane.description}</small></div><span>{items.length}</span></header>
              <div className="daycare-board__cards">
                {items.map((item) => <DaycareCard key={item.attendance.daycareAttendanceId} item={item} onOpen={openAttendance} />)}
                {items.length === 0 ? <p className="daycare-board__empty">ยังไม่มีรายการในขั้นตอนนี้</p> : null}
              </div>
            </section>
          );
        })}
      </section>

      <section id="daycare-mobile-panel" className="daycare-mobile-list" role="tabpanel" aria-labelledby={`daycare-mobile-tab-${mobileView}`}>
        {mobileItems.length > 0 ? mobileItems.map((item) => <DaycareCard key={item.attendance.daycareAttendanceId} item={item} onOpen={openAttendance} />) : <div className="daycare-empty-inline"><Search size={22} /><p>ไม่พบรายการ Daycare ตามตัวกรองนี้</p></div>}
      </section>

      {selectedItem ? (
        <DaycareAttendanceDetail
          attendance={selectedItem.attendance}
          customer={selectedItem.customer}
          pet={selectedItem.pet}
          context={context}
          zones={zones}
          staff={staff}
          onClose={closeAttendance}
          onChanged={setNotice}
        />
      ) : null}
    </div>
  );
}
