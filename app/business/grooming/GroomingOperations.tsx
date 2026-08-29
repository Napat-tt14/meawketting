"use client";

import { type DragEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BOOKING_DEMO_DATE,
  assignPrototypeGroomingServiceJobResources,
  getBookingResources,
  getEnabledBusinessModules,
  listPrototypeGroomingServiceJobFixtures,
  listPrototypeGroomingServiceJobs,
  readPrototypeCustomer,
  readPrototypeCustomerFixture,
  serviceJobCanTransition,
  summarizeGroomingServiceJobs,
  transitionPrototypeGroomingServiceJob,
  type PrototypeServiceJob,
  type ServiceJobStatus,
  updatePrototypeGroomingServiceJobNote,
} from "../../_prototype/businessState";
import {
  listPrototypeConversationFixtures,
  listPrototypeConversations,
  type PrototypeAddServiceRequestMessage,
} from "../../_prototype/inboxState";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { useBusinessContext, useBusinessStateReady } from "../_components/useBusinessContext";
import { CalendarDays, CircleAlert, Clock, Plus, Scissors, Search, SlidersHorizontal } from "../../_components/icons";
import { GroomingJobCard } from "./GroomingJobCard";
import { GroomingJobDetail } from "./GroomingJobDetail";
import {
  GROOMING_BOARD_LANES,
  GROOMING_MOBILE_FILTERS,
  groomingBoardLaneForStatus,
  groomingStatusLabel,
  type GroomingBoardLane,
} from "./groomingPresentation";

type DragState = { jobId: string; input: "native" | "touch" } | null;
type DropTarget = { lane: GroomingBoardLane; valid: boolean } | null;
type AttentionFilter = "all" | "attention" | "unassigned" | "approval";

function statusForDestination(job: PrototypeServiceJob, lane: GroomingBoardLane): ServiceJobStatus | null {
  if (lane === "waiting") {
    if (job.status === "booked") return "checked-in";
    if (job.status === "checked-in") return "waiting";
    return null;
  }
  const destination: Record<Exclude<GroomingBoardLane, "waiting">, ServiceJobStatus> = {
    booked: "booked",
    "in-service": "in-service",
    "ready-for-pickup": "ready-for-pickup",
    completed: "completed",
  };
  const next = destination[lane];
  return serviceJobCanTransition(job.status, next) ? next : null;
}

function requestMatchesJob(request: PrototypeAddServiceRequestMessage, job: PrototypeServiceJob) {
  return request.serviceJobId === job.serviceJobId || (!request.serviceJobId && request.bookingId === job.bookingId);
}

