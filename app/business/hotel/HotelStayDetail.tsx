"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rescheduleDurableBooking } from "../../_backend/be3/client";
import {
  evaluatePrototypeHotelStayDateChange,
  getHotelRooms,
  getTeamMembersForCapability,
  getPrototypeHotelStayRoomAssignment,
  listPrototypeHotelLinkedGroomingJobs,
  readPrototypeBooking,
  readPrototypeCustomer,
  readPrototypeCustomerFixture,
  type DemoBusinessContext,
  type PrototypeHotelStay,
} from "../../_prototype/businessState";
import { addPrototypeHotelIncidentNote, assignPrototypeHotelCareTaskStaff, assignPrototypeHotelStayRoom, checkInPrototypeHotelStay, completePrototypeHotelCareTask, movePrototypeHotelStayRoom, resolvePrototypeHotelIncidentNote, transitionPrototypeHotelStay, updatePrototypeHotelStayNote } from "../../_backend/be4/facade";
import { ensureDurableOperations } from "../../_backend/be4/client";
import { ensureDurableConversation as ensurePrototypeConversation } from "../../_backend/be6/client";
import {
  BedDouble,
  CalendarDays,
  CheckCircle,
  CircleAlert,
  Clock,
  MessageCircle,
  Plus,
  Save,
  Scan,
  Scissors,
  UserRound,
  Wallet,
  X,
} from "../../_components/icons";
import { BusinessCustomerAvatar, BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";
import { AddServiceRequestDialog } from "../inbox/AddServiceRequestDialog";
import { addCalendarDays, calendarDateLabel } from "../calendar/calendarPresentation";
import { hotelCareTaskIconLabel, hotelCareTaskStateLabel, hotelStatusLabel, hotelStayDateLabel } from "./hotelPresentation";

type DetailMutationResult = { ok: boolean; notice: string };

function operationalDate(stay: PrototypeHotelStay, referenceDate: string) {
  if (referenceDate < stay.scheduledCheckIn) return stay.scheduledCheckIn;
  if (referenceDate >= stay.scheduledCheckOut) return addCalendarDays(stay.scheduledCheckOut, -1);
  return referenceDate;
}

function transitionNotice(result: Awaited<ReturnType<typeof transitionPrototypeHotelStay>>, label: string): DetailMutationResult {
  if (result.ok) return { ok: true, notice: result.duplicate ? "สถานะนี้ถูกบันทึกไว้แล้ว" : label };
  const notices: Record<Exclude<typeof result.reason, never>, string> = {
    missing: "ไม่พบรายการเข้าพักนี้",
    "wrong-context": "รายการนี้ไม่อยู่ในสาขาปัจจุบัน",
    "invalid-transition": "เปลี่ยนสถานะไม่ได้ตามลำดับการเข้าพัก",
    "room-required": "ระบุห้องหรือโซนก่อนรับเข้า",
    "intake-required": "ต้องทำ Intake ที่มีสิทธิ์ก่อนรับเข้า",
    "care-incomplete": "ยังมีงานดูแลที่ต้องทำให้เสร็จก่อนเช็กเอาต์",
    storage: "บันทึกสถานะไม่สำเร็จ ลองอีกครั้ง",
  };
  return { ok: false, notice: notices[result.reason] ?? result.message };
}

export function HotelStayDetail({
  stay,
  context,
  referenceDate,
  fixtureOnly,
  onClose,
  onChanged,
}: {
  stay: PrototypeHotelStay;
  context: DemoBusinessContext;
  referenceDate: string;
  fixtureOnly: boolean;
  onClose: () => void;
  onChanged: (result: DetailMutationResult) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const requestOpenRef = useRef(false);
  const [note, setNote] = useState(stay.businessNote);
  const [roomId, setRoomId] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [incidentSummary, setIncidentSummary] = useState("");
  const [checkInDate, setCheckInDate] = useState(stay.scheduledCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(stay.scheduledCheckOut);
  const [savingDates, setSavingDates] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState<{ conversationId: string; bookingId: string; serviceLabel: string } | null>(null);
  const customer = fixtureOnly ? readPrototypeCustomerFixture(stay.customerId) : readPrototypeCustomer(stay.customerId);
  const pet = customer?.pets.find((item) => item.id === stay.petId) ?? null;
  const rooms = getHotelRooms(context);
  const operationDate = operationalDate(stay, referenceDate);
  const currentAssignment = getPrototypeHotelStayRoomAssignment(stay, operationDate);
  const currentRoom = rooms.find((room) => room.id === currentAssignment?.roomId) ?? null;
  const linkedGroomingJobs = useMemo(() => listPrototypeHotelLinkedGroomingJobs(stay, fixtureOnly), [fixtureOnly, stay]);
  const booking = readPrototypeBooking(stay.bookingId);
  const careStaff = getTeamMembersForCapability(context, "hotel-care", { includeInactive: true, includeUnavailable: true });

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    requestOpenRef.current = Boolean(requestOpen);
  }, [requestOpen]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => headingRef.current?.focus());
    function trapFocus(event: KeyboardEvent) {
      if (event.defaultPrevented || requestOpenRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])")];
      const first = focusable[0];
      const last = focusable.at(-1);
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
    document.addEventListener("keydown", trapFocus);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", trapFocus);
    };
  }, [close]);

  if (!customer || !pet) return null;

  function publish(result: DetailMutationResult) {
    setNotice(result.notice);
    onChanged(result);
  }

  async function assignOrMoveRoom() {
    if (!roomId) {
      publish({ ok: false, notice: "เลือกห้องหรือโซนก่อนบันทึก" });
      return;
    }
    const result = currentAssignment
      ? await movePrototypeHotelStayRoom(stay.hotelStayId, roomId, context, moveReason, operationDate)
      : await assignPrototypeHotelStayRoom(stay.hotelStayId, roomId, context);
    if (!result.ok) {
      const detail = result.availability?.conflicts.map((conflict) => conflict.message).join(" · ");
      publish({ ok: false, notice: detail || "ห้องหรือโซนนี้ไม่พร้อมในช่วงวันที่เลือก" });
      return;
    }
    setMoveReason("");
    setRoomId("");
    publish({ ok: true, notice: currentAssignment ? "ย้ายห้องแล้ว และเก็บประวัติการย้ายไว้" : "ระบุห้องหรือโซนแล้ว" });
  }

  async function saveDates() {
    const preview = evaluatePrototypeHotelStayDateChange(stay.hotelStayId, checkInDate, checkOutDate, context);
    if (!preview.ok) {
      const detail = preview.availability?.conflicts.map((conflict) => conflict.message).join(" · ");
      const fallback = preview.reason === "invalid-dates" ? "เลือกวันออกให้หลังวันเข้าพัก" : "ปรับวันเข้าพักไม่สำเร็จ";
      publish({ ok: false, notice: detail || fallback });
      return;
    }
    const booking = readPrototypeBooking(stay.bookingId);
    if (!booking || booking.serviceModule !== "hotel") {
      publish({ ok: false, notice: "ไม่พบการจองหลักของรายการเข้าพักนี้" });
      return;
    }
    setSavingDates(true);
    try {
      const result = await rescheduleDurableBooking({
        businessId: context.businessId,
        branchId: context.branchId,
        bookingId: booking.bookingId,
        expectedRevision: booking.revision ?? 1,
        start: checkInDate,
        end: checkOutDate,
      });
      if (result.outcome === "conflict") {
        publish({
          ok: false,
          notice: result.availability.conflicts.map((conflict) => conflict.message).join(" · ") || "ปรับวันเข้าพักไม่สำเร็จ",
        });
        return;
      }
      try { await ensureDurableOperations(context.businessId, context.branchId, true); }
      catch {
        publish({ ok: true, notice: "บันทึกวันเข้าพักแล้ว กรุณาโหลดหน้าใหม่เพื่อดูข้อมูลล่าสุด" });
        return;
      }
      publish({ ok: true, notice: "ปรับวันเข้าพักและตารางการจองแล้ว" });
    } catch {
      publish({ ok: false, notice: "ยังยืนยันผลการบันทึกไม่ได้ กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง" });
    } finally {
      setSavingDates(false);
    }
  }

  async function saveNote() {
    const updated = await updatePrototypeHotelStayNote(stay.hotelStayId, note, context);
    publish({ ok: Boolean(updated), notice: updated ? "บันทึกหมายเหตุของร้านแล้ว" : "บันทึกหมายเหตุไม่สำเร็จ ลองอีกครั้ง" });
  }

  async function completeCare(taskId: string) {
    const updated = await completePrototypeHotelCareTask(stay.hotelStayId, taskId, context);
    publish({ ok: Boolean(updated), notice: updated ? "บันทึกงานดูแลเป็นเสร็จแล้ว" : "บันทึกงานดูแลไม่สำเร็จ ลองอีกครั้ง" });
  }

  async function assignCareStaff(taskId: string, staffId: string) {
    const result = await assignPrototypeHotelCareTaskStaff(stay.hotelStayId, taskId, staffId || null, context);
    if (!result.ok) {
      const fallback = result.reason === "invalid-staff"
        ? "พนักงานคนนี้ไม่อยู่ในสาขาหรือไม่มีความสามารถงานดูแล"
        : result.reason === "unavailable"
          ? result.availability?.conflicts[0]?.message ?? "พนักงานไม่พร้อมในเวลางานดูแลนี้"
          : "บันทึกผู้รับผิดชอบงานดูแลไม่สำเร็จ";
      publish({ ok: false, notice: fallback });
      return;
    }
    publish({ ok: true, notice: staffId ? "มอบหมายงานดูแลให้ทีมแล้ว" : "ยกเลิกการมอบหมายงานดูแลแล้ว" });
  }

  async function addIncident() {
    const updated = await addPrototypeHotelIncidentNote(stay.hotelStayId, incidentSummary, context);
    if (updated) setIncidentSummary("");
    publish({ ok: Boolean(updated), notice: updated ? "เพิ่ม incident / note ที่ต้องติดตามแล้ว" : "กรอกเหตุที่ต้องติดตามก่อนบันทึก" });
  }

  async function resolveIncident(incidentId: string) {
    const updated = await resolvePrototypeHotelIncidentNote(stay.hotelStayId, incidentId, context);
    publish({ ok: Boolean(updated), notice: updated ? "ปิด incident / note แล้ว" : "อัปเดตรายการนี้ไม่สำเร็จ" });
  }

  async function advanceLifecycle() {
    let result: DetailMutationResult;
    if (stay.status === "booked" || stay.status === "expected-today") {
      if (!stay.intakeId) {
        result = { ok: false, notice: "ต้องทำ Intake ที่มีสิทธิ์ก่อนรับเข้า" };
      } else if (!currentAssignment) {
        result = { ok: false, notice: "ระบุห้องหรือโซนก่อนรับเข้า" };
      } else {
        result = transitionNotice(await checkInPrototypeHotelStay(stay.hotelStayId, context), "รับน้องเข้าพักแล้ว");
      }
    } else if (stay.status === "checked-in") {
      result = transitionNotice(await transitionPrototypeHotelStay(stay.hotelStayId, "in-stay", context), "เริ่มสถานะพักอยู่แล้ว");
    } else if (stay.status === "in-stay") {
      result = transitionNotice(await transitionPrototypeHotelStay(stay.hotelStayId, "ready-for-checkout", context), "ตั้งสถานะพร้อมรับกลับแล้ว");
    } else if (stay.status === "ready-for-checkout") {
      result = transitionNotice(await transitionPrototypeHotelStay(stay.hotelStayId, "checked-out", context), "เช็กเอาต์แล้ว · รอตรวจปิดรายการ");
    } else if (stay.status === "checked-out") {
      result = transitionNotice(await transitionPrototypeHotelStay(stay.hotelStayId, "completed", context), "ปิดการเข้าพักเป็นเสร็จสิ้นแล้ว");
    } else {
      result = { ok: false, notice: "สถานะนี้ไม่มีขั้นตอนถัดไป" };
    }
    publish(result);
  }

  function lifecycleAction(): { label: string; icon: "scan" | "check" } | null {
    if (stay.status === "booked" || stay.status === "expected-today") return { label: stay.intakeId ? "รับน้องเข้าพัก" : "ไปที่ Intake", icon: "scan" };
    if (stay.status === "checked-in") return { label: "เริ่มพักอยู่", icon: "check" };
    if (stay.status === "in-stay") return { label: "เตรียมรับกลับ", icon: "check" };
    if (stay.status === "ready-for-checkout") return { label: "เช็กเอาต์", icon: "check" };
    if (stay.status === "checked-out") return { label: "เสร็จสิ้น", icon: "check" };
    return null;
  }

  async function openAddServiceRequest() {
    if (!booking) {
      publish({ ok: false, notice: "รายการเข้าพักนี้ไม่มีบริบทการจองที่พร้อมส่งคำขอ" });
      return;
    }
    const result = await ensurePrototypeConversation({
      businessId: context.businessId,
      branchId: context.branchId,
      customerId: customer!.id,
      petId: pet!.id,
      bookingId: booking.bookingId,
      serviceJobId: null,
    });
    if (!result.ok) {
      publish({ ok: false, notice: "ยังเปิดบริบทข้อความสำหรับรายการนี้ไม่ได้" });
      return;
    }
    setRequestOpen({ conversationId: result.conversation.conversationId, bookingId: booking.bookingId, serviceLabel: booking.service.label });
  }

  const action = lifecycleAction();
  const checkoutAvailable = stay.status === "ready-for-checkout" || stay.status === "checked-out" || stay.status === "completed";
  const intakeHref = `/business/scan?hotelStayId=${encodeURIComponent(stay.hotelStayId)}`;
  const inboxHref = `/business/inbox?customerId=${encodeURIComponent(customer.id)}&petId=${encodeURIComponent(pet.id)}&bookingId=${encodeURIComponent(stay.bookingId)}`;

  return (
    <>
      <button className="hotel-stay-detail__backdrop" type="button" tabIndex={-1} aria-label="ปิดรายละเอียดการเข้าพัก" onClick={close} />
      <aside ref={dialogRef} className="hotel-stay-detail" role="dialog" aria-modal="true" aria-labelledby="hotel-stay-detail-title">
        <header className="hotel-stay-detail__header">
          <div className="hotel-stay-detail__identity">
            <BusinessPetAvatar pet={pet} size="large" />
            <div>
              <small>การเข้าพักโรงแรม</small>
              <h2 ref={headingRef} id="hotel-stay-detail-title" tabIndex={-1}>{pet.name}</h2>
              <span className={`hotel-stay-status hotel-stay-status--${stay.status}`}>{hotelStatusLabel(stay.status)}</span>
            </div>
          </div>
          <button type="button" aria-label="ปิดรายละเอียดการเข้าพัก" onClick={close}><X size={20} /></button>
        </header>

        <div className="hotel-stay-detail__content">
          {notice ? <p className="hotel-stay-detail__notice" role="status"><CircleAlert size={17} />{notice}</p> : null}

          <section className="hotel-detail-section hotel-detail-section--people" aria-labelledby="hotel-person-title">
            <header><h3 id="hotel-person-title">น้องและลูกค้า</h3></header>
            <div className="hotel-detail-person"><BusinessCustomerAvatar name={customer.name} /><span><strong>{customer.name}</strong><small>{customer.phone ?? "ยังไม่มีเบอร์โทร"}</small></span></div>
            <div className="hotel-detail-section__actions">
              <a href={`/business/customers/${encodeURIComponent(customer.id)}`}><UserRound size={17} />ดูลูกค้า</a>
              <a href={inboxHref}><MessageCircle size={17} />ส่งข้อความ</a>
            </div>
          </section>

          <section className="hotel-detail-section" aria-labelledby="hotel-dates-title">
            <header><h3 id="hotel-dates-title">ช่วงเข้าพัก</h3><CalendarDays size={20} /></header>
            <p className="hotel-detail-dates__label">{hotelStayDateLabel(stay)}</p>
            <div className="hotel-detail-date-fields">
              <label><span>เข้าพัก</span><input type="date" value={checkInDate} onChange={(event) => setCheckInDate(event.currentTarget.value)} /></label>
              <label><span>ออก</span><input type="date" value={checkOutDate} onChange={(event) => setCheckOutDate(event.currentTarget.value)} /></label>
            </div>
            <button className="button button--business-ghost" type="button" disabled={savingDates} aria-busy={savingDates} onClick={() => void saveDates()}><Save size={17} />{savingDates ? "กำลังบันทึก" : "ปรับช่วงเข้าพัก"}</button>
          </section>

          <section className="hotel-detail-section" aria-labelledby="hotel-room-title">
            <header><h3 id="hotel-room-title">ห้อง / โซน</h3><BedDouble size={20} /></header>
            <p className="hotel-detail-room__current">{currentRoom ? <><strong>{currentRoom.label}</strong><span>ความจุ {currentRoom.capacity} ตัว</span></> : "ยังไม่ได้ระบุห้องหรือโซน"}</p>
            <label className="hotel-detail-field"><span>{currentAssignment ? "ย้ายไปห้องหรือโซน" : "เลือกห้องหรือโซน"}</span><select value={roomId} onChange={(event) => setRoomId(event.currentTarget.value)}><option value="">เลือกห้องหรือโซน</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.label} · ความจุ {room.capacity}</option>)}</select></label>
            {currentAssignment ? <label className="hotel-detail-field"><span>เหตุผลการย้าย <small>ไม่บังคับ</small></span><input value={moveReason} maxLength={160} placeholder="เช่น ทำความสะอาด หรือเปลี่ยนโซน" onInput={(event) => setMoveReason(event.currentTarget.value)} /></label> : null}
            <button className="button button--business-ghost" type="button" onClick={assignOrMoveRoom}><BedDouble size={17} />{currentAssignment ? "ยืนยันย้ายห้อง" : "บันทึกห้อง"}</button>
            <p className="hotel-detail-section__hint"><CheckCircle size={16} />ตรวจความว่างและความจุก่อนบันทึก · หากเต็มจะไม่ย้ายหรือทับการเข้าพักเดิม</p>
          </section>

          <section className="hotel-detail-section" aria-labelledby="hotel-lifecycle-title">
            <header><h3 id="hotel-lifecycle-title">สถานะการเข้าพัก</h3></header>
            <div className="hotel-detail-lifecycle">
              <span><Clock size={16} />{hotelStatusLabel(stay.status)}</span>
              {stay.status === "booked" || stay.status === "expected-today" ? <a href={intakeHref}><Scan size={17} />{stay.intakeId ? "ดู Intake" : "ทำ Intake"}</a> : null}
              {action ? <button type="button" onClick={(stay.status === "booked" || stay.status === "expected-today") && !stay.intakeId ? () => { window.location.href = intakeHref; } : advanceLifecycle}>{action.icon === "scan" ? <Scan size={17} /> : <CheckCircle size={17} />}{action.label}</button> : null}
              {checkoutAvailable ? <a className="hotel-detail-lifecycle__billing" href={`/business/billing?hotelStayId=${encodeURIComponent(stay.hotelStayId)}`}><Wallet size={17} />ตรวจยอด / รับชำระ</a> : null}
              {stay.status === "checked-out" || stay.status === "completed" ? <p className="hotel-detail-section__hint hotel-detail-service-record"><CheckCircle size={16} />บันทึกประวัติบริการแล้ว · เปิดดูได้จากหน้าลูกค้าและสัตว์เลี้ยง</p> : null}
            </div>
            <p className="hotel-detail-section__hint"><CheckCircle size={16} />ก่อนเช็กเอาต์ ระบบตรวจงานดูแลที่ยังค้างอยู่แบบ lightweight · การชำระเงินทำผ่าน Checkout แยกต่างหาก</p>
          </section>

          <section className="hotel-detail-section" aria-labelledby="hotel-care-title">
            <header><h3 id="hotel-care-title">งานดูแลวันนี้</h3><CheckCircle size={20} /></header>
            {stay.dailyCareTasks.length > 0 ? <ul className="hotel-care-list">{stay.dailyCareTasks.map((task) => {
              const stateLabel = hotelCareTaskStateLabel(task, referenceDate);
              const assignedStaff = careStaff.find((member) => member.staffId === task.assignedStaffId) ?? null;
              return <li key={task.id} className={task.state === "completed" ? "is-complete" : ""}><span className="hotel-care-list__time"><time>{task.scheduledTime}</time><small>{hotelCareTaskIconLabel(task)}</small></span><span className="hotel-care-list__task"><strong>{task.label}</strong><small>{task.completedAt ? `โดย ${task.completedBy ?? "ทีมร้าน"}` : task.kind === "medication" ? `${stateLabel} · ยืนยันจาก Intake แล้ว` : stateLabel}</small>{task.instructions ? <em>{task.instructions}</em> : null}<label className="hotel-care-list__assignee"><span>ผู้รับผิดชอบ</span><select value={task.assignedStaffId ?? ""} onChange={(event) => assignCareStaff(task.id, event.currentTarget.value)} aria-label={`มอบหมาย ${task.label} ให้ทีม`}><option value="">ยังไม่มอบหมาย</option>{careStaff.map((member) => <option key={member.staffId} value={member.staffId} disabled={!member.active}>{member.name}{member.active ? "" : " · ปิดใช้งาน"}</option>)}</select></label>{assignedStaff ? <small className="hotel-care-list__assignee-state">มอบหมายให้ {assignedStaff.name}</small> : null}</span><button type="button" disabled={task.state === "completed"} onClick={() => completeCare(task.id)} aria-label={`${task.state === "completed" ? "ทำเสร็จแล้ว" : "ทำเครื่องหมายเสร็จ"} ${task.label}`}>{task.state === "completed" ? <CheckCircle size={18} /> : "เสร็จ"}</button></li>;
            })}</ul> : <p className="hotel-detail-empty">งานดูแลจะเริ่มเมื่อรับน้องเข้าพักแล้ว</p>}
            <p className="hotel-detail-section__hint"><CheckCircle size={16} />รายการยาแสดงได้เฉพาะเมื่อมีคำแนะนำและการยืนยันจาก Intake ของการเข้าพักนี้</p>
          </section>

          <section className="hotel-detail-section hotel-detail-section--incidents" aria-labelledby="hotel-incidents-title">
            <header><h3 id="hotel-incidents-title">Incident / note ที่ต้องติดตาม</h3><CircleAlert size={20} /></header>
            <div className="hotel-incident-compose"><label className="hotel-detail-field"><span>บันทึกเหตุแบบสั้น</span><input value={incidentSummary} maxLength={200} placeholder="เช่น ชามน้ำหก ตรวจพื้นที่แล้ว" onInput={(event) => setIncidentSummary(event.currentTarget.value)} /></label><button className="button button--business-ghost" type="button" onClick={addIncident}>เพิ่มรายการ</button></div>
            {stay.incidentNotes.length > 0 ? <ul className="hotel-incident-list">{stay.incidentNotes.slice().reverse().map((incident) => <li key={incident.id} className={incident.resolvedAt ? "is-resolved" : ""}><span><strong>{incident.summary}</strong><small>{incident.resolvedAt ? `ปิดแล้วโดย ${incident.resolvedBy ?? "ทีมร้าน"}` : `ติดตามโดย ${incident.createdBy ?? "ทีมร้าน"}`}</small></span>{incident.resolvedAt ? <CheckCircle size={18} /> : <button type="button" onClick={() => resolveIncident(incident.id)}>ปิดรายการ</button>}</li>)}</ul> : <p className="hotel-detail-empty">ยังไม่มี incident / note ที่บันทึกไว้</p>}
            <p className="hotel-detail-section__hint"><CircleAlert size={16} />บันทึกเหตุและติดตามการดูแลร่วมกันภายในทีม</p>
          </section>

          <section className="hotel-detail-section" aria-labelledby="hotel-instructions-title">
            <header><h3 id="hotel-instructions-title">คำแนะนำและหมายเหตุ</h3></header>
            <div className="hotel-detail-instructions"><span>คำแนะนำที่ลูกค้ายืนยันให้ร้านใช้</span><p>{stay.guardianCareInstruction ?? "ไม่มีคำแนะนำจากลูกค้าที่อนุญาตให้ใช้กับการเข้าพักนี้"}</p></div>
            <label className="hotel-detail-field"><span>หมายเหตุของร้าน</span><textarea value={note} rows={3} maxLength={360} placeholder="ใช้ภายในทีมเท่านั้น" onInput={(event) => setNote(event.currentTarget.value)} /></label>
            <button className="button button--business-ghost" type="button" onClick={saveNote}><Save size={17} />บันทึกหมายเหตุ</button>
          </section>

          <section className="hotel-detail-section" aria-labelledby="hotel-addon-title">
            <header><h3 id="hotel-addon-title">บริการเพิ่มเติม</h3><button type="button" onClick={openAddServiceRequest}><Plus size={17} />ขออนุมัติ</button></header>
            {linkedGroomingJobs.length > 0 ? <ul className="hotel-linked-jobs">{linkedGroomingJobs.map((job) => <li key={job.serviceJobId}><span><Scissors size={17} /><strong>อาบน้ำ / ตัดขน</strong><small>{calendarDateLabel(job.scheduledStart.slice(0, 10), { day: "numeric", month: "short" })} · {job.scheduledStart.slice(11, 16)}</small></span><a href={`/business/grooming?jobId=${encodeURIComponent(job.serviceJobId)}`}>เปิดงาน</a></li>)}</ul> : <p className="hotel-detail-empty">ยังไม่มีงานบริการเพิ่มเติมที่เชื่อมกับน้องตัวนี้</p>}
            <p className="hotel-detail-section__hint"><MessageCircle size={16} />ร้านส่งคำขอเพิ่มบริการผ่าน Inbox ได้ แต่ไม่สามารถอนุมัติแทนเจ้าของได้</p>
          </section>

          <section className="hotel-detail-section" aria-labelledby="hotel-moves-title">
            <header><h3 id="hotel-moves-title">ประวัติย้ายห้อง</h3></header>
            {stay.roomMoveHistory.length > 0 ? <ol className="hotel-history-list">{stay.roomMoveHistory.slice().reverse().map((move) => {
              const from = rooms.find((room) => room.id === move.fromRoomId)?.label ?? "ยังไม่ระบุห้อง";
              const to = rooms.find((room) => room.id === move.toRoomId)?.label ?? "ห้องที่ย้ายไป";
              return <li key={move.id}><time>{move.movedAt.slice(0, 10)} · {move.movedAt.slice(11, 16)}</time><span><strong>{from} → {to}</strong><small>{move.reason ?? "ไม่มีเหตุผลระบุ"}</small></span></li>;
            })}</ol> : <p className="hotel-detail-empty">ยังไม่มีการย้ายห้องระหว่างการเข้าพัก</p>}
          </section>

          <section className="hotel-detail-section" aria-labelledby="hotel-history-title">
            <header><h3 id="hotel-history-title">กิจกรรมการเข้าพัก</h3></header>
            <ol className="hotel-history-list">{stay.history.slice(-6).reverse().map((item) => <li key={item.id}><time>{item.at.slice(0, 10)} · {item.at.slice(11, 16)}</time><span>{item.summary}</span></li>)}</ol>
          </section>
        </div>
      </aside>

      {requestOpen ? <AddServiceRequestDialog conversationId={requestOpen.conversationId} businessId={context.businessId} booking={{ bookingId: requestOpen.bookingId, serviceLabel: requestOpen.serviceLabel }} onClose={() => setRequestOpen(null)} onCreated={() => { setRequestOpen(null); publish({ ok: true, notice: "ส่งคำขอเพิ่มบริการแล้ว · รอลูกค้าตอบ" }); }} /> : null}
    </>
  );
}
