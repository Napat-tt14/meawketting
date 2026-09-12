"use client";

import { businessToday } from "../../_backend/shared/businessClock";

import { type FormEvent, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  cancelDurableBooking,
  checkDurableBookingAvailability,
  createBookingIdempotencyKey,
  createDurableBooking,
  updateDurableBooking,
} from "../../_backend/be3/client";
import type {
  BookingConflictRecovery,
  DemoBookingResource,
  DemoBookingService,
  DemoBusinessContext,
  PrototypeBooking,
  PrototypeBookingDraft,
  PrototypeCustomer,
} from "../../_prototype/businessState";
import {
  durableBookingAvailabilityInput,
  durableCreateBookingInputFromDraft,
  durableUpdateBookingInputFromDraft,
  evaluatePrototypeBookingAvailability,
  getBookingResourceStaffMember,
  getBookingResources,
  getBookingServices,
  getDemoBookingContacts,
  projectDurableBooking,
  projectDurableBookingAvailability,
  readPrototypeBooking,
  readPrototypeCustomer,
  synchronizePrototypeExecutionCompatibilityForBooking,
} from "../../_prototype/businessState";
import { CheckCircle, CircleAlert, MessageCircle, Plus, X } from "../../_components/icons";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import { CustomerEditor } from "../customers/CustomerEditor";
import { PetRelationshipEditor } from "../customers/PetRelationshipEditor";
import { AvailabilityStatus } from "./AvailabilityStatus";
import { BookingCustomerCombobox, BookingPetPicker } from "./BookingIdentityFields";
import { DaycareBookingFields } from "./DaycareBookingFields";
import { GroomingBookingFields } from "./GroomingBookingFields";
import { HotelBookingFields } from "./HotelBookingFields";
import { addCalendarDays, bookingEstimateLabel, calendarDateLabel } from "./calendarPresentation";
import { resourceSummary, withAppointmentStart } from "./bookingEditorUtils";
import { bookingDraftFromPrototype } from "./bookingMutation";

type BookingEditorStep = "details" | "review";
type RelationshipEditorState = { kind: "customer" } | { kind: "pet"; customer: PrototypeCustomer } | null;

function defaultAssignments(service: DemoBookingService, resources: readonly DemoBookingResource[]) {
  return service.requiredResourceKinds.flatMap((kind) => {
    const candidates = resources.filter((resource) => {
      if (resource.kind !== kind) return false;
      const staff = getBookingResourceStaffMember(resource.id);
      return !staff || (staff.active && (resource.kind !== "groomer" || staff.capabilities.includes("grooming")));
    });
    const selected = [...candidates].sort((first, second) => second.capacity - first.capacity || first.label.localeCompare(second.label, "th"))[0];
    return selected ? [selected.id] : [];
  });
}

function newDraft(
  context: DemoBusinessContext,
  service: DemoBookingService,
  selectedDate: string,
  preselectedCustomerId?: string | null,
  preselectedPetId?: string | null,
): PrototypeBookingDraft {
  const resources = getBookingResources(context, service.id);
  const selectedContact = preselectedCustomerId
    ? getDemoBookingContacts(context).find((contact) => contact.id === preselectedCustomerId) ?? null
    : null;
  const selectedPet = selectedContact && preselectedPetId
    ? selectedContact.pets.find((pet) => pet.id === preselectedPetId) ?? null
    : null;
  const draft: PrototypeBookingDraft = {
    businessId: context.businessId,
    branchId: context.branchId,
    serviceModule: service.module,
    serviceId: service.id,
    timeModel: service.timeModel,
    customer: selectedContact ? { id: selectedContact.id, name: selectedContact.name } : null,
    pets: selectedPet ? [{ ...selectedPet }] : [],
    start: service.timeModel === "appointment" ? `${selectedDate}T13:00` : selectedDate,
    end: service.timeModel === "date-range" ? addCalendarDays(selectedDate, 1) : "",
    assignedResourceIds: defaultAssignments(service, resources),
    notes: "",
    estimate: service.estimate,
    status: "pending",
  };
  return service.timeModel === "appointment" ? withAppointmentStart(draft, service, selectedDate, "13:00") : draft;
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
    return `${calendarDateLabel(draftDate(draft, businessToday(service)))} · ${start}${end ? `–${end}` : ""}`;
  }
  if (service.timeModel === "day") return `${calendarDateLabel(draft.start)} · เต็มวัน`;
  return `${calendarDateLabel(draft.start)} – ${calendarDateLabel(draft.end)}`;
}

