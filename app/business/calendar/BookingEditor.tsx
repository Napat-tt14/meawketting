"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  BookingConflictRecovery,
  DemoBookingResource,
  DemoBookingService,
  DemoBusinessContext,
  PrototypeBooking,
  PrototypeBookingDraft,
} from "../../_prototype/businessState";
import {
  BOOKING_DEMO_DATE,
  cancelPrototypeBooking,
  evaluatePrototypeBookingAvailability,
  getBookingResources,
  getBookingServices,
  getDemoBookingContacts,
  savePrototypeBooking,
} from "../../_prototype/businessState";
import { CheckCircle, CircleAlert, Save, X } from "../../_components/icons";
import { AvailabilityStatus } from "./AvailabilityStatus";
import { DaycareBookingFields } from "./DaycareBookingFields";
import { GroomingBookingFields } from "./GroomingBookingFields";
import { HotelBookingFields } from "./HotelBookingFields";
import { addCalendarDays, bookingEstimateLabel, calendarDateLabel } from "./calendarPresentation";
import { resourceSummary, withAppointmentStart } from "./bookingEditorUtils";

type BookingEditorStep = "details" | "review";

function defaultAssignments(service: DemoBookingService, resources: readonly DemoBookingResource[]) {
  return service.requiredResourceKinds.flatMap((kind) => {
    const candidates = resources.filter((resource) => resource.kind === kind);
    const selected = [...candidates].sort((first, second) => second.capacity - first.capacity || first.label.localeCompare(second.label, "th"))[0];
    return selected ? [selected.id] : [];
  });
}

function newDraft(context: DemoBusinessContext, service: DemoBookingService, selectedDate: string): PrototypeBookingDraft {
  const resources = getBookingResources(context, service.id);
  const draft: PrototypeBookingDraft = {
    businessId: context.businessId,
    branchId: context.branchId,
    serviceModule: service.module,
    serviceId: service.id,
    timeModel: service.timeModel,
    customer: null,
    pets: [],
    start: service.timeModel === "appointment" ? `${selectedDate}T13:00` : selectedDate,
    end: service.timeModel === "date-range" ? addCalendarDays(selectedDate, 1) : "",
    assignedResourceIds: defaultAssignments(service, resources),
    notes: "",
    estimate: service.estimate,
    status: "pending",
  };
  return service.timeModel === "appointment" ? withAppointmentStart(draft, service, selectedDate, "13:00") : draft;
}

function draftFromBooking(booking: PrototypeBooking): PrototypeBookingDraft {
  return {
    bookingId: booking.bookingId,
    businessId: booking.businessId,
    branchId: booking.branchId,
    serviceModule: booking.serviceModule,
    serviceId: booking.service.id,
    timeModel: booking.timeModel,
    customer: { ...booking.customer },
    pets: booking.pets.map((pet) => ({ ...pet })),
    start: booking.start,
    end: booking.end ?? "",
    assignedResourceIds: [...booking.assignedResources],
    notes: booking.notes,
    estimate: booking.estimate,
    status: booking.status,
  };
}

function draftDate(draft: PrototypeBookingDraft, fallback: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(draft.start) ? draft.start.slice(0, 10) : fallback;
}

function draftTime(draft: PrototypeBookingDraft) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(draft.start) ? draft.start.slice(11, 16) : "09:00";
}

function reviewTimeLabel(draft: PrototypeBookingDraft, service: DemoBookingService) {
  if (service.timeModel === "appointment") {
    const start = draft.start.slice(11, 16);
    const end = draft.end.slice(11, 16);
    return `${calendarDateLabel(draftDate(draft, BOOKING_DEMO_DATE))} · ${start}${end ? `–${end}` : ""}`;
  }
  if (service.timeModel === "day") return `${calendarDateLabel(draft.start)} · เต็มวัน`;
  return `${calendarDateLabel(draft.start)} – ${calendarDateLabel(draft.end)}`;
}

