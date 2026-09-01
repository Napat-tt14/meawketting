"use client";

import { type CSSProperties, type DragEvent, useMemo, useRef, useState } from "react";
import {
  BOOKING_DEMO_DATE,
  evaluatePrototypeHotelStayRoomAvailability,
  getEnabledBusinessModules,
  getHotelRooms,
  getPrototypeHotelRoomOccupancySummary,
  getPrototypeHotelStayRoomAssignment,
  listPrototypeHotelStayFixtures,
  listPrototypeHotelStays,
  movePrototypeHotelStayRoom,
  readPrototypeCustomer,
  readPrototypeCustomerFixture,
  summarizePrototypeHotelStays,
  type DemoBookingPet,
  type PrototypeHotelStay,
} from "../../_prototype/businessState";
import { listPrototypeConversationFixtures, listPrototypeConversations, type PrototypeAddServiceRequestMessage } from "../../_prototype/inboxState";
import {
  BedDouble,
  CalendarDays,
  CheckCircle,
  CircleAlert,
  Clock,
  Plus,
  Scan,
  Search,
  SlidersHorizontal,
  UserRound,
} from "../../_components/icons";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";
import { useBusinessContext, useBusinessStateReady } from "../_components/useBusinessContext";
import { addCalendarDays, calendarDateLabel } from "../calendar/calendarPresentation";
import { HotelStayDetail } from "./HotelStayDetail";
import { HOTEL_LIST_FILTERS, hasHotelStayAttention, hotelCareTaskStateLabel, hotelStatusLabel, hotelStayDateLabel, isHotelStayCurrent, type HotelListFilter } from "./hotelPresentation";

type DragState = { stayId: string; sourceRoomId: string } | null;
type DropTarget = { roomId: string; valid: boolean } | null;
type HotelMobileView = "today" | "staying" | "arrivals" | "departures" | "care";

type HotelStayItem = {
  stay: PrototypeHotelStay;
  pet: DemoBookingPet;
  customerName: string;
  roomId: string | null;
  roomLabel: string | null;
  pendingCare: number;
  incidentCount: number;
  waitingApproval: boolean;
};

function hotelOperationalDate(stay: PrototypeHotelStay, referenceDate: string) {
  if (referenceDate < stay.scheduledCheckIn) return stay.scheduledCheckIn;
  if (referenceDate >= stay.scheduledCheckOut) return addCalendarDays(stay.scheduledCheckOut, -1);
  return referenceDate;
}

function rangeForBoard(stay: PrototypeHotelStay, startDate: string, endDate: string, days: readonly string[]) {
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last) return null;
  const visibleEnd = addCalendarDays(last, 1);
  const start = startDate > first ? startDate : first;
  // Calendar keeps checkout exclusive for planning. Hotel Operations extends
  // only a ready-for-pickup room marker through checkout day because the room
  // remains occupied until the Pet is actually handed back.
  const operationalEnd = stay.status === "ready-for-checkout" && endDate === stay.scheduledCheckOut
    ? addCalendarDays(endDate, 1)
    : endDate;
  const end = operationalEnd < visibleEnd ? operationalEnd : visibleEnd;
  if (start >= end) return null;
  const startIndex = days.indexOf(start);
  const endIndex = end === visibleEnd ? days.length : days.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) return null;
  return { gridColumn: `${startIndex + 1} / ${endIndex + 1}`, spanStart: start, spanEnd: end, stay };
}

function validFilter(value: string | null | undefined): value is HotelListFilter {
  return HOTEL_LIST_FILTERS.some((filter) => filter.key === value);
}

function formatConflict(result: ReturnType<typeof evaluatePrototypeHotelStayRoomAvailability>) {
  return result.conflicts.map((conflict) => conflict.message).join(" · ");
}

