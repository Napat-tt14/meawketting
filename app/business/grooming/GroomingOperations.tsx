"use client";

import { type DragEvent, type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { BusinessAlert } from "../_components/BusinessFeedback";
import { BusinessSidebarSectionHeader } from "../_components/BusinessNavigationPrimitives";
import { useBusinessContext, useBusinessStateReady } from "../_components/useBusinessContext";
import { CircleAlert, Plus, Scissors } from "../../_components/icons";
import { GroomingJobCard } from "./GroomingJobCard";
import { GroomingJobDetail } from "./GroomingJobDetail";
import {
  GROOMING_BOARD_LANES,
  groomingBoardLaneForStatus,
  groomingStatusLabel,
  type GroomingBoardLane,
} from "./groomingPresentation";

type DragState = { jobId: string; input: "native" | "touch" } | null;
type DropTarget = { lane: GroomingBoardLane; valid: boolean } | null;
type GroomingPointerState = {
  jobId: string;
  pointerId: number;
  x: number;
  y: number;
  source: HTMLElement;
  previousDraggable: string | null;
  dragging: boolean;
};

function statusForDestination(job: PrototypeServiceJob, lane: GroomingBoardLane): ServiceJobStatus | null {
  if (lane === "waiting") {
    if (job.status === "booked") return "checked-in";
    if (job.status === "checked-in") return "waiting";
    if (job.status === "waiting") return null;
    return serviceJobCanTransition(job.status, "waiting") ? "waiting" : null;
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
  const [selectedJobId, setSelectedJobId] = useState<string | null>(launchJobId);
  const [dragging, setDragging] = useState<DragState>(null);
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [settledJobId, setSettledJobId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const touchStartRef = useRef<GroomingPointerState | null>(null);
  const draggingJobIdRef = useRef<string | null>(null);
  const suppressOpenRef = useRef<string | null>(null);
  const settledTimerRef = useRef<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  void revision;

  useEffect(() => () => {
    if (settledTimerRef.current !== null) window.clearTimeout(settledTimerRef.current);
  }, []);

  const groomingEnabled = getEnabledBusinessModules(context, !stateReady).includes("grooming");
  const jobs = stateReady
    ? listPrototypeGroomingServiceJobs(context, { date: BOOKING_DEMO_DATE, includeCancelled: false })
    : listPrototypeGroomingServiceJobFixtures(context, { date: BOOKING_DEMO_DATE, includeCancelled: false });
  const conversations = stateReady ? listPrototypeConversations(context) : listPrototypeConversationFixtures(context);
  const requests = conversations.flatMap((conversation) => conversation.messages)
    .filter((message): message is PrototypeAddServiceRequestMessage => message.kind === "add-service-request");

  const jobItems = useMemo(() => jobs.flatMap((job) => {
    const customer = stateReady ? readPrototypeCustomer(job.customerId) : readPrototypeCustomerFixture(job.customerId);
    const pet = customer?.pets.find((item) => item.id === job.petId) ?? null;
    if (!customer || !pet) return [];
    const resources = getBookingResources(context, job.baseServiceId);
    const waitingApproval = requests.some((request) => request.requestStatus === "waiting" && requestMatchesJob(request, job));
    return [{ job, customer, pet, resources, waitingApproval }];
  }), [context, jobs, requests, stateReady]);

  const summary = summarizeGroomingServiceJobs(jobs, BOOKING_DEMO_DATE);
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
    draggingJobIdRef.current = null;
    setDropTarget(null);
    setDragging(null);
    setDragPointer(null);
    if (!current || !next) {
      setNotice("ย้ายงานไม่ได้ · งานกลับอยู่สถานะเดิมแล้ว");
      return { ok: false, notice: "ย้ายงานไม่ได้ · งานกลับอยู่สถานะเดิมแล้ว" };
    }
    const result = transitionPrototypeGroomingServiceJob(serviceJobId, next, context);
    if (!result.ok) {
      const message = result.reason === "invalid-transition"
        ? "ย้ายงานไม่ได้ · งานกลับอยู่สถานะเดิมแล้ว"
        : "เปลี่ยนสถานะงานไม่สำเร็จ ลองอีกครั้ง";
      setNotice(message);
      return { ok: false, notice: message };
    }
    const message = result.duplicate ? "สถานะนี้ถูกบันทึกไว้แล้ว" : `อัปเดตสถานะ: ${groomingStatusLabel(next)}`;
    setNotice(message);
    setSettledJobId(serviceJobId);
    if (settledTimerRef.current !== null) window.clearTimeout(settledTimerRef.current);
    settledTimerRef.current = window.setTimeout(() => setSettledJobId(null), 320);
    return { ok: true, notice: message };
  }

  function transitionFromDetail(serviceJobId: string, nextStatus: ServiceJobStatus) {
    const current = jobs.find((job) => job.serviceJobId === serviceJobId) ?? null;
    if (!current) return { ok: false, notice: "เปลี่ยนสถานะงานไม่สำเร็จ" };
    const result = transitionPrototypeGroomingServiceJob(serviceJobId, nextStatus, context);
    if (!result.ok) {
      const message = result.reason === "invalid-transition"
        ? "เปลี่ยนสถานะนี้ไม่ได้ · งานกลับอยู่สถานะเดิมแล้ว"
        : "เปลี่ยนสถานะงานไม่สำเร็จ ลองอีกครั้ง";
      setNotice(message);
      return { ok: false, notice: message };
    }
    const message = nextStatus === "cancelled"
      ? "ยกเลิกงานบริการแล้ว"
      : result.duplicate ? "สถานะนี้ถูกบันทึกไว้แล้ว" : `เปลี่ยนสถานะเป็น ${groomingStatusLabel(nextStatus)} แล้ว`;
    setNotice(message);
    setSettledJobId(serviceJobId);
    if (settledTimerRef.current !== null) window.clearTimeout(settledTimerRef.current);
    settledTimerRef.current = window.setTimeout(() => setSettledJobId(null), 320);
    return { ok: true, notice: message };
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
    draggingJobIdRef.current = job.serviceJobId;
    setDragging({ jobId: job.serviceJobId, input: "native" });
    setDragPointer(null);
    setNotice(null);
  }

  function previewDrop(lane: GroomingBoardLane, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const serviceJobId = draggingJobIdRef.current ?? dragging?.jobId;
    const job = serviceJobId ? jobs.find((item) => item.serviceJobId === serviceJobId) ?? null : null;
    const valid = Boolean(job && statusForDestination(job, lane));
    event.dataTransfer.dropEffect = valid ? "move" : "none";
    setDropTarget({ lane, valid });
  }

  function nativeDrop(lane: GroomingBoardLane, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const serviceJobId = draggingJobIdRef.current ?? dragging?.jobId ?? event.dataTransfer.getData("text/plain");
    if (serviceJobId) finishDrop(serviceJobId, lane);
  }

  function clearDrag() {
    const pointer = touchStartRef.current;
    if (pointer) {
      if (pointer.source.hasPointerCapture(pointer.pointerId)) pointer.source.releasePointerCapture(pointer.pointerId);
      if (pointer.previousDraggable === null) pointer.source.removeAttribute("draggable");
      else pointer.source.setAttribute("draggable", pointer.previousDraggable);
    }
    draggingJobIdRef.current = null;
    touchStartRef.current = null;
    setDragging(null);
    setDragPointer(null);
    setDropTarget(null);
  }

  function moveWithKeyboard(job: PrototypeServiceJob, event: KeyboardEvent<HTMLElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    if (job.status === "cancelled") return;
    const currentLane = groomingBoardLaneForStatus(job.status);
    const currentIndex = GROOMING_BOARD_LANES.findIndex((lane) => lane.key === currentLane);
    if (currentIndex < 0) return;
    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const destination = GROOMING_BOARD_LANES[currentIndex + direction];
    if (!destination || !statusForDestination(job, destination.key)) return;
    event.preventDefault();
    const result = finishDrop(job.serviceJobId, destination.key);
    if (result.ok) window.requestAnimationFrame(() => {
      const card = [...document.querySelectorAll<HTMLElement>("[data-service-job-id]")]
        .find((element) => element.dataset.serviceJobId === job.serviceJobId && element.getClientRects().length > 0);
      card?.focus({ preventScroll: true });
      card?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }

  function pointerDown(job: PrototypeServiceJob, event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || job.status === "cancelled") return;
    clearDrag();
    const source = event.currentTarget;
    touchStartRef.current = {
      jobId: job.serviceJobId,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      source,
      previousDraggable: source.getAttribute("draggable"),
      dragging: false,
    };
    setDragPointer(null);
    // Keep mouse, pen, and touch on one predictable pointer path so native
    // HTML drag cannot steal the stream before the board sees the drop lane.
    source.setAttribute("draggable", "false");
    source.setPointerCapture(event.pointerId);
  }

  function laneAtPoint(x: number, y: number) {
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-grooming-drop-lane], [data-segmented-value]");
    const candidate = target?.dataset.groomingDropLane ?? target?.dataset.segmentedValue;
    return GROOMING_BOARD_LANES.some((lane) => lane.key === candidate) ? candidate as GroomingBoardLane : undefined;
  }

  function pointerMove(event: PointerEvent<HTMLElement>) {
    const touch = touchStartRef.current;
    if (!touch || event.pointerId !== touch.pointerId) return;
    const distance = Math.hypot(event.clientX - touch.x, event.clientY - touch.y);
    if (!touch.dragging && distance < 8) return;
    touch.dragging = true;
    event.preventDefault();
    setDragging({ jobId: touch.jobId, input: "touch" });
    setDragPointer({ x: event.clientX, y: event.clientY });
    const lane = laneAtPoint(event.clientX, event.clientY);
    const job = jobs.find((item) => item.serviceJobId === touch.jobId) ?? null;
    setDropTarget(lane ? { lane, valid: Boolean(job && statusForDestination(job, lane)) } : null);
  }

  function pointerUp(event: PointerEvent<HTMLElement>) {
    const touch = touchStartRef.current;
    if (!touch || event.pointerId !== touch.pointerId) return;
    if (touch.source.hasPointerCapture(touch.pointerId)) touch.source.releasePointerCapture(touch.pointerId);
    if (touch.previousDraggable === null) touch.source.removeAttribute("draggable");
    else touch.source.setAttribute("draggable", touch.previousDraggable);
    touchStartRef.current = null;
    if (!touch.dragging) return;
    event.preventDefault();
    suppressOpenRef.current = touch.jobId;
    window.setTimeout(() => {
      if (suppressOpenRef.current === touch.jobId) suppressOpenRef.current = null;
    }, 0);
    const lane = laneAtPoint(event.clientX, event.clientY);
    if (lane) {
      finishDrop(touch.jobId, lane);
      return;
    }
    const deltaX = event.clientX - touch.x;
    const job = jobs.find((item) => item.serviceJobId === touch.jobId) ?? null;
    if (job && Math.abs(deltaX) >= 56) {
      const currentLane = groomingBoardLaneForStatus(job.status);
      const currentIndex = GROOMING_BOARD_LANES.findIndex((item) => item.key === currentLane);
      const direction = deltaX < 0 ? 1 : -1;
      const destination = GROOMING_BOARD_LANES[currentIndex + direction];
      if (destination && statusForDestination(job, destination.key)) {
        finishDrop(touch.jobId, destination.key);
        return;
      }
    }
    setDragging(null);
    setDragPointer(null);
    setDropTarget(null);
    draggingJobIdRef.current = null;
    setNotice("ยังย้ายงานไม่ได้ · ลากไปยังคอลัมน์ที่ต้องการ");
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

  return (
    <div className={`business-grooming shell${dragging ? " is-dragging" : ""}`}>
      <BusinessPageHeader
        title="อาบน้ำ / ตัดขน"
        context={`${summary.total} งาน · ${summary.readyForPickup} พร้อมรับกลับ`}
        actions={<Link className="button button--business business-signature-sweep" href="/business/calendar?new=1"><Plus size={18} /><span>เพิ่มการจอง</span></Link>}
      />

      {dragging && dragPointer ? (
        <div
          className="business-grooming__drag-preview"
          style={{ left: dragPointer.x + 14, top: dragPointer.y + 14 }}
          aria-hidden="true"
        >
          <span className="business-grooming__drag-preview-avatar"><Scissors size={18} /></span>
          <span className="business-grooming__drag-preview-copy">
            <strong>{jobItems.find(({ job }) => job.serviceJobId === dragging.jobId)?.pet.name ?? "น้อง"}</strong>
            <small>ลากไปยังสถานะที่ต้องการ</small>
          </span>
        </div>
      ) : null}

      {jobItems.length === 0 ? (
        <section className="grooming-empty-state" aria-labelledby="grooming-empty-title">
          <ScissorsPlaceholder />
          <div><h2 id="grooming-empty-title">วันนี้ยังไม่มีงานอาบน้ำ / ตัดขน</h2><p>เพิ่มการจองจาก Calendar เพื่อเริ่มงานบริการในบอร์ดนี้</p></div>
          <Link className="button button--business business-signature-sweep" href="/business/calendar?new=1"><Plus size={18} /><span>เพิ่มการจอง</span></Link>
        </section>
      ) : (
        <>
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
                    <div className="grooming-board-column__header">
                      <BusinessSidebarSectionHeader title={lane.label} />
                    </div>
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
                          onDragEnd={clearDrag}
                          onPointerDown={(event) => pointerDown(job, event)}
                          onPointerMove={pointerMove}
                          onPointerUp={pointerUp}
                          onPointerCancel={clearDrag}
                          onKeyDown={(event) => moveWithKeyboard(job, event)}
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
            {GROOMING_BOARD_LANES.map((lane) => {
              const laneItems = jobItems.filter(({ job }) => lane.statuses.includes(job.status));
              return (
                <section className="grooming-mobile-list__group" key={lane.key} aria-labelledby={`grooming-mobile-${lane.key}`}>
                  <header><strong id={`grooming-mobile-${lane.key}`}>{lane.label}</strong><span>{laneItems.length}</span></header>
                  <div className="grooming-mobile-list__cards">
                    {laneItems.map(({ job, pet, resources, waitingApproval }) => <GroomingJobCard key={job.serviceJobId} job={job} pet={pet} resources={resources} waitingApproval={waitingApproval} draggable={false} dragging={dragging?.jobId === job.serviceJobId} settled={settledJobId === job.serviceJobId} onOpen={(opened) => openJob(opened)} onPointerDown={(event) => pointerDown(job, event)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={clearDrag} onKeyDown={(event) => moveWithKeyboard(job, event)} />)}
                    {laneItems.length === 0 ? <p className="grooming-mobile-list__empty">ยังไม่มีงาน</p> : null}
                  </div>
                </section>
              );
            })}
          </section>
        </>
      )}

      {notice && !selectedJob ? <BusinessAlert title={notice} role="status" aria-live="polite" /> : null}
      {selectedJob ? <GroomingJobDetail key={selectedJob.serviceJobId} job={selectedJob} context={context} onClose={closeJob} onTransition={transitionFromDetail} onAssign={assignResources} onSaveNote={saveNote} /> : null}
    </div>
  );
}

function ScissorsPlaceholder() {
  return <span className="grooming-empty-state__icon" aria-hidden="true"><Scissors size={32} /></span>;
}