export function GroomingOperations({ launchJobId = null }: { launchJobId?: string | null }) {
  const { context, revision } = useBusinessContext();
  const stateReady = useBusinessStateReady();
  const [date, setDate] = useState(BOOKING_DEMO_DATE);
  const [query, setQuery] = useState("");
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>("all");
  const [mobileFilter, setMobileFilter] = useState<"all" | GroomingBoardLane>("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(launchJobId);
  const [dragging, setDragging] = useState<DragState>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [settledJobId, setSettledJobId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const touchStartRef = useRef<{ jobId: string; x: number; y: number; dragging: boolean } | null>(null);
  const suppressOpenRef = useRef<string | null>(null);
  const settledTimerRef = useRef<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  void revision;

  useEffect(() => () => {
    if (settledTimerRef.current !== null) window.clearTimeout(settledTimerRef.current);
  }, []);

  const groomingEnabled = getEnabledBusinessModules(context).includes("grooming");
  const jobs = stateReady
    ? listPrototypeGroomingServiceJobs(context, { date, includeCancelled: false })
    : listPrototypeGroomingServiceJobFixtures(context, { date, includeCancelled: false });
  const conversations = stateReady ? listPrototypeConversations(context) : listPrototypeConversationFixtures(context);
  const requests = conversations.flatMap((conversation) => conversation.messages)
    .filter((message): message is PrototypeAddServiceRequestMessage => message.kind === "add-service-request");

  const jobItems = useMemo(() => jobs.flatMap((job) => {
    const customer = stateReady ? readPrototypeCustomer(job.customerId) : readPrototypeCustomerFixture(job.customerId);
    const pet = customer?.pets.find((item) => item.id === job.petId) ?? null;
    if (!customer || !pet) return [];
    const resources = getBookingResources(context, job.baseServiceId);
    const hasGroomer = resources.some((resource) => resource.kind === "groomer" && job.assignedResourceIds.includes(resource.id));
    const waitingApproval = requests.some((request) => request.requestStatus === "waiting" && requestMatchesJob(request, job));
    const queryText = `${pet.name} ${customer.name} อาบน้ำ ตัดขน ${resources.filter((resource) => job.assignedResourceIds.includes(resource.id)).map((resource) => resource.label).join(" ")}`.toLocaleLowerCase("th-TH");
    const normalizedQuery = query.trim().toLocaleLowerCase("th-TH");
    const matchesQuery = !normalizedQuery || queryText.includes(normalizedQuery);
    const late = job.status !== "completed" && job.status !== "cancelled" && job.scheduledEnd && job.scheduledEnd < "2026-08-18T12:20";
    const matchesAttention = attentionFilter === "all"
      || (attentionFilter === "attention" && (waitingApproval || !hasGroomer || late || job.status === "ready-for-pickup"))
      || (attentionFilter === "unassigned" && !hasGroomer)
      || (attentionFilter === "approval" && waitingApproval);
    return matchesQuery && matchesAttention ? [{ job, customer, pet, resources, waitingApproval }] : [];
  }), [attentionFilter, context, jobs, query, requests, stateReady]);

  const summary = summarizeGroomingServiceJobs(jobs, date);
  const selectedJob = jobs.find((job) => job.serviceJobId === selectedJobId || job.bookingId === selectedJobId) ?? null;

  function openJob(job: PrototypeServiceJob, source?: HTMLElement) {
    if (suppressOpenRef.current === job.serviceJobId) {
      suppressOpenRef.current = null;
      return;
    }
    openerRef.current = source ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setSelectedJobId(job.serviceJobId);
    setNotice(null);
  }

  function closeJob() {
    setSelectedJobId(null);
    window.requestAnimationFrame(() => openerRef.current?.focus());
  }

  function finishDrop(serviceJobId: string, lane: GroomingBoardLane) {
    const current = jobs.find((job) => job.serviceJobId === serviceJobId) ?? null;
    const next = current ? statusForDestination(current, lane) : null;
    setDropTarget(null);
    setDragging(null);
    if (!current || !next) {
      setNotice("ย้ายงานไม่ได้ตามลำดับสถานะ · งานกลับอยู่สถานะเดิมแล้ว");
      return { ok: false, notice: "ย้ายงานไม่ได้ตามลำดับสถานะ · งานกลับอยู่สถานะเดิมแล้ว" };
    }
    const result = transitionPrototypeGroomingServiceJob(serviceJobId, next, context);
    if (!result.ok) {
      const message = result.reason === "invalid-transition"
        ? "ย้ายงานไม่ได้ตามลำดับสถานะ · งานกลับอยู่สถานะเดิมแล้ว"
        : "เปลี่ยนสถานะงานไม่สำเร็จ ลองอีกครั้ง";
      setNotice(message);
      return { ok: false, notice: message };
    }
    const message = result.duplicate ? "สถานะนี้ถูกบันทึกไว้แล้ว" : `เปลี่ยนสถานะเป็น ${groomingStatusLabel(next)} แล้ว`;
    setNotice(message);
    setSettledJobId(serviceJobId);
    if (settledTimerRef.current !== null) window.clearTimeout(settledTimerRef.current);
    settledTimerRef.current = window.setTimeout(() => setSettledJobId(null), 320);
    return { ok: true, notice: message };
  }

  function transitionFromDetail(serviceJobId: string, nextStatus: ServiceJobStatus) {
    const current = jobs.find((job) => job.serviceJobId === serviceJobId) ?? null;
    if (nextStatus === "cancelled") {
      if (!current) return { ok: false, notice: "เปลี่ยนสถานะงานไม่สำเร็จ" };
      const result = transitionPrototypeGroomingServiceJob(serviceJobId, nextStatus, context);
      if (!result.ok) {
        const message = result.reason === "invalid-transition" ? "ยกเลิกงานไม่ได้ตามลำดับสถานะ" : "เปลี่ยนสถานะงานไม่สำเร็จ ลองอีกครั้ง";
        setNotice(message);
        return { ok: false, notice: message };
      }
      const message = "ยกเลิกงานบริการแล้ว";
      setNotice(message);
      setSettledJobId(serviceJobId);
      if (settledTimerRef.current !== null) window.clearTimeout(settledTimerRef.current);
      settledTimerRef.current = window.setTimeout(() => setSettledJobId(null), 320);
      return { ok: true, notice: message };
    }
    const lane = nextStatus === "checked-in" || nextStatus === "waiting" ? "waiting" : groomingBoardLaneForStatus(nextStatus);
    if (!current || !lane) return { ok: false, notice: "เปลี่ยนสถานะงานไม่สำเร็จ" };
    return finishDrop(serviceJobId, lane);
  }

  function assignResources(serviceJobId: string, assignments: readonly string[]) {
    const result = assignPrototypeGroomingServiceJobResources(serviceJobId, assignments, context);
    if (!result.ok) {
      const detail = result.availability?.conflicts.map((conflict) => conflict.message).join(" · ");
      const message = detail || "ทรัพยากรนี้ไม่พร้อมในช่วงเวลางาน";
      setNotice(message);
      return { ok: false, notice: message };
    }
    const message = "บันทึกช่างและทรัพยากรของงานแล้ว";
    setNotice(message);
    return { ok: true, notice: message };
  }

  function saveNote(serviceJobId: string, note: string) {
    const updated = updatePrototypeGroomingServiceJobNote(serviceJobId, note, context);
    const message = updated ? "บันทึกหมายเหตุของร้านแล้ว" : "บันทึกหมายเหตุไม่สำเร็จ ลองอีกครั้ง";
    setNotice(message);
    return { ok: Boolean(updated), notice: message };
  }

  function nativeDragStart(job: PrototypeServiceJob, event: DragEvent<HTMLElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", job.serviceJobId);
    setDragging({ jobId: job.serviceJobId, input: "native" });
    setNotice(null);
  }

  function previewDrop(lane: GroomingBoardLane, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const job = dragging ? jobs.find((item) => item.serviceJobId === dragging.jobId) ?? null : null;
    const valid = Boolean(job && statusForDestination(job, lane));
    event.dataTransfer.dropEffect = valid ? "move" : "none";
    setDropTarget({ lane, valid });
  }

  function nativeDrop(lane: GroomingBoardLane, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const serviceJobId = dragging?.jobId ?? event.dataTransfer.getData("text/plain");
    if (serviceJobId) finishDrop(serviceJobId, lane);
  }

  function pointerDown(job: PrototypeServiceJob, event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" || job.status === "completed" || job.status === "cancelled") return;
    touchStartRef.current = { jobId: job.serviceJobId, x: event.clientX, y: event.clientY, dragging: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLElement>) {
    const touch = touchStartRef.current;
    if (!touch) return;
    const distance = Math.hypot(event.clientX - touch.x, event.clientY - touch.y);
    if (!touch.dragging && distance < 8) return;
    touch.dragging = true;
    event.preventDefault();
    setDragging({ jobId: touch.jobId, input: "touch" });
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-grooming-drop-lane]");
    const lane = target?.dataset.groomingDropLane as GroomingBoardLane | undefined;
    const job = jobs.find((item) => item.serviceJobId === touch.jobId) ?? null;
    setDropTarget(lane ? { lane, valid: Boolean(job && statusForDestination(job, lane)) } : null);
  }

  function pointerUp(event: PointerEvent<HTMLElement>) {
    const touch = touchStartRef.current;
    if (!touch) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    touchStartRef.current = null;
    if (!touch.dragging) return;
    event.preventDefault();
    suppressOpenRef.current = touch.jobId;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-grooming-drop-lane]");
    const lane = target?.dataset.groomingDropLane as GroomingBoardLane | undefined;
    if (lane) finishDrop(touch.jobId, lane);
    else {
      setDragging(null);
      setDropTarget(null);
      setNotice("วางงานนอกสถานะปลายทาง · งานกลับอยู่สถานะเดิมแล้ว");
    }
  }

  if (!groomingEnabled) {
    return (
      <div className="business-grooming shell business-grooming--blocked">
        <BusinessPageHeader title="อาบน้ำ / ตัดขน" />
        <section className="grooming-blocked" role="status">
          <CircleAlert size={34} />
          <div><h2>สาขานี้ยังไม่เปิดงานอาบน้ำ / ตัดขน</h2><p>เมนูนี้จะแสดงเมื่อสาขาปัจจุบันเปิดใช้งานบริการนี้</p></div>
          <Link className="button button--business" href="/business/home">กลับหน้าหลัก</Link>
        </section>
      </div>
    );
  }

  const mobileVisibleItems = mobileFilter === "all"
    ? jobItems
    : jobItems.filter(({ job }) => GROOMING_MOBILE_FILTERS.find((filter) => filter.key === mobileFilter)?.statuses?.includes(job.status));

  return (
    <div className={`business-grooming shell${dragging ? " is-dragging" : ""}`}>
      <BusinessPageHeader
        title="อาบน้ำ / ตัดขน"
        context={`${summary.total} งานในวันที่เลือก · ${summary.readyForPickup} พร้อมรับกลับ`}
        actions={<Link className="button button--business" href="/business/calendar?new=1"><Plus size={18} />เพิ่มการจอง</Link>}
      />

      <section className="grooming-toolbar" aria-label="เลือกวัน ค้นหา และกรองงานอาบน้ำตัดขน">
        <label className="grooming-toolbar__date"><span>วันที่</span><input type="date" value={date} onChange={(event) => setDate(event.currentTarget.value)} /></label>
        <button type="button" onClick={() => setDate(BOOKING_DEMO_DATE)}><CalendarDays size={17} />วันนี้</button>
        <label className="grooming-toolbar__search"><Search size={19} /><span className="sr-only">ค้นหางาน</span><input value={query} onInput={(event) => setQuery(event.currentTarget.value)} placeholder="ค้นหาน้อง ลูกค้า หรือช่าง" /></label>
        <label className="grooming-toolbar__filter"><SlidersHorizontal size={18} /><span className="sr-only">กรองงาน</span><select value={attentionFilter} onChange={(event) => setAttentionFilter(event.currentTarget.value as AttentionFilter)}><option value="all">ทุกงาน</option><option value="attention">ต้องดูแล</option><option value="unassigned">ยังไม่มีช่าง</option><option value="approval">รอลูกค้าตอบ</option></select></label>
      </section>

      {notice ? <p className="business-grooming__notice" role="status"><CircleAlert size={17} />{notice}</p> : null}

      {jobItems.length === 0 ? (
        <section className="grooming-empty-state" aria-labelledby="grooming-empty-title">
          <ScissorsPlaceholder />
          <div><h2 id="grooming-empty-title">วันนี้ยังไม่มีงานอาบน้ำ / ตัดขน</h2><p>เพิ่มการจองจาก Calendar เพื่อเริ่มงานบริการในบอร์ดนี้</p></div>
          <Link className="button button--business" href="/business/calendar?new=1"><Plus size={18} />เพิ่มการจอง</Link>
        </section>
      ) : (
        <>
          <details className="grooming-board-hint"><summary><Clock size={17} />วิธีจัดการบอร์ด</summary><p>เลื่อนเพื่อดูทุกสถานะ แล้วลากงานไปยังสถานะถัดไป หรือเปิดงานเพื่อเปลี่ยนสถานะด้วยปุ่ม</p></details>
          <div className="grooming-board-scroll" role="region" aria-label="บอร์ดงานอาบน้ำและตัดขน">
            <div className="grooming-board">
              {GROOMING_BOARD_LANES.map((lane) => {
                const laneItems = jobItems.filter(({ job }) => lane.statuses.includes(job.status));
                const highlight = dropTarget?.lane === lane.key ? (dropTarget.valid ? " is-drop-valid" : " is-drop-invalid") : "";
                return (
                  <section
                    key={lane.key}
                    className={`grooming-board-column grooming-board-column--${lane.key}${highlight}`}
                    data-grooming-drop-lane={lane.key}
                    aria-label={`${lane.label} ${laneItems.length} งาน`}
                    onDragOver={(event) => previewDrop(lane.key, event)}
                    onDragLeave={() => setDropTarget((current) => current?.lane === lane.key ? null : current)}
                    onDrop={(event) => nativeDrop(lane.key, event)}
                  >
                    <header><h2>{lane.label}</h2><span>{laneItems.length}</span></header>
                    <div className="grooming-board-column__cards">
                      {laneItems.map(({ job, pet, resources, waitingApproval }) => (
                        <GroomingJobCard
                          key={job.serviceJobId}
                          job={job}
                          pet={pet}
                          resources={resources}
                          waitingApproval={waitingApproval}
                          dragging={dragging?.jobId === job.serviceJobId}
                          settled={settledJobId === job.serviceJobId}
                          onOpen={(opened) => openJob(opened)}
                          onDragStart={(event) => nativeDragStart(job, event)}
                          onDragEnd={() => { setDragging(null); setDropTarget(null); }}
                          onPointerDown={(event) => pointerDown(job, event)}
                          onPointerMove={pointerMove}
                          onPointerUp={pointerUp}
                          onPointerCancel={() => { touchStartRef.current = null; setDragging(null); setDropTarget(null); }}
                        />
                      ))}
                      {laneItems.length === 0 ? <p className="grooming-board-column__empty">ยังไม่มีงาน</p> : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          <section className="grooming-mobile-list" aria-label="รายการงานอาบน้ำและตัดขนบนมือถือ">
            <div className="grooming-mobile-list__filters" role="tablist" aria-label="กรองสถานะงาน">
              {GROOMING_MOBILE_FILTERS.map((filter) => {
                const count = filter.key === "all" ? jobItems.length : jobItems.filter(({ job }) => filter.statuses?.includes(job.status)).length;
                return <button key={filter.key} type="button" role="tab" aria-selected={mobileFilter === filter.key} onClick={() => setMobileFilter(filter.key)}>{filter.label}<span>{count}</span></button>;
              })}
            </div>
            <div className="grooming-mobile-list__cards">
              {mobileVisibleItems.map(({ job, pet, resources, waitingApproval }) => <GroomingJobCard key={job.serviceJobId} job={job} pet={pet} resources={resources} waitingApproval={waitingApproval} draggable={false} settled={settledJobId === job.serviceJobId} onOpen={(opened) => openJob(opened)} />)}
              {mobileVisibleItems.length === 0 ? <p className="grooming-mobile-list__empty">ไม่มีงานในสถานะนี้</p> : null}
            </div>
          </section>
        </>
      )}

      {selectedJob ? <GroomingJobDetail key={`${selectedJob.serviceJobId}:${selectedJob.updatedAt}`} job={selectedJob} context={context} onClose={closeJob} onTransition={transitionFromDetail} onAssign={assignResources} onSaveNote={saveNote} /> : null}
    </div>
  );
}

function ScissorsPlaceholder() {
  return <span className="grooming-empty-state__icon" aria-hidden="true"><Scissors size={32} /></span>;
}
