import type { DragEvent, KeyboardEvent, PointerEvent } from "react";
import type { DemoBookingPet, DemoBookingResource, PrototypeServiceJob } from "../../_prototype/businessState";
import { CircleAlert, Clock, UserRound } from "../../_components/icons";
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
  onKeyDown,
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
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}) {
  const groomer = resources.find((resource) => resource.kind === "groomer" && job.assignedResourceIds.includes(resource.id)) ?? null;
  const attention = groomingAttention(job, Boolean(groomer), waitingApproval);

  return (
    <button
      type="button"
      className={`grooming-job-card grooming-job-card--${job.status}${dragging ? " is-dragging" : ""}${settled ? " is-settled" : ""}${attention ? ` has-attention is-${attention.tone}` : ""}`}
      draggable={draggable && job.status !== "cancelled"}
      data-service-job-id={job.serviceJobId}
      aria-label={`เปิดงาน ${pet.name} สถานะ ${groomingStatusLabel(job.status)}`}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
      title="ลากไปยังคอลัมน์ที่ต้องการ · กดลูกศรเพื่อย้ายสถานะ"
      onClick={() => onOpen(job)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      <header className="grooming-job-card__header">
        <div className="grooming-job-card__identity-row">
          <BusinessPetAvatar pet={pet} size="medium" />
          <div className="grooming-job-card__identity">
            <strong>{pet.name}</strong>
            <span><Clock size={14} /><time>{groomingScheduleLabel(job)}</time></span>
          </div>
        </div>
        <span className={`grooming-job-status grooming-job-status--${job.status}`}>{groomingStatusLabel(job.status)}</span>
      </header>
      <div className="grooming-job-card__facts">
        <span><UserRound size={16} />{groomer?.label ?? "ยังไม่ได้ระบุช่าง"}</span>
      </div>
      {attention ? <span className="grooming-job-card__attention"><CircleAlert size={14} />{attention.label}</span> : null}
    </button>
  );
}
