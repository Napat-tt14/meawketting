import {
  GROOMING_DEMO_NOW,
  SERVICE_JOB_STATUS_LABELS,
  type PrototypeServiceJob,
  type ServiceJobStatus,
} from "../../_prototype/businessState";

export type GroomingBoardLane = "booked" | "waiting" | "in-service" | "ready-for-pickup" | "completed";

export const GROOMING_BOARD_LANES: readonly { key: GroomingBoardLane; label: string; statuses: readonly ServiceJobStatus[] }[] = [
  { key: "booked", label: "รอรับเข้า", statuses: ["booked"] },
  { key: "waiting", label: "รอเริ่ม", statuses: ["checked-in", "waiting"] },
  { key: "in-service", label: "กำลังทำ", statuses: ["in-service"] },
  { key: "ready-for-pickup", label: "พร้อมรับกลับ", statuses: ["ready-for-pickup"] },
  { key: "completed", label: "เสร็จแล้ว", statuses: ["completed"] },
];

export const GROOMING_WORKFLOW_STATUSES: readonly ServiceJobStatus[] = [
  "booked",
  "checked-in",
  "waiting",
  "in-service",
  "ready-for-pickup",
  "completed",
];

export function groomingBoardLaneForStatus(status: ServiceJobStatus): GroomingBoardLane | null {
  return GROOMING_BOARD_LANES.find((lane) => lane.statuses.includes(status))?.key ?? null;
}

export function groomingStatusLabel(status: ServiceJobStatus) {
  return SERVICE_JOB_STATUS_LABELS[status];
}

export function groomingTimeLabel(value: string) {
  return value.includes("T") ? value.slice(11, 16) : value;
}

export function groomingScheduleLabel(job: Pick<PrototypeServiceJob, "scheduledStart" | "scheduledEnd">) {
  const start = groomingTimeLabel(job.scheduledStart);
  const end = job.scheduledEnd ? groomingTimeLabel(job.scheduledEnd) : null;
  return end ? `${start}–${end}` : start;
}

export function groomingDurationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${minutes} นาที`;
  return remainder ? `${hours} ชม. ${remainder} นาที` : `${hours} ชม.`;
}

export function groomingJobLateMinutes(job: Pick<PrototypeServiceJob, "status" | "scheduledEnd">, reference = GROOMING_DEMO_NOW) {
  if (!job.scheduledEnd || job.status === "completed" || job.status === "cancelled") return 0;
  const due = new Date(`${job.scheduledEnd}:00`).getTime();
  const current = new Date(`${reference}:00`).getTime();
  const minutes = Math.floor((current - due) / 60_000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

export function groomingAttention(job: PrototypeServiceJob, hasGroomer: boolean, waitingApproval: boolean) {
  if (waitingApproval) return { tone: "approval", label: "รอลูกค้าอนุมัติ" } as const;
  if (!hasGroomer && job.status !== "completed" && job.status !== "cancelled") return { tone: "assignment", label: "ยังไม่ได้ระบุช่าง" } as const;
  const lateMinutes = groomingJobLateMinutes(job);
  if (lateMinutes > 0) return { tone: "delay", label: `เกินเวลา ${lateMinutes} นาที` } as const;
  if (job.status === "ready-for-pickup") return { tone: "pickup", label: "รอลูกค้ารับกลับ" } as const;
  return null;
}

export function statusOptionsForGroomingJob(status: ServiceJobStatus) {
  if (status === "cancelled") return [];
  const reversibleStatuses = GROOMING_WORKFLOW_STATUSES.filter((candidate) => candidate !== status);
  return status === "completed" ? reversibleStatuses : [...reversibleStatuses, "cancelled" as const];
}