export function HotelOperations({
  launchStayId = null,
  launchFilter = null,
}: {
  launchStayId?: string | null;
  launchFilter?: string | null;
}) {
  const { context, revision } = useBusinessContext();
  const stateReady = useBusinessStateReady();
  const [date, setDate] = useState<string>(BOOKING_DEMO_DATE);
  const [range, setRange] = useState<7 | 14 | 28>(7);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HotelListFilter>(validFilter(launchFilter) ? launchFilter : "all");
  const [mobileView, setMobileView] = useState<HotelMobileView>("today");
  const [selectedStayId, setSelectedStayId] = useState<string | null>(launchStayId);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const dragOutcomeRef = useRef<"pending" | "invalid" | "committed" | null>(null);
  void revision;

  const hotelEnabled = getEnabledBusinessModules(context).includes("hotel");
  const stays = (stateReady
    ? listPrototypeHotelStays(context, { includeClosed: true })
    : listPrototypeHotelStayFixtures(context, { includeClosed: true }))
    .filter((stay) => stay.status !== "cancelled" && stay.status !== "no-show");
  const conversations = stateReady ? listPrototypeConversations(context) : listPrototypeConversationFixtures(context);
  const rooms = getHotelRooms(context);
  const summary = summarizePrototypeHotelStays(stays, context, date);
  const days = useMemo(() => Array.from({ length: range }, (_, index) => addCalendarDays(date, index)), [date, range]);
  const waitingRequests = conversations.flatMap((conversation) => conversation.messages)
    .filter((message): message is PrototypeAddServiceRequestMessage => message.kind === "add-service-request" && message.requestStatus === "waiting");

  const items = stays.flatMap((stay) => {
    const customer = stateReady ? readPrototypeCustomer(stay.customerId) : readPrototypeCustomerFixture(stay.customerId);
    const pet = customer?.pets.find((item) => item.id === stay.petId) ?? null;
    if (!customer || !pet) return [];
    const assignment = getPrototypeHotelStayRoomAssignment(stay, hotelOperationalDate(stay, date));
    const room = rooms.find((resource) => resource.id === assignment?.roomId) ?? null;
    const pendingCare = stay.dailyCareTasks.filter((task) => task.scheduledDate === date && task.state === "pending").length;
    const incidentCount = stay.incidentNotes.filter((incident) => incident.severity === "attention" && !incident.resolvedAt).length;
    const waitingApproval = waitingRequests.some((request) => request.bookingId === stay.bookingId);
    return [{
      stay,
      pet,
      customerName: customer.name,
      roomId: room?.id ?? null,
      roomLabel: room?.label ?? null,
      pendingCare,
      incidentCount,
      waitingApproval,
    } satisfies HotelStayItem];
  });

  const normalizedQuery = query.trim().toLocaleLowerCase("th-TH");
  const visibleItems = items.filter((item) => {
    const current = isHotelStayCurrent(item.stay, date);
    const attention = hasHotelStayAttention(item.stay, date, Boolean(item.roomId)) || item.waitingApproval;
    const matchesFilter = filter === "all"
      || (filter === "arrivals" && item.stay.scheduledCheckIn === date)
      || (filter === "current" && current)
      || (filter === "departures" && item.stay.scheduledCheckOut === date)
      || (filter === "attention" && attention);
    const searchText = `${item.pet.name} ${item.customerName} ${item.roomLabel ?? ""}`.toLocaleLowerCase("th-TH");
    return matchesFilter && (!normalizedQuery || searchText.includes(normalizedQuery));
  });

  const arrivalItems = items.filter((item) => item.stay.scheduledCheckIn === date);
  const departureItems = items.filter((item) => item.stay.scheduledCheckOut === date);
  const currentItems = items.filter((item) => isHotelStayCurrent(item.stay, date));
  const careItems = currentItems.flatMap((item) => item.stay.dailyCareTasks
    .filter((task) => task.scheduledDate === date && task.state === "pending")
    .map((task) => ({ item, task })));
  const attentionItems = items.filter((item) => hasHotelStayAttention(item.stay, date, Boolean(item.roomId)) || item.waitingApproval);
  const selectedStay = stays.find((stay) => stay.hotelStayId === selectedStayId || stay.bookingId === selectedStayId) ?? null;

  function openStay(stay: PrototypeHotelStay, source?: HTMLElement) {
    openerRef.current = source ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setSelectedStayId(stay.hotelStayId);
    setNotice(null);
  }

  function closeStay() {
    setSelectedStayId(null);
    window.requestAnimationFrame(() => openerRef.current?.focus());
  }

  function dragStart(stay: PrototypeHotelStay, sourceRoomId: string, event: DragEvent<HTMLElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", stay.hotelStayId);
    dragOutcomeRef.current = "pending";
    setDragging({ stayId: stay.hotelStayId, sourceRoomId });
    setNotice(null);
  }

  function previewRoom(roomId: string, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const stayId = dragging?.stayId ?? event.dataTransfer.getData("text/plain");
    const stay = stays.find((item) => item.hotelStayId === stayId) ?? null;
    if (!stay) return;
    const effectiveDate = hotelOperationalDate(stay, date);
    const availability = evaluatePrototypeHotelStayRoomAvailability(stay, roomId, effectiveDate, stay.scheduledCheckOut, context);
    const valid = availability.available && roomId !== dragging?.sourceRoomId;
    dragOutcomeRef.current = valid ? "pending" : "invalid";
    event.dataTransfer.dropEffect = valid ? "move" : "none";
    setDropTarget({ roomId, valid });
  }

  function dropIntoRoom(roomId: string, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const stayId = dragging?.stayId ?? event.dataTransfer.getData("text/plain");
    const stay = stays.find((item) => item.hotelStayId === stayId) ?? null;
    setDropTarget(null);
    setDragging(null);
    if (!stay) {
      setNotice("ไม่พบรายการเข้าพักที่กำลังย้าย");
      return;
    }
    const effectiveDate = hotelOperationalDate(stay, date);
    const availability = evaluatePrototypeHotelStayRoomAvailability(stay, roomId, effectiveDate, stay.scheduledCheckOut, context);
    if (!availability.available) {
      dragOutcomeRef.current = "invalid";
      setNotice(formatConflict(availability) || "ห้องหรือโซนนี้ไม่พร้อมในช่วงวันที่เลือก");
      return;
    }
    const result = movePrototypeHotelStayRoom(stay.hotelStayId, roomId, context, "ย้ายจากตารางห้องพัก", effectiveDate);
    if (!result.ok) {
      dragOutcomeRef.current = "invalid";
      setNotice(result.availability ? formatConflict(result.availability) : "ย้ายห้องไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    const room = rooms.find((item) => item.id === roomId);
    dragOutcomeRef.current = "committed";
    setNotice(`ย้าย ${items.find((item) => item.stay.hotelStayId === stay.hotelStayId)?.pet.name ?? "น้อง"} ไป ${room?.label ?? "ห้องใหม่"} แล้ว`);
  }

  if (!hotelEnabled) {
    return (
      <div className="business-hotel shell business-hotel--blocked">
        <BusinessPageHeader title="โรงแรม" />
        <section className="hotel-empty-state" role="status">
          <BedDouble size={34} />
          <div><h2>สาขานี้ยังไม่เปิดโรงแรม</h2><p>เมนูนี้จะแสดงเมื่อสาขาปัจจุบันเปิดใช้งานบริการโรงแรม</p></div>
          <Link className="button button--business" href="/business/home">กลับหน้าหลัก</Link>
        </section>
      </div>
    );
  }

  return (
    <div className={`business-hotel shell${dragging ? " is-dragging" : ""}`} data-mobile-view={mobileView}>
      <BusinessPageHeader
        title="โรงแรม"
        context={`วันนี้ ${calendarDateLabel(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · ${summary.current} ตัวกำลังพัก`}
        actions={<Link className="button button--business" href="/business/calendar?new=1"><Plus size={18} />เพิ่มการจอง</Link>}
      />

      <div className="hotel-mobile-view-tabs" role="tablist" aria-label="เลือกมุมมองงานโรงแรม">
        {([
          ["today", "วันนี้", summary.attention],
          ["staying", "กำลังพัก", currentItems.length],
          ["arrivals", "เข้าพัก", arrivalItems.length],
          ["departures", "ออกวันนี้", departureItems.length],
          ["care", "งานดูแล", careItems.length],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mobileView === value}
            onClick={() => {
              setMobileView(value);
              if (value === "staying") setFilter("current");
            }}
          >
            {label}<span>{count}</span>
          </button>
        ))}
      </div>

      <section className="hotel-today-summary" aria-label="ภาพรวมโรงแรมวันนี้">
        <article><span><CalendarDays size={20} />เข้าพักวันนี้</span><strong>{summary.arrivals}</strong><small>รอรับเข้า {summary.unassignedArrivals} ตัว</small></article>
        <article><span><Clock size={20} />ออกวันนี้</span><strong>{summary.departures}</strong><small>เตรียมรับกลับตามรายการ</small></article>
        <article><span><BedDouble size={20} />การใช้พื้นที่</span><strong>{summary.occupied} / {summary.capacity}</strong><small>จองไว้ {summary.reserved} · ว่าง {summary.available}</small></article>
        <article><span><CheckCircle size={20} />ต้องดูแล</span><strong>{summary.careDue}</strong><small>งานดูแลที่ยังค้างวันนี้</small></article>
        <article><span><CircleAlert size={20} />ต้องจัดการ</span><strong>{summary.attention}</strong><small>งานดูแล {summary.careDue} · incident {summary.incidents} · พร้อมกลับ {summary.readyForPickup}</small></article>
      </section>

      <nav className="hotel-section-links" aria-label="ข้ามไปส่วนการทำงานโรงแรม">
        <a href="#hotel-occupancy">ห้องพัก</a><a href="#hotel-stays">การเข้าพัก</a><a href="#hotel-care">งานดูแล</a>
      </nav>

      <section className="hotel-toolbar" aria-label="เลือกวัน ช่วงแสดงผล ค้นหา และกรองการเข้าพัก">
        <label className="hotel-toolbar__date"><span>วันที่</span><input type="date" value={date} onChange={(event) => setDate(event.currentTarget.value)} /></label>
        <button type="button" onClick={() => setDate(BOOKING_DEMO_DATE)}><CalendarDays size={17} />วันนี้</button>
        <fieldset className="hotel-toolbar__range"><legend>ช่วงแสดงผล</legend>{([7, 14, 28] as const).map((value) => <button key={value} type="button" aria-pressed={range === value} onClick={() => setRange(value)}>{value} วัน</button>)}</fieldset>
        <label className="hotel-toolbar__search"><Search size={19} /><span className="sr-only">ค้นหาการเข้าพัก</span><input value={query} onInput={(event) => setQuery(event.currentTarget.value)} placeholder="ค้นหาน้อง ลูกค้า หรือห้อง" /></label>
        <label className="hotel-toolbar__filter"><SlidersHorizontal size={18} /><span className="sr-only">กรองรายการ</span><select value={filter} onChange={(event) => setFilter(event.currentTarget.value as HotelListFilter)}>{HOTEL_LIST_FILTERS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
      </section>

      {notice ? <p className="business-hotel__notice" role="status"><CircleAlert size={17} />{notice}</p> : null}

      <section className="hotel-attention" aria-labelledby="hotel-attention-title">
        <header><div><span>วันนี้</span><h2 id="hotel-attention-title">ต้องจัดการ</h2></div><CircleAlert size={23} /></header>
        {attentionItems.length > 0 ? <div className="hotel-attention__list">{attentionItems.slice(0, 5).map((item) => {
          const message = item.waitingApproval ? "รอลูกค้าตอบเรื่องบริการเพิ่มเติม" : item.incidentCount > 0 ? `มี incident / note ต้องติดตาม ${item.incidentCount} รายการ` : !item.roomId && item.stay.scheduledCheckIn === date ? "วันนี้เข้าพักแต่ยังไม่ได้ระบุห้อง" : item.stay.scheduledCheckOut === date ? "ต้องเตรียมรับกลับวันนี้" : item.pendingCare > 0 ? `งานดูแลค้าง ${item.pendingCare} งาน` : "ตรวจสถานะการเข้าพัก";
          return <button key={item.stay.hotelStayId} type="button" onClick={(event) => openStay(item.stay, event.currentTarget)}><BusinessPetAvatar pet={item.pet} size="small" /><span><strong>{item.pet.name}</strong><small>{message}</small></span><CircleAlert size={17} /></button>;
        })}</div> : <p className="hotel-attention__empty">ยังไม่มีรายการที่ต้องจัดการ</p>}
      </section>

      <section id="hotel-occupancy" className="hotel-occupancy" aria-labelledby="hotel-occupancy-title">
        <header className="hotel-section-heading"><div><span>ห้องพัก</span><h2 id="hotel-occupancy-title">ห้องและโซน</h2><p>{range} วัน · {calendarDateLabel(days[0] ?? date, { day: "numeric", month: "short" })} – {calendarDateLabel(days.at(-1) ?? date, { day: "numeric", month: "short", year: "numeric" })}</p></div><BedDouble size={24} /></header>
        <details className="hotel-occupancy__hint"><summary>วิธีจัดห้อง</summary><p><CheckCircle size={17} />หนึ่งแถบคือหนึ่งช่วงเข้าพัก ลากไปห้องอื่นได้ หรือเปิดรายละเอียดเพื่อเลือกห้อง</p></details>
        <div className="hotel-occupancy-board-wrap" role="region" aria-label="ตารางการเข้าพักตามห้องและวัน">
          <div className="hotel-occupancy-board" style={{ "--hotel-days": days.length } as CSSProperties}>
            <div className="hotel-occupancy-board__header"><span>ห้อง / โซน</span><div>{days.map((day) => <time key={day} dateTime={day}><b>{calendarDateLabel(day, { weekday: "short" })}</b><small>{calendarDateLabel(day, { day: "numeric", month: "short" })}</small></time>)}</div></div>
            {rooms.map((room) => {
              const roomSummary = getPrototypeHotelRoomOccupancySummary(stays, context, room.id, date);
              const rowSpans = stays.flatMap((stay) => stay.roomAssignments.filter((assignment) => assignment.roomId === room.id).flatMap((assignment) => {
                const boardSpan = rangeForBoard(stay, assignment.startDate, assignment.endDate ?? stay.scheduledCheckOut, days);
                const item = items.find((candidate) => candidate.stay.hotelStayId === stay.hotelStayId) ?? null;
                return boardSpan && item ? [{ ...boardSpan, item, assignmentId: assignment.id }] : [];
              }));
              const activeDrop = dropTarget?.roomId === room.id ? (dropTarget.valid ? " is-drop-valid" : " is-drop-invalid") : "";
              return <div className={`hotel-occupancy-row${activeDrop}`} key={room.id} data-hotel-room-id={room.id} onDragOver={(event) => previewRoom(room.id, event)} onDragLeave={() => setDropTarget((current) => current?.roomId === room.id ? null : current)} onDrop={(event) => dropIntoRoom(room.id, event)}><header><strong>{room.label}</strong><small>{room.hotelRole === "zone" ? "โซน" : "ห้อง"} · ความจุ {roomSummary.capacity}</small><small>พัก {roomSummary.occupied} · จอง {roomSummary.reserved} · ว่าง {roomSummary.available}</small></header><div className="hotel-occupancy-row__track" style={{ "--hotel-days": days.length } as CSSProperties}>{days.map((day) => <span key={day} aria-hidden="true" />)}{rowSpans.map((span) => <button key={`${span.stay.hotelStayId}-${span.assignmentId}`} type="button" draggable onDragStart={(event) => dragStart(span.stay, room.id, event)} onDragEnd={() => { if (dragOutcomeRef.current !== "committed") setNotice(dragOutcomeRef.current === "invalid" ? "ห้องหรือโซนปลายทางไม่พร้อม · รายการกลับอยู่ห้องเดิมแล้ว" : "ยังไม่ได้ย้ายห้อง · รายการอยู่ตำแหน่งเดิม"); dragOutcomeRef.current = null; setDragging(null); setDropTarget(null); }} className={`hotel-occupancy-span hotel-occupancy-span--${span.stay.status}${dragging?.stayId === span.stay.hotelStayId ? " is-dragging" : ""}`} style={{ gridColumn: span.gridColumn }} aria-label={`${span.item.pet.name} ${hotelStatusLabel(span.stay.status)} ${hotelStayDateLabel(span.stay)} ใน ${room.label}`} onClick={(event) => openStay(span.stay, event.currentTarget)}><BusinessPetAvatar pet={span.item.pet} size="small" /><span><strong>{span.item.pet.name}</strong><small>{hotelStatusLabel(span.stay.status)} · {calendarDateLabel(span.stay.scheduledCheckIn, { day: "numeric", month: "short" })}–{calendarDateLabel(span.stay.scheduledCheckOut, { day: "numeric", month: "short" })}</small></span></button>)}</div></div>;
            })}
          </div>
        </div>
      </section>

      <section id="hotel-stays" className="hotel-stays" aria-labelledby="hotel-stays-title">
        <header className="hotel-section-heading"><div><span>รายการ</span><h2 id="hotel-stays-title">การเข้าพัก</h2></div><UserRound size={24} /></header>
        <div className="hotel-stays__filters" role="tablist" aria-label="กรองการเข้าพักบนมือถือ">{HOTEL_LIST_FILTERS.map((option) => <button key={option.key} type="button" role="tab" aria-selected={filter === option.key} onClick={() => setFilter(option.key)}>{option.label}<span>{option.key === "all" ? items.length : option.key === "arrivals" ? arrivalItems.length : option.key === "current" ? currentItems.length : option.key === "departures" ? departureItems.length : attentionItems.length}</span></button>)}</div>
        {visibleItems.length > 0 ? <div className="hotel-stay-cards">{visibleItems.map((item) => <HotelStayCard key={item.stay.hotelStayId} item={item} date={date} onOpen={openStay} />)}</div> : <div className="hotel-empty-inline"><Search size={22} /><p>ไม่พบการเข้าพักตามตัวกรองนี้</p></div>}
      </section>

      <div className="hotel-daily-columns">
        <section className="hotel-arrivals" aria-labelledby="hotel-arrivals-title"><header className="hotel-section-heading"><div><span>วันนี้</span><h2 id="hotel-arrivals-title">เข้าพักวันนี้</h2></div><Scan size={24} /></header>{arrivalItems.length > 0 ? <div className="hotel-compact-list">{arrivalItems.map((item) => <article key={item.stay.hotelStayId}><BusinessPetAvatar pet={item.pet} size="medium" /><span><strong>{item.pet.name}</strong><small>{item.customerName} · {hotelStatusLabel(item.stay.status)} · {item.roomLabel ?? "ยังไม่ได้ระบุห้อง"}</small></span>{["booked", "expected-today"].includes(item.stay.status) && !item.stay.intakeId ? <Link href={`/business/scan?hotelStayId=${encodeURIComponent(item.stay.hotelStayId)}`}><Scan size={17} />รับเข้า</Link> : <button type="button" onClick={(event) => openStay(item.stay, event.currentTarget)}>{["booked", "expected-today"].includes(item.stay.status) ? "รับเข้า" : "เปิดการเข้าพัก"}</button>}</article>)}</div> : <p className="hotel-empty-inline">วันนี้ไม่มีน้องเข้าพักใหม่</p>}</section>
        <section className="hotel-departures" aria-labelledby="hotel-departures-title"><header className="hotel-section-heading"><div><span>วันนี้</span><h2 id="hotel-departures-title">ออกวันนี้</h2></div><Clock size={24} /></header>{departureItems.length > 0 ? <div className="hotel-compact-list">{departureItems.map((item) => <article key={item.stay.hotelStayId}><BusinessPetAvatar pet={item.pet} size="medium" /><span><strong>{item.pet.name}</strong><small>{item.customerName} · {hotelStatusLabel(item.stay.status)} · {item.roomLabel ?? "ยังไม่ได้ระบุห้อง"}</small></span><button type="button" onClick={(event) => openStay(item.stay, event.currentTarget)}>{item.stay.status === "completed" || item.stay.status === "checked-out" ? "ดูรายการ" : "เตรียมรับกลับ"}</button></article>)}</div> : <p className="hotel-empty-inline">วันนี้ไม่มีน้องออกจากการเข้าพัก</p>}</section>
      </div>

      <section id="hotel-care" className="hotel-daily-care" aria-labelledby="hotel-care-title">
        <header className="hotel-section-heading"><div><span>ตามเวลา</span><h2 id="hotel-care-title">ต้องดูแลวันนี้</h2></div><CheckCircle size={24} /></header>
        {careItems.length > 0 ? <div className="hotel-daily-care__list">{careItems.map(({ item, task }) => <button key={task.id} type="button" onClick={(event) => openStay(item.stay, event.currentTarget)}><BusinessPetAvatar pet={item.pet} size="medium" /><span className="hotel-daily-care__pet"><strong>{item.pet.name}</strong><small>{item.roomLabel ?? "ยังไม่ได้ระบุห้อง"}</small></span><time>{task.scheduledTime}</time><span className="hotel-daily-care__task"><strong>{task.label}</strong><small>{hotelCareTaskStateLabel(task, date)}</small></span><span className="hotel-daily-care__state">{hotelCareTaskStateLabel(task, date)}</span></button>)}</div> : <p className="hotel-empty-inline">ยังไม่มีงานดูแลที่ค้างอยู่</p>}
      </section>

      {selectedStay ? <HotelStayDetail key={`${selectedStay.hotelStayId}:${selectedStay.updatedAt}`} stay={selectedStay} context={context} referenceDate={date} fixtureOnly={!stateReady} onClose={closeStay} onChanged={(result) => setNotice(result.notice)} /> : null}
    </div>
  );
}

function HotelStayCard({
  item,
  date,
  onOpen,
}: {
  item: HotelStayItem;
  date: string;
  onOpen: (stay: PrototypeHotelStay, source?: HTMLElement) => void;
}) {
  const attention = hasHotelStayAttention(item.stay, date, Boolean(item.roomId)) || item.waitingApproval;
  return (
    <button className={`hotel-stay-card${attention ? " has-attention" : ""}`} type="button" onClick={(event) => onOpen(item.stay, event.currentTarget)}>
      <BusinessPetAvatar pet={item.pet} size="large" />
      <span className="hotel-stay-card__identity"><strong>{item.pet.name}</strong><small>{item.customerName}</small></span>
      <span className={`hotel-stay-status hotel-stay-status--${item.stay.status}`}>{hotelStatusLabel(item.stay.status)}</span>
      <span className="hotel-stay-card__facts"><span><BedDouble size={16} />{item.roomLabel ?? "ยังไม่ได้ระบุห้อง"}</span><span><CalendarDays size={16} />{hotelStayDateLabel(item.stay)}</span></span>
      {attention ? <span className="hotel-stay-card__attention"><CircleAlert size={16} />{item.waitingApproval ? "รอลูกค้าตอบ" : item.incidentCount > 0 ? `incident / note ${item.incidentCount}` : item.pendingCare > 0 ? `งานดูแลค้าง ${item.pendingCare}` : "ต้องตรวจรายการ"}</span> : null}
    </button>
  );
}
