import type { DragEvent, PointerEvent } from "react";
import type { DemoBookingPet, DemoBookingResource, PrototypeServiceJob } from "../../_prototype/businessState";
import { CircleAlert, Clock, Scissors, UserRound } from "../../_components/icons";
import { BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";
import { groomingAttention, groomingScheduleLabel, groomingStatusLabel } from "./groomingPresentation";

export function GroomingJobCard({
  job,
  pet,
  resources,
  waitingApproval,
  draggable = true,
  dragging = false,
  settled = false,
  onOpen,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  job: PrototypeServiceJob;
  pet: DemoBookingPet;
  resources: readonly DemoBookingResource[];
  waitingApproval: boolean;
  draggable?: boolean;
  dragging?: boolean;
  settled?: boolean;
  onOpen: (job: PrototypeServiceJob) => void;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel?: (event: PointerEvent<HTMLElement>) => void;
}) {
  const groomer = resources.find((resource) => resource.kind === "groomer" && job.assignedResourceIds.includes(resource.id)) ?? null;
  const attention = groomingAttention(job, Boolean(groomer), waitingApproval);

  return (
    <button
      type="button"
      className={`grooming-job-card${dragging ? " is-dragging" : ""}${settled ? " is-settled" : ""}${attention ? ` has-attention is-${attention.tone}` : ""}`}
      draggable={draggable && job.status !== "completed" && job.status !== "cancelled"}
      data-service-job-id={job.serviceJobId}
      aria-label={`เปิดงาน ${pet.name} สถานะ ${groomingStatusLabel(job.status)}`}
      onClick={() => onOpen(job)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <header className="grooming-job-card__header">
        <BusinessPetAvatar pet={pet} size="large" />
        <span className={`grooming-job-status grooming-job-status--${job.status}`}><Scissors size={15} />{groomingStatusLabel(job.status)}</span>
      </header>
      <div className="grooming-job-card__identity">
        <strong>{pet.name}</strong>
        <span>อาบน้ำ / ตัดขน</span>
      </div>
      <div className="grooming-job-card__facts">
        <span><Clock size={16} /><time>{groomingScheduleLabel(job)}</time></span>
        <span><UserRound size={16} />{groomer?.label ?? "ยังไม่ได้ระบุช่าง"}</span>
      </div>
      {attention ? <p className="grooming-job-card__attention"><CircleAlert size={16} />{attention.label}</p> : null}
    </button>
  );
}