export function BookingEditor({
  context,
  initialBooking,
  selectedDate,
  preselectedCustomerId = null,
  preselectedPetId = null,
  onClose,
  onSaved,
}: {
  context: DemoBusinessContext;
  initialBooking: PrototypeBooking | null;
  selectedDate: string;
  preselectedCustomerId?: string | null;
  preselectedPetId?: string | null;
  onClose: () => void;
  onSaved: (booking: PrototypeBooking, created: boolean) => void;
}) {
  const services = getBookingServices(context);
  const fallbackService = services[0] ?? null;
  const [draft, setDraft] = useState<PrototypeBookingDraft>(() => initialBooking ? bookingDraftFromPrototype(initialBooking) : fallbackService ? newDraft(context, fallbackService, selectedDate, preselectedCustomerId, preselectedPetId) : {
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
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [durableAvailability, setDurableAvailability] = useState<ReturnType<typeof evaluatePrototypeBookingAvailability> | null>(null);
  const [cancelConfirmation, setCancelConfirmation] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [relationshipEditor, setRelationshipEditor] = useState<RelationshipEditorState>(null);
  const [relationshipRevision, setRelationshipRevision] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const onCloseRef = useRef(onClose);
  const relationshipEditorOpenRef = useRef(false);
  const cancelConfirmationOpenRef = useRef(false);
  const cancelPanelRef = useRef<HTMLElement>(null);
  const cancelBackButtonRef = useRef<HTMLButtonElement>(null);
  const cancelReturnFocusRef = useRef<HTMLElement | null>(null);
  const createIdempotencyKeyRef = useRef<string | null>(null);

  const contextMatches = draft.businessId === context.businessId && draft.branchId === context.branchId;
  const service = services.find((item) => item.id === draft.serviceId) ?? null;
  const resources = service ? getBookingResources(context, service.id) : [];
  void relationshipRevision;
  const contacts = getDemoBookingContacts(context);
  const selectedContact = draft.customer ? contacts.find((contact) => contact.id === draft.customer?.id) ?? null : null;
  const previewAvailability = useMemo(() => evaluatePrototypeBookingAvailability(draft, context), [context, draft]);
  const availability = durableAvailability ?? previewAvailability;
  const availabilityId = "booking-availability";
  const showAutomaticAvailability = Boolean(contextMatches && service && draft.customer?.id && draft.pets.length > 0);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    relationshipEditorOpenRef.current = Boolean(relationshipEditor);
  }, [relationshipEditor]);

  useEffect(() => {
    cancelConfirmationOpenRef.current = cancelConfirmation;
  }, [cancelConfirmation]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || relationshipEditorOpenRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (relationshipEditorOpenRef.current) setRelationshipEditor(null);
        else if (cancelConfirmationOpenRef.current) {
          setCancelConfirmation(false);
          window.requestAnimationFrame(() => cancelReturnFocusRef.current?.focus());
        }
        else onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusScope = cancelConfirmationOpenRef.current ? cancelPanelRef.current : dialogRef.current;
      if (!focusScope) return;
      const focusable = [...focusScope.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.closest("[inert]") && element.getClientRects().length > 0 && element.tabIndex !== -1);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (!focusScope.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
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
      window.requestAnimationFrame(() => { if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus(); });
    };
  }, []);

  useEffect(() => {
    if (step !== "review") return;
    const frame = window.requestAnimationFrame(() => reviewHeadingRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  const installAutomaticAvailability = useEffectEvent((
    result: Awaited<ReturnType<typeof checkDurableBookingAvailability>>,
    checkedDraft: PrototypeBookingDraft,
  ) => {
    setDurableAvailability(projectDurableBookingAvailability(result, checkedDraft, context));
  });

  useEffect(() => {
    if (!contextMatches || !draft.serviceId || !draft.customer?.id || draft.pets.length === 0) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void checkDurableBookingAvailability(durableBookingAvailabilityInput(draft))
        .then((result) => {
          if (!cancelled) installAutomaticAvailability(result, draft);
        })
        .catch(() => {
          // The immediate compatibility preview remains visible. Review and
          // save still require an authoritative BE3 response.
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [contextMatches, draft]);

  function updateDraft(next: PrototypeBookingDraft) {
    setDraft(next);
    setDurableAvailability(null);
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

  function beginPetCreation() {
    if (!selectedContact) return;
    const customer = readPrototypeCustomer(selectedContact.id);
    if (customer) setRelationshipEditor({ kind: "pet", customer });
  }

  function customerCreated(customer: PrototypeCustomer) {
    setRelationshipRevision((current) => current + 1);
    updateDraft({ ...draft, customer: { id: customer.id, name: customer.name }, pets: [] });
    setRelationshipEditor({ kind: "pet", customer });
    setNotice(`เพิ่ม ${customer.name} แล้ว · เพิ่มสัตว์เลี้ยงเพื่อจบข้อมูลการจอง`);
  }

  function petCreated(customer: PrototypeCustomer, pet: PrototypeCustomer["pets"][number]) {
    setRelationshipRevision((current) => current + 1);
    updateDraft({
      ...draft,
      customer: { id: customer.id, name: customer.name },
      pets: [{ id: pet.id, name: pet.name, species: pet.species }],
    });
    setRelationshipEditor(null);
    setNotice(`เพิ่ม ${pet.name} และเลือกให้การจองนี้แล้ว`);
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

  async function showReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDidCheck(true);
    if (!previewAvailability.available) {
      setNotice("ข้อมูลยังไม่พร้อมยืนยัน โปรดแก้รายการที่แจ้งไว้ด้านล่าง");
      window.requestAnimationFrame(() => document.getElementById(availabilityId)?.focus());
      return;
    }
    setChecking(true);
    try {
      const checked = projectDurableBookingAvailability(
        await checkDurableBookingAvailability(durableBookingAvailabilityInput(draft)),
        draft,
        context,
      );
      setDurableAvailability(checked);
      if (!checked.available) {
        setNotice("ข้อมูลเปลี่ยนระหว่างตรวจสอบ โปรดแก้รายการที่แจ้งไว้ด้านล่าง");
        window.requestAnimationFrame(() => document.getElementById(availabilityId)?.focus());
        return;
      }
      setNotice(null);
      setStep("review");
    } catch {
      setNotice("ตรวจเวลาว่างจากระบบไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setChecking(false);
    }
  }

  async function saveBooking() {
    setSaving(true);
    try {
      const current = draft.bookingId ? readPrototypeBooking(draft.bookingId) : null;
      const result = draft.bookingId
        ? await updateDurableBooking(durableUpdateBookingInputFromDraft(draft, current?.revision ?? initialBooking?.revision ?? 1))
        : await createDurableBooking(durableCreateBookingInputFromDraft(
          draft,
          createIdempotencyKeyRef.current ??= createBookingIdempotencyKey(),
        ));
      if (result.outcome === "conflict") {
        setDurableAvailability(projectDurableBookingAvailability(result.availability, draft, context));
        setStep("details");
        setDidCheck(true);
        setNotice(result.availability.conflicts.some((item) => item.code === "DUPLICATE_BOOKING")
          ? "มีรายการนี้อยู่แล้ว จึงไม่ได้สร้างการจองซ้ำ"
          : "ข้อมูลเปลี่ยนระหว่างตรวจทาน โปรดตรวจเวลาว่างอีกครั้ง");
        return;
      }
      const booking = projectDurableBooking(result.booking);
      synchronizePrototypeExecutionCompatibilityForBooking(booking);
      onSaved(booking, !initialBooking);
    } catch {
      setStep("details");
      setDidCheck(true);
      setNotice("บันทึกการจองกับระบบไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function cancelBooking() {
    if (!initialBooking) return;
    setSaving(true);
    try {
      const current = readPrototypeBooking(initialBooking.bookingId) ?? initialBooking;
      const result = await cancelDurableBooking({
        businessId: context.businessId,
        branchId: context.branchId,
        bookingId: initialBooking.bookingId,
        expectedRevision: current.revision ?? 1,
      });
      if (result.outcome === "conflict") {
        setNotice("ข้อมูลการจองเปลี่ยนแล้ว โปรดกลับไปเปิดรายการอีกครั้ง");
        return;
      }
      const booking = projectDurableBooking(result.booking);
      synchronizePrototypeExecutionCompatibilityForBooking(booking);
      onSaved(booking, false);
    } catch {
      setNotice("ไม่สามารถยกเลิกจากบริบทสาขาปัจจุบันได้");
    } finally {
      setSaving(false);
    }
  }

  function requestCancellation() {
    cancelReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setNotice(null);
    setCancelConfirmation(true);
    window.requestAnimationFrame(() => cancelBackButtonRef.current?.focus());
  }

  function dismissCancellation() {
    setCancelConfirmation(false);
    window.requestAnimationFrame(() => cancelReturnFocusRef.current?.focus());
  }

  const existingCancelled = initialBooking?.status === "cancelled";
  const selectedResources = resourceSummary(resources, draft.assignedResourceIds);

  return (
    <>
      <button className="booking-editor__backdrop" type="button" tabIndex={-1} inert={relationshipEditor ? true : undefined} aria-label={cancelConfirmation ? "กลับไปดูข้อมูลการจอง" : "ปิดการแก้ไขการจอง"} onClick={cancelConfirmation ? dismissCancellation : onClose} />
      <section className={`booking-editor${relationshipEditor ? " booking-editor--relationship" : ""}${cancelConfirmation ? " booking-editor--confirming" : ""}`} ref={dialogRef} role={cancelConfirmation ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={cancelConfirmation ? "booking-cancel-title" : "booking-editor-title"} aria-describedby={cancelConfirmation ? "booking-cancel-description" : undefined}>
        <header className="booking-editor__header" inert={cancelConfirmation ? true : undefined}>
          <h2 id="booking-editor-title">{initialBooking ? "แก้ไขการจอง" : "เพิ่มการจอง"}</h2>
          <div className="booking-editor__header-actions">
            {initialBooking?.serviceModule === "grooming" ? <a href={`/business/grooming?jobId=${encodeURIComponent(initialBooking.bookingId)}`}><BusinessServiceIcon module="grooming" size={18} />ดูงานบริการ</a> : null}
            {initialBooking ? <a href={`/business/inbox?customerId=${encodeURIComponent(initialBooking.customer.id)}&petId=${encodeURIComponent(initialBooking.pets[0]?.id ?? "")}&bookingId=${encodeURIComponent(initialBooking.bookingId)}`}><MessageCircle size={18} />ส่งข้อความ</a> : null}
            <button ref={closeButtonRef} type="button" aria-label="ปิดการแก้ไขการจอง" onClick={onClose}><X size={20} /></button>
          </div>
        </header>

        <div className="booking-editor__body" inert={relationshipEditor || cancelConfirmation ? true : undefined}>
          {existingCancelled ? (
            <div className="booking-editor__cancelled-state">
              <CircleAlert size={24} />
              <div><strong>การจองนี้ยกเลิกแล้ว</strong><p>วัน เวลา และพื้นที่กลับมาใช้งานได้ ส่วนประวัติยังถูกเก็บไว้</p></div>
            </div>
          ) : step === "details" ? (
            <form className="booking-editor__form" onSubmit={showReview} aria-describedby={availabilityId}>
            {!contextMatches ? (
              <section className="booking-branch-blocker" role="alert">
                <CircleAlert size={20} />
                <div>
                  <strong>สาขาที่กำลังใช้งานเปลี่ยนแล้ว</strong>
                  <p>เราเก็บลูกค้า สัตว์เลี้ยง วันที่ และหมายเหตุไว้ให้ แต่บริการกับตัวเลือกเดิมต้องตรวจใหม่กับสาขาปัจจุบัน</p>
                  <button type="button" onClick={resetToCurrentBranch}>เลือกบริการของสาขานี้</button>
                </div>
              </section>
            ) : null}

            <section className="booking-fields booking-fields--service" aria-label="บริการ">
              <fieldset className="booking-service-selector">
                <legend>บริการ</legend>
                <div>
                  {services.map((item, index) => (
                    <button
                      id={draft.serviceId === item.id || (!service && index === 0) ? "booking-service" : undefined}
                      className={`booking-service-option booking-service-option--${item.module}`}
                      key={item.id}
                      type="button"
                      aria-pressed={draft.serviceId === item.id}
                      onClick={() => chooseService(item.id)}
                    >
                      <BusinessServiceIcon module={item.module} size={20} />
                      <span><strong>{item.label}</strong><small>{item.timeModel === "appointment" ? "นัดตามเวลา" : item.timeModel === "date-range" ? "ช่วงวันที่" : "เต็มวัน"}</small></span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </section>
            <section className="booking-fields booking-fields--relationships" aria-label="ลูกค้าและสัตว์เลี้ยง">
              <div className="booking-form-grid booking-relationship-fields">
                <div className="booking-field-with-action">
                  <BookingCustomerCombobox
                    key={draft.customer?.id ?? "unselected-customer"}
                    contacts={contacts}
                    selectedId={draft.customer?.id ?? null}
                    describedBy={availabilityId}
                    onChange={chooseContact}
                  />
                  <button type="button" onClick={() => setRelationshipEditor({ kind: "customer" })}><Plus size={16} />เพิ่มลูกค้าใหม่</button>
                </div>
                <div className="booking-field-with-action">
                  <BookingPetPicker
                    contact={selectedContact}
                    selectedPetId={draft.pets[0]?.id ?? null}
                    describedBy={availabilityId}
                    onChange={choosePet}
                  />
                  {selectedContact ? <button type="button" onClick={beginPetCreation}><Plus size={16} />เพิ่มสัตว์เลี้ยง</button> : null}
                </div>
              </div>
            </section>

            {service?.timeModel === "appointment" ? <GroomingBookingFields draft={draft} service={service} resources={resources} describedBy={availabilityId} onDraftChange={updateDraft} /> : null}
            {service?.timeModel === "date-range" ? <HotelBookingFields draft={draft} service={service} resources={resources} describedBy={availabilityId} onDraftChange={updateDraft} /> : null}
            {service?.timeModel === "day" ? <DaycareBookingFields draft={draft} service={service} resources={resources} describedBy={availabilityId} onDraftChange={updateDraft} /> : null}

            <section className="booking-fields booking-fields--notes" aria-label="ราคาและหมายเหตุ">
              <div className="booking-form-grid booking-financial-fields">
                <label className="booking-field booking-estimate-field">
                  <span>ราคาโดยประมาณ</span>
                  <input type="number" min="0" step="1" inputMode="numeric" value={draft.estimate ?? ""} onInput={(event) => updateDraft({ ...draft, estimate: event.currentTarget.value === "" ? null : Number(event.currentTarget.value) })} aria-describedby={availabilityId} />
                </label>
                <label className="booking-field booking-notes-field">
                  <span>หมายเหตุของร้าน</span>
                  <textarea value={draft.notes} onInput={(event) => updateDraft({ ...draft, notes: event.currentTarget.value })} aria-describedby={availabilityId} placeholder="เช่น สิ่งที่ต้องเตรียม หรือข้อมูลที่ช่วยวางแผน" rows={3} />
                </label>
              </div>
            </section>

            {notice ? <p className="booking-editor__notice" role="status">{notice}</p> : null}
            <AvailabilityStatus result={availability} id={availabilityId} show={showAutomaticAvailability || didCheck || !contextMatches} automatic={showAutomaticAvailability} onRecovery={handleRecovery} />
            <footer className="booking-editor__actions">
              {initialBooking ? <button className="button button--business-ghost booking-editor__cancel-action" type="button" onClick={requestCancellation}>ยกเลิกการจอง</button> : <span />}
              <button className="button button--business business-signature-sweep" type="submit" disabled={checking} aria-busy={checking}><CheckCircle size={18} /><span>{checking ? "กำลังตรวจสอบ" : "ทบทวนการจอง"}</span></button>
            </footer>
            </form>
          ) : (
            <section className="booking-review" aria-labelledby="booking-review-title">
            <div className="booking-review__heading">
              <h3 id="booking-review-title" ref={reviewHeadingRef} tabIndex={-1}>ตรวจทานการจอง</h3>
            </div>
            <dl>
              <div><dt>บริการ</dt><dd>{service?.label ?? "ยังไม่ได้เลือก"}</dd></div>
              <div><dt>ลูกค้า</dt><dd>{draft.customer?.name ?? "ยังไม่ได้เลือก"}</dd></div>
              <div><dt>สัตว์เลี้ยง</dt><dd>{draft.pets.map((pet) => pet.name).join(", ") || "ยังไม่ได้เลือก"}</dd></div>
              {service ? <div><dt>วันและเวลา</dt><dd>{reviewTimeLabel(draft, service)}</dd></div> : null}
              <div><dt>ตัวเลือกที่ใช้</dt><dd>{selectedResources.join(" · ") || "ยังไม่ได้เลือก"}</dd></div>
              <div><dt>ราคาประมาณ</dt><dd>{bookingEstimateLabel(draft.estimate)}</dd></div>
              {draft.notes ? <div><dt>หมายเหตุ</dt><dd>{draft.notes}</dd></div> : null}
            </dl>
            <AvailabilityStatus result={availability} id={availabilityId} show automatic onRecovery={handleRecovery} />
            <footer className="booking-editor__actions">
              <button className="button button--business-ghost" type="button" onClick={() => setStep("details")}>กลับไปแก้การจอง</button>
              <button className="button button--business" type="button" disabled={!availability.available || saving} aria-busy={saving} onClick={saveBooking}>
                <CheckCircle size={18} />{saving ? "กำลังบันทึก" : initialBooking ? "บันทึกการเปลี่ยนแปลง" : "ยืนยันการจอง"}
              </button>
            </footer>
            </section>
          )}

        </div>

        {cancelConfirmation ? (
          <section className="booking-cancel-confirmation" ref={cancelPanelRef}>
            <div><CircleAlert size={20} /><h3 id="booking-cancel-title">ยกเลิกการจองนี้หรือไม่</h3></div>
            <p id="booking-cancel-description">รายการจะยังอยู่ในประวัติ แต่จะไม่ใช้วัน เวลา หรือพื้นที่อีกต่อไป</p>
            {notice ? <p className="booking-editor__notice" role="alert">{notice}</p> : null}
            <div><button ref={cancelBackButtonRef} type="button" onClick={dismissCancellation}>กลับไปดูข้อมูล</button><button type="button" disabled={saving} aria-busy={saving} onClick={() => void cancelBooking()}>ยืนยันยกเลิกการจอง</button></div>
          </section>
        ) : null}

        {relationshipEditor ? (
          <section className="booking-editor__relationship-panel" aria-label={relationshipEditor.kind === "customer" ? "เพิ่มลูกค้าในรายการจอง" : "เพิ่มสัตว์เลี้ยงในรายการจอง"}>
            <div className="booking-editor__relationship-intro">
              <span>ข้อมูลที่ใช้กับการจองนี้</span>
              <strong>{relationshipEditor.kind === "customer" ? "เพิ่มลูกค้าใหม่" : `เพิ่มสัตว์เลี้ยงให้ ${relationshipEditor.customer.name}`}</strong>
              <p>กรอกข้อมูลแล้วกดบันทึก รายการจะถูกเลือกกลับไปในฟอร์มให้อัตโนมัติ</p>
            </div>
            {relationshipEditor.kind === "customer" ? (
              <CustomerEditor embedded context={context} customer={null} onClose={() => setRelationshipEditor(null)} onSaved={customerCreated} />
            ) : (
              <PetRelationshipEditor embedded customer={relationshipEditor.customer} onClose={() => setRelationshipEditor(null)} onSaved={petCreated} />
            )}
          </section>
        ) : null}
      </section>
    </>
  );
}