export function BookingEditor({
  context,
  initialBooking,
  selectedDate,
  onClose,
  onSaved,
}: {
  context: DemoBusinessContext;
  initialBooking: PrototypeBooking | null;
  selectedDate: string;
  onClose: () => void;
  onSaved: (booking: PrototypeBooking, created: boolean) => void;
}) {
  const services = getBookingServices(context);
  const fallbackService = services[0] ?? null;
  const [draft, setDraft] = useState<PrototypeBookingDraft>(() => initialBooking ? draftFromBooking(initialBooking) : fallbackService ? newDraft(context, fallbackService, selectedDate) : {
    businessId: context.businessId,
    branchId: context.branchId,
    serviceModule: null,
    serviceId: "",
    timeModel: null,
    customer: null,
    pets: [],
    start: selectedDate,
    end: "",
    assignedResourceIds: [],
    notes: "",
    estimate: null,
    status: "pending",
  });
  const [step, setStep] = useState<BookingEditorStep>("details");
  const [didCheck, setDidCheck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelConfirmation, setCancelConfirmation] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const onCloseRef = useRef(onClose);

  const contextMatches = draft.businessId === context.businessId && draft.branchId === context.branchId;
  const service = services.find((item) => item.id === draft.serviceId) ?? null;
  const resources = service ? getBookingResources(context, service.id) : [];
  const contacts = getDemoBookingContacts(context);
  const selectedContact = draft.customer ? contacts.find((contact) => contact.id === draft.customer?.id) ?? null : null;
  const availability = useMemo(() => evaluatePrototypeBookingAvailability(draft, context), [context, draft]);
  const availabilityId = "booking-availability";

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (cancelConfirmation) setCancelConfirmation(false);
        else onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    };
  }, [cancelConfirmation]);

  useEffect(() => {
    if (step !== "review") return;
    const frame = window.requestAnimationFrame(() => reviewHeadingRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  function updateDraft(next: PrototypeBookingDraft) {
    setDraft(next);
    setNotice(null);
  }

  function chooseService(serviceId: string) {
    const nextService = services.find((item) => item.id === serviceId);
    if (!nextService) return;
    const availableContacts = getDemoBookingContacts(context);
    const preservedContact = draft.customer && availableContacts.find((contact) => contact.id === draft.customer?.id) ? draft.customer : null;
    const preservedPets = preservedContact
      ? draft.pets.filter((pet) => availableContacts.find((contact) => contact.id === preservedContact.id)?.pets.some((candidate) => candidate.id === pet.id))
      : [];
    const nextDate = draftDate(draft, selectedDate);
    const nextResources = getBookingResources(context, nextService.id);
    const nextDraft: PrototypeBookingDraft = {
      ...draft,
      businessId: context.businessId,
      branchId: context.branchId,
      serviceModule: nextService.module,
      serviceId: nextService.id,
      timeModel: nextService.timeModel,
      customer: preservedContact,
      pets: preservedPets.slice(0, 1),
      start: nextService.timeModel === "appointment" ? `${nextDate}T${draftTime(draft)}` : nextDate,
      end: nextService.timeModel === "date-range" ? addCalendarDays(nextDate, 1) : "",
      assignedResourceIds: defaultAssignments(nextService, nextResources),
      estimate: nextService.estimate,
    };
    updateDraft(nextService.timeModel === "appointment"
      ? withAppointmentStart(nextDraft, nextService, nextDate, draftTime(draft))
      : nextDraft);
  }

  function resetToCurrentBranch() {
    if (fallbackService) chooseService(fallbackService.id);
  }

  function chooseContact(contactId: string) {
    const contact = contacts.find((item) => item.id === contactId) ?? null;
    updateDraft({
      ...draft,
      customer: contact ? { id: contact.id, name: contact.name } : null,
      pets: [],
    });
  }

  function choosePet(petId: string) {
    const pet = selectedContact?.pets.find((item) => item.id === petId) ?? null;
    updateDraft({ ...draft, pets: pet ? [{ ...pet }] : [] });
  }

  function handleRecovery(recovery: BookingConflictRecovery) {
    setStep("details");
    const targets: Record<BookingConflictRecovery, string> = {
      "change-time": "booking-start-time",
      "change-resource": "booking-primary-resource",
      "change-date": "booking-start-date",
      "return-to-edit": "booking-service",
    };
    window.requestAnimationFrame(() => document.getElementById(targets[recovery])?.focus());
  }

  function showReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDidCheck(true);
    if (!availability.available) {
      setNotice("ข้อมูลยังไม่พร้อมยืนยัน โปรดแก้รายการที่แจ้งไว้ด้านล่าง");
      window.requestAnimationFrame(() => document.getElementById(availabilityId)?.focus());
      return;
    }
    setNotice(null);
    setStep("review");
  }

  function saveBooking() {
    setSaving(true);
    const result = savePrototypeBooking(draft, context);
    setSaving(false);
    if (!result.ok) {
      setStep("details");
      setDidCheck(true);
      setNotice(result.reason === "duplicate" ? "มีรายการนี้อยู่แล้ว จึงไม่ได้สร้างการจองซ้ำ" : "ข้อมูลเปลี่ยนระหว่างตรวจทาน โปรดตรวจเวลาว่างอีกครั้ง");
      return;
    }
    onSaved(result.booking, result.created);
  }

  function cancelBooking() {
    if (!initialBooking) return;
    const result = cancelPrototypeBooking(initialBooking.bookingId, context);
    if (!result.ok) {
      setNotice("ไม่สามารถยกเลิกจากบริบทสาขาปัจจุบันได้");
      return;
    }
    onSaved(result.booking, false);
  }

  const existingCancelled = initialBooking?.status === "cancelled";
  const selectedResources = resourceSummary(resources, draft.assignedResourceIds);

  return (
    <>
      <button className="booking-editor__backdrop" type="button" tabIndex={-1} aria-label="ปิดการแก้ไขการจอง" onClick={onClose} />
      <section className="booking-editor" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="booking-editor-title">
        <header className="booking-editor__header">
          <div>
            <p>{initialBooking ? "แก้ไขข้อมูลตัวอย่าง" : "เพิ่มข้อมูลตัวอย่าง"}</p>
            <h2 id="booking-editor-title">{initialBooking ? "แก้ไขการจอง" : "เพิ่มการจอง"}</h2>
          </div>
          <button ref={closeButtonRef} type="button" aria-label="ปิดการแก้ไขการจอง" onClick={onClose}><X size={20} /></button>
        </header>

        {existingCancelled ? (
          <div className="booking-editor__cancelled-state">
            <CircleAlert size={24} />
            <div><strong>การจองนี้ยกเลิกแล้ว</strong><p>ระบบเก็บประวัติการยกเลิกไว้ในต้นแบบ และปล่อยวันเวลา/พื้นที่ให้ใช้งานต่อได้</p></div>
          </div>
        ) : step === "details" ? (
          <form className="booking-editor__form" onSubmit={showReview} aria-describedby={availabilityId}>
            {!contextMatches ? (
              <section className="booking-branch-blocker" role="alert">
                <CircleAlert size={20} />
                <div>
                  <strong>สาขาที่กำลังใช้งานเปลี่ยนแล้ว</strong>
                  <p>เราเก็บลูกค้า น้อง วันที่ และหมายเหตุไว้ให้ แต่บริการกับตัวเลือกเดิมต้องตรวจใหม่กับสาขาปัจจุบัน</p>
                  <button type="button" onClick={resetToCurrentBranch}>เลือกบริการของสาขานี้</button>
                </div>
              </section>
            ) : null}

            <section className="booking-fields booking-fields--shared" aria-labelledby="booking-shared-fields-title">
              <div className="booking-section-heading">
                <p>เริ่มจากข้อมูลหลัก</p>
                <h3 id="booking-shared-fields-title">บริการ ลูกค้า และน้อง</h3>
              </div>
              <label className="booking-field">
                <span>บริการ</span>
                <select id="booking-service" value={draft.serviceId} onChange={(event) => chooseService(event.target.value)} aria-describedby={availabilityId} required>
                  {!service && draft.serviceId ? <option value={draft.serviceId}>บริการของสาขาเดิม</option> : null}
                  {services.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                <small>แสดงเฉพาะบริการที่สาขานี้เปิดใช้</small>
              </label>
              <div className="booking-form-grid">
                <label className="booking-field">
                  <span>ลูกค้า (ข้อมูลตัวอย่าง)</span>
                  <select value={draft.customer?.id ?? ""} onChange={(event) => chooseContact(event.target.value)} aria-describedby={availabilityId} required>
                    <option value="">เลือกลูกค้า</option>
                    {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                  </select>
                </label>
                <label className="booking-field">
                  <span>น้องที่เข้ารับบริการ</span>
                  <select value={draft.pets[0]?.id ?? ""} onChange={(event) => choosePet(event.target.value)} aria-describedby={availabilityId} required disabled={!selectedContact}>
                    <option value="">เลือกน้อง</option>
                    {selectedContact?.pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
                  </select>
                  <small>ต้นแบบนี้เริ่มจากการจอง 1 ตัวต่อครั้ง</small>
                </label>
              </div>
            </section>

            {service?.timeModel === "appointment" ? <GroomingBookingFields draft={draft} service={service} resources={resources} describedBy={availabilityId} onDraftChange={updateDraft} /> : null}
            {service?.timeModel === "date-range" ? <HotelBookingFields draft={draft} service={service} resources={resources} describedBy={availabilityId} onDraftChange={updateDraft} /> : null}
            {service?.timeModel === "day" ? <DaycareBookingFields draft={draft} service={service} resources={resources} describedBy={availabilityId} onDraftChange={updateDraft} /> : null}

            <section className="booking-fields booking-fields--notes" aria-labelledby="booking-notes-title">
              <div className="booking-section-heading"><p>ข้อมูลเพิ่มเติม</p><h3 id="booking-notes-title">หมายเหตุและราคาประมาณ</h3></div>
              <div className="booking-form-grid">
                <label className="booking-field">
                  <span>ราคาประมาณ</span>
                  <input type="number" min="0" inputMode="decimal" value={draft.estimate ?? ""} onInput={(event) => updateDraft({ ...draft, estimate: event.currentTarget.value === "" ? null : Number(event.currentTarget.value) })} aria-describedby={availabilityId} />
                  <small>DEMO · ยังไม่มีนโยบายปรับราคา</small>
                </label>
                <label className="booking-field booking-field--wide">
                  <span>หมายเหตุ</span>
                  <textarea value={draft.notes} onInput={(event) => updateDraft({ ...draft, notes: event.currentTarget.value })} aria-describedby={availabilityId} placeholder="เช่น สิ่งที่ต้องเตรียม หรือข้อมูลที่ช่วยวางแผน" rows={3} />
                </label>
              </div>
            </section>

            {notice ? <p className="booking-editor__notice" role="status">{notice}</p> : null}
            <AvailabilityStatus result={availability} id={availabilityId} show={didCheck || !contextMatches} onRecovery={handleRecovery} />
            <footer className="booking-editor__actions">
              {initialBooking ? <button className="button button--business-ghost booking-editor__cancel-action" type="button" onClick={() => setCancelConfirmation(true)}>ยกเลิกการจอง</button> : <span />}
              <button className="button button--business" type="submit"><Save size={18} />ตรวจเวลาว่างและทบทวน</button>
            </footer>
          </form>
        ) : (
          <section className="booking-review" aria-labelledby="booking-review-title">
            <div className="booking-review__heading">
              <p>ตรวจทานก่อนยืนยัน</p>
              <h3 id="booking-review-title" ref={reviewHeadingRef} tabIndex={-1}>การจองนี้พร้อมบันทึกหรือไม่</h3>
            </div>
            <dl>
              <div><dt>บริการ</dt><dd>{service?.label ?? "ยังไม่ได้เลือก"}</dd></div>
              <div><dt>ลูกค้า</dt><dd>{draft.customer?.name ?? "ยังไม่ได้เลือก"}</dd></div>
              <div><dt>น้อง</dt><dd>{draft.pets.map((pet) => pet.name).join(", ") || "ยังไม่ได้เลือก"}</dd></div>
              {service ? <div><dt>วันและเวลา</dt><dd>{reviewTimeLabel(draft, service)}</dd></div> : null}
              <div><dt>ตัวเลือกที่ใช้</dt><dd>{selectedResources.join(" · ") || "ยังไม่ได้เลือก"}</dd></div>
              <div><dt>ราคาประมาณ</dt><dd>{bookingEstimateLabel(draft.estimate)}</dd></div>
              {draft.notes ? <div><dt>หมายเหตุ</dt><dd>{draft.notes}</dd></div> : null}
            </dl>
            <AvailabilityStatus result={availability} id={availabilityId} show onRecovery={handleRecovery} />
            <footer className="booking-editor__actions">
              <button className="button button--business-ghost" type="button" onClick={() => setStep("details")}>กลับไปแก้การจอง</button>
              <button className="button button--business" type="button" disabled={!availability.available || saving} aria-busy={saving} onClick={saveBooking}>
                <CheckCircle size={18} />{saving ? "กำลังบันทึก" : initialBooking ? "บันทึกการเปลี่ยนแปลง" : "ยืนยันการจอง"}
              </button>
            </footer>
          </section>
        )}

        {cancelConfirmation ? (
          <section className="booking-cancel-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="booking-cancel-title">
            <div><CircleAlert size={20} /><h3 id="booking-cancel-title">ยกเลิกการจองนี้หรือไม่</h3></div>
            <p>รายการจะไม่ถูกลบ แต่เปลี่ยนเป็นสถานะยกเลิกและไม่กินวัน เวลา หรือพื้นที่อีกต่อไป ต้นแบบนี้ยังไม่มีค่าธรรมเนียมหรือการชำระเงิน</p>
            <div><button type="button" onClick={() => setCancelConfirmation(false)}>กลับไปดูข้อมูล</button><button type="button" onClick={cancelBooking}>ยืนยันยกเลิกการจอง</button></div>
          </section>
        ) : null}
      </section>
    </>
  );
}
