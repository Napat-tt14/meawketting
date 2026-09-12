"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  evaluatePrototypeTeamMemberAvailability,
  getBookingResources,
  getBookingInterval,
  getBookingResourceStaffMember,
  readPrototypeBooking,
  readPrototypeCustomer,
  type DemoBusinessContext,
  type PrototypeServiceJob,
  type ServiceJobStatus,
} from "../../_prototype/businessState";
import {
  listPrototypeConversations,
  type PrototypeAddServiceRequestMessage,
} from "../../_prototype/inboxState";
import { ensureDurableConversation as ensurePrototypeConversation } from "../../_backend/be6/client";
import {
  CheckCircle,
  CircleAlert,
  Clock,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Scissors,
  UserRound,
  Wallet,
  X,
} from "../../_components/icons";
import { BusinessCustomerAvatar, BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";
import { AddServiceRequestDialog } from "../inbox/AddServiceRequestDialog";
import {
  GROOMING_WORKFLOW_STATUSES,
  groomingDurationLabel,
  groomingScheduleLabel,
  groomingStatusLabel,
  statusOptionsForGroomingJob,
} from "./groomingPresentation";

type DetailMutationResult = { ok: boolean; notice: string };

const REQUEST_STATUS_LABELS: Record<PrototypeAddServiceRequestMessage["requestStatus"], string> = {
  waiting: "รอลูกค้าตอบ",
  approved: "เจ้าของอนุมัติแล้ว",
  declined: "เจ้าของไม่อนุมัติ",
  cancelled: "ร้านยกเลิกคำขอแล้ว",
  expired: "คำขอหมดอายุ",
};

export function GroomingJobDetail({
  job,
  context,
  onClose,
  onTransition,
  onAssign,
  onSaveNote,
}: {
  job: PrototypeServiceJob;
  context: DemoBusinessContext;
  onClose: () => void;
  onTransition: (serviceJobId: string, status: ServiceJobStatus) => Promise<DetailMutationResult>;
  onAssign: (serviceJobId: string, assignments: readonly string[]) => Promise<DetailMutationResult>;
  onSaveNote: (serviceJobId: string, note: string) => Promise<DetailMutationResult>;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [note, setNote] = useState(job.businessNote);
  const [assignments, setAssignments] = useState<string[]>([...job.assignedResourceIds]);
  const [notice, setNotice] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState<{ conversationId: string; bookingId: string; serviceLabel: string } | null>(null);
  const onCloseRef = useRef(onClose);
  const requestOpenRef = useRef(false);
  const customer = readPrototypeCustomer(job.customerId);
  const pet = customer?.pets.find((item) => item.id === job.petId) ?? null;
  const booking = readPrototypeBooking(job.bookingId);
  const resources = getBookingResources(context, job.baseServiceId);
  const assignmentInterval = getBookingInterval("appointment", job.scheduledStart, job.scheduledEnd);
  const availableTransitions = statusOptionsForGroomingJob(job.status);
  const statusChoices = job.status === "cancelled"
    ? ["cancelled" as ServiceJobStatus]
    : [...GROOMING_WORKFLOW_STATUSES, ...(availableTransitions.includes("cancelled") ? ["cancelled" as ServiceJobStatus] : [])];
  const checkoutAvailable = job.status === "ready-for-pickup" || job.status === "completed";
  const addOnRequests = useMemo(() => listPrototypeConversations(context)
    .flatMap((conversation) => conversation.messages)
    .filter((message): message is PrototypeAddServiceRequestMessage => message.kind === "add-service-request")
    .filter((message) => message.serviceJobId === job.serviceJobId || (!message.serviceJobId && message.bookingId === job.bookingId)), [context, job.bookingId, job.serviceJobId]);

  const close = useCallback(() => onCloseRef.current(), []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled])")];
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

  function setResource(kind: "groomer" | "grooming-station" | "dryer", value: string) {
    const otherResourceIds = assignments.filter((id) => resources.find((resource) => resource.id === id)?.kind !== kind);
    setAssignments(value ? [...otherResourceIds, value] : otherResourceIds);
    setNotice(null);
  }

  function assignedForKind(kind: "groomer" | "grooming-station" | "dryer") {
    return resources.find((resource) => resource.kind === kind && assignments.includes(resource.id))?.id ?? "";
  }

  function resourceOptionState(resourceId: string) {
    const staff = getBookingResourceStaffMember(resourceId);
    if (!staff) return { enabled: true, suffix: "" };
    if (!staff.active) return { enabled: false, suffix: " · ปิดใช้งาน" };
    if (!staff.capabilities.includes("grooming")) return { enabled: false, suffix: " · รับงานนี้ไม่ได้" };
    const availability = assignmentInterval ? evaluatePrototypeTeamMemberAvailability(staff, assignmentInterval) : null;
    return availability?.available === false
      ? { enabled: false, suffix: " · ไม่พร้อมในเวลานี้" }
      : { enabled: true, suffix: "" };
  }

  async function changeStatus(nextStatus: ServiceJobStatus) {
    if (nextStatus === job.status || !availableTransitions.includes(nextStatus)) return;
    const result = await onTransition(job.serviceJobId, nextStatus);
    setNotice(result.notice);
  }

  async function saveAssignments() {
    const result = await onAssign(job.serviceJobId, assignments);
    setNotice(result.notice);
  }

  async function saveNote() {
    const result = await onSaveNote(job.serviceJobId, note);
    setNotice(result.notice);
  }

  async function openAddOnRequest() {
    if (!booking || !customer || !pet) {
      setNotice("งานนี้ยังไม่มีบริบทการจองที่พร้อมส่งคำขอเพิ่มบริการ");
      return;
    }
    const result = await ensurePrototypeConversation({
      businessId: context.businessId,
      branchId: context.branchId,
      customerId: customer.id,
      petId: pet.id,
      bookingId: booking.bookingId,
      serviceJobId: job.serviceJobId,
    });
    if (!result.ok) {
      setNotice("ยังเปิดบริบทข้อความสำหรับงานนี้ไม่ได้");
      return;
    }
    setRequestOpen({ conversationId: result.conversation.conversationId, bookingId: booking.bookingId, serviceLabel: booking.service.label });
  }

  if (!customer || !pet) return null;

  return (
    <>
      <button className="grooming-job-detail__backdrop" type="button" tabIndex={-1} aria-label="ปิดรายละเอียดงานอาบน้ำและตัดขน" onClick={close} />
      <aside ref={dialogRef} className="grooming-job-detail" role="dialog" aria-modal="true" aria-labelledby="grooming-job-detail-title">
        <header className="grooming-job-detail__header">
          <div className="grooming-job-detail__identity">
            <BusinessPetAvatar pet={pet} size="large" />
            <div>
              <small>งานอาบน้ำ / ตัดขน</small>
              <h2 ref={headingRef} id="grooming-job-detail-title" tabIndex={-1}>{pet.name}</h2>
              <span>{groomingStatusLabel(job.status)}</span>
            </div>
          </div>
          <button type="button" aria-label="ปิดรายละเอียดงาน" onClick={close}><X size={20} /></button>
        </header>

        <div className="grooming-job-detail__content">
          {notice ? <p className="grooming-job-detail__notice" role="status"><CircleAlert size={17} />{notice}</p> : null}

          <section className="grooming-detail-section grooming-detail-section--people" aria-labelledby="grooming-person-title">
            <header><h3 id="grooming-person-title">น้องและลูกค้า</h3></header>
            <div className="grooming-detail-person">
              <BusinessCustomerAvatar name={customer.name} />
              <span><strong>{customer.name}</strong><small>{customer.phone ?? "ยังไม่มีเบอร์โทร"}</small></span>
              {customer.phone ? <a aria-label={`โทร ${customer.name}`} href={`tel:${customer.phone.replace(/[^0-9+]/g, "")}`}><Phone size={18} /></a> : null}
            </div>
            <div className="grooming-detail-section__actions">
              <a href={`/business/customers/${encodeURIComponent(customer.id)}`}><UserRound size={17} />ดูลูกค้า</a>
              <a href={`/business/inbox?customerId=${encodeURIComponent(customer.id)}&petId=${encodeURIComponent(pet.id)}&bookingId=${encodeURIComponent(job.bookingId)}`}><MessageCircle size={17} />ส่งข้อความ</a>
            </div>
          </section>

          <section className="grooming-detail-section" aria-labelledby="grooming-service-title">
            <header><h3 id="grooming-service-title">บริการและเวลา</h3><Scissors size={20} /></header>
            <dl className="grooming-detail-facts">
              <div><dt>บริการหลัก</dt><dd>{booking?.service.label ?? "อาบน้ำ / ตัดขน"}</dd></div>
              <div><dt>นัดหมาย</dt><dd><Clock size={16} />{groomingScheduleLabel(job)}</dd></div>
              <div><dt>เวลาประเมิน</dt><dd>{groomingDurationLabel(job.estimatedDurationMinutes)}</dd></div>
              {job.actualStartedAt ? <div><dt>เริ่มจริง</dt><dd>{job.actualStartedAt.slice(11, 16)}</dd></div> : null}
              {job.actualCompletedAt ? <div><dt>เสร็จจริง</dt><dd>{job.actualCompletedAt.slice(11, 16)}</dd></div> : null}
            </dl>
          </section>

          <section className="grooming-detail-section" aria-labelledby="grooming-status-title">
            <header><h3 id="grooming-status-title">สถานะงาน</h3></header>
            <div className="grooming-status-options" role="group" aria-label="เปลี่ยนสถานะงาน">
              {statusChoices.map((status) => {
                const isCurrent = status === job.status;
                const isAvailable = isCurrent || availableTransitions.includes(status);
                return (
                  <button
                    key={status}
                    className={`grooming-status-option grooming-status-option--${status}${isCurrent ? " is-current" : ""}`}
                    type="button"
                    aria-pressed={isCurrent}
                    disabled={isCurrent || !isAvailable}
                    onClick={() => changeStatus(status)}
                  >
                    <span>{groomingStatusLabel(status)}</span>
                    {isCurrent ? <small>สถานะปัจจุบัน</small> : null}
                  </button>
                );
              })}
            </div>
            {checkoutAvailable ? <div className="grooming-detail-checkout"><span><Wallet size={17} /><strong>พร้อมตรวจยอด</strong><small>สถานะงานและการชำระเงินแยกกัน</small></span><a className="button button--business" href={`/business/billing?serviceJobId=${encodeURIComponent(job.serviceJobId)}`}><Wallet size={17} />ไปชำระเงิน</a></div> : null}
            {job.status === "completed" ? <p className="grooming-detail-section__hint grooming-detail-service-record"><CheckCircle size={16} />บันทึกประวัติบริการแล้ว · เปิดดูได้จากหน้าลูกค้าและสัตว์เลี้ยง</p> : null}
          </section>

          <section className="grooming-detail-section" aria-labelledby="grooming-resource-title">
            <header><h3 id="grooming-resource-title">ทีมและจุดบริการ</h3></header>
            <div className="grooming-resource-fields">
              {(["groomer", "grooming-station", "dryer"] as const).map((kind) => {
                const label = kind === "groomer" ? "ช่าง" : kind === "grooming-station" ? "จุดบริการ" : "เครื่องเป่า";
                return (
                  <label key={kind}>
                    <span>{label}</span>
                    <select value={assignedForKind(kind)} onChange={(event) => setResource(kind, event.currentTarget.value)}>
                      <option value="">ยังไม่ระบุ{label}</option>
                      {resources.filter((resource) => resource.kind === kind).map((resource) => {
                        const resourceState = resourceOptionState(resource.id);
                        return <option key={resource.id} value={resource.id} disabled={!resourceState.enabled}>{resource.label}{resourceState.suffix}</option>;
                      })}
                    </select>
                  </label>
                );
              })}
            </div>
            <button className="button button--business-ghost" type="button" onClick={saveAssignments}><Save size={17} />บันทึกการมอบหมาย</button>
            <p className="grooming-detail-section__hint"><CircleAlert size={16} />ช่างที่ปิดใช้งานหรือไม่พร้อมจะเลือกไม่ได้ และระบบตรวจอีกครั้งก่อนบันทึก</p>
          </section>

          <section className="grooming-detail-section" aria-labelledby="grooming-addon-title">
            <header><h3 id="grooming-addon-title">บริการเพิ่มเติม</h3><button type="button" onClick={openAddOnRequest}><Plus size={17} />ขออนุมัติ</button></header>
            {job.addOns.length > 0 ? <ul className="grooming-addon-list">{job.addOns.map((addOn) => <li key={addOn.id}><span><strong>{addOn.label}</strong><small>+{addOn.additionalMinutes} นาที</small></span><b>+{new Intl.NumberFormat("th-TH").format(addOn.additionalPrice)} บาท</b></li>)}</ul> : <p className="grooming-detail-empty">ยังไม่มีบริการเพิ่มเติมที่ได้รับอนุมัติ</p>}
            {addOnRequests.length > 0 ? <ul className="grooming-addon-requests">{addOnRequests.map((request) => <li key={request.messageId}><span><Clock size={16} />{request.serviceName}</span><strong>{REQUEST_STATUS_LABELS[request.requestStatus]}</strong></li>)}</ul> : null}
            <p className="grooming-detail-section__hint">ร้านส่งคำขอได้ แต่ไม่สามารถอนุมัติแทนเจ้าของได้</p>
          </section>

          <section className="grooming-detail-section" aria-labelledby="grooming-note-title">
            <header><h3 id="grooming-note-title">หมายเหตุของร้าน</h3></header>
            <textarea aria-labelledby="grooming-note-title" value={note} rows={3} maxLength={360} placeholder="ใช้ภายในทีมเท่านั้น" onInput={(event) => setNote(event.currentTarget.value)} />
            <div className="grooming-detail-section__actions"><button type="button" onClick={saveNote}><Save size={17} />บันทึกหมายเหตุ</button><a href={`/business/inbox?customerId=${encodeURIComponent(customer.id)}&petId=${encodeURIComponent(pet.id)}&bookingId=${encodeURIComponent(job.bookingId)}`}><MessageCircle size={17} />เปิดข้อความลูกค้า</a></div>
          </section>

          <section className="grooming-detail-section" aria-labelledby="grooming-history-title">
            <header><h3 id="grooming-history-title">ประวัติงาน</h3></header>
            <ol className="grooming-history-list">{job.history.slice(-5).reverse().map((item) => <li key={item.id}><time>{item.at.slice(11, 16)}</time><span>{item.summary}</span></li>)}</ol>
          </section>
        </div>
      </aside>

      {requestOpen ? (
        <AddServiceRequestDialog
          conversationId={requestOpen.conversationId}
          businessId={context.businessId}
          booking={{ bookingId: requestOpen.bookingId, serviceLabel: requestOpen.serviceLabel }}
          serviceJobId={job.serviceJobId}
          onClose={() => setRequestOpen(null)}
          onCreated={() => {
            setRequestOpen(null);
            setNotice("ส่งคำขอเพิ่มบริการแล้ว · รอลูกค้าตอบ");
          }}
        />
      ) : null}
    </>
  );
}
