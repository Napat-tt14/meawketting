import type { AuthorizedMutation, Database, PreparedStatement } from "../be1/repository";
import { be1Error } from "../be1/errors";
import type { DemoBookingResource } from "../../_prototype/businessState";
import { authorizationGuard, auditStatement, batch, deleteGuard, findReceipt, receiptStatement, type MutationReceipt } from "../shared/database";
import { conflict } from "../shared/errors";
import { opaqueId } from "../shared/validation";
import type { ExecutionView, ServiceRecordView, StaffView } from "./contracts";
import type { Be4Repository, ExecutionWrite } from "./repository";
import { decode, encode, type AssignmentRow, type EventRow, type ExecutionRow, type TaskRow } from "./codec";
import { executionId, projectBooking } from "./domain";
import type { BookingView } from "../be3/contracts";

const SELECT = `SELECT e.*, b.service_id, s.label AS service_label FROM service_executions e JOIN bookings b ON b.business_id=e.business_id AND b.branch_id=e.branch_id AND b.id=e.booking_id JOIN booking_services s ON s.business_id=b.business_id AND s.branch_id=b.branch_id AND s.id=b.service_id`;
const COLUMNS = "id,business_id,branch_id,booking_id,customer_id,pet_id,module,status,intake_id,scheduled_start,scheduled_end,business_note,details_json,revision,write_token,created_at,updated_at,cancelled_at";

function assignmentState(value: ExecutionView) {
  return value.kind === "grooming" ? [value.record.scheduledStart, value.record.scheduledEnd, [...value.record.assignedResourceIds].sort()]
    : value.kind === "hotel" ? value.record.roomAssignments
      : [value.record.attendanceDate, value.record.zoneId, value.record.responsibleStaffId];
}
function reserves(value: ExecutionView) { return value.kind === "grooming" ? value.record.status !== "cancelled" : value.kind === "hotel"
  ? !["checked-out", "completed", "cancelled", "no-show"].includes(value.record.status) : ["checked-in", "active", "ready-for-pickup"].includes(value.record.status); }
function eventIds(value: ExecutionView | null) {
  if (!value) return new Set<string>();
  return new Set([...value.record.history.map((h) => h.id), ...(value.kind === "grooming" ? value.record.addOns.map((a) => a.id)
    : value.kind === "daycare" ? value.record.careEvents.map((c) => c.id) : [...value.record.roomMoveHistory.map((m) => m.id), ...value.record.incidentNotes.flatMap((i) => i.resolvedAt ? [i.id, `${i.id}-resolved`] : [i.id])])]);
}

export class PostgresBe4Repository implements Be4Repository {
  constructor(readonly database: Database) {}

  /** Materialize Resource identities for explicit operational staff; no Person is inferred. */
  catalogStatements(businessId: string, branchId: string, now: string, actorId: string) {
    const db = this.database;
    return [
      db.prepare(`INSERT INTO booking_resources(id,business_id,branch_id,module,kind,label,capacity_mode,capacity,compatibility_staff_id,status,created_at,updated_at,created_by_person_id,updated_by_person_id)
        SELECT 'resource_'||replace(gen_random_uuid()::text,'-',''),s.business_id,a.branch_id,'grooming','groomer',s.name,'exclusive',1,s.id,'active',?,?,?,?
        FROM operation_staff s JOIN operation_staff_branches a ON a.business_id=s.business_id AND a.staff_id=s.id
        WHERE a.business_id=? AND a.branch_id=? AND s.status='active' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text((s.capabilities_json)::jsonb) WHERE value='grooming')
          AND NOT EXISTS(SELECT 1 FROM booking_resources r WHERE r.business_id=a.business_id AND r.branch_id=a.branch_id AND r.compatibility_staff_id=s.id)`)
        .bind(now, now, actorId, actorId, businessId, branchId),
      db.prepare(`INSERT INTO booking_resource_service_links(business_id,branch_id,resource_id,service_id,created_at,created_by_person_id)
        SELECT r.business_id,r.branch_id,r.id,s.id,?,? FROM booking_resources r JOIN booking_services s ON s.business_id=r.business_id AND s.branch_id=r.branch_id AND s.module='grooming'
        WHERE r.business_id=? AND r.branch_id=? AND r.compatibility_staff_id IS NOT NULL ON CONFLICT DO NOTHING
`).bind(now, actorId, businessId, branchId),
    ];
  }

  receipt(businessId: string, command: string, requestKey: string) { return findReceipt(this.database, businessId, command, requestKey); }

  async bookingStatements(booking: BookingView, context: AuthorizedMutation) {
    const existing = await this.forBooking(booking.businessId, booking.branchId, booking.id);
    return projectBooking(booking, existing, context.occurredAt).flatMap((write) => this.statements({ ...write, context, receipt: null }, opaqueId("projection")));
  }

  async saveStaff(before: StaffView | null, after: StaffView, context: AuthorizedMutation, branchId: string, receipt: MutationReceipt) {
    const db = this.database, token = opaqueId("staffwrite");
    const branchIds = [...new Set([...(before?.branchIds ?? []), ...after.branchIds])];
    const statements = branchIds.map((id, index) => authorizationGuard(db, context, id, `${token}-${index}`));
    statements.push(before
      ? db.prepare(`UPDATE operation_staff SET name=?,avatar_seed=?,display_role=?,capabilities_json=?,status=?,revision=?,updated_at=? WHERE business_id=? AND id=? AND revision=?`)
        .bind(after.name, after.avatarSeed, after.role, JSON.stringify(after.capabilities), after.active ? "active" : "inactive", after.revision, context.occurredAt, after.businessId, after.staffId, before.revision)
      : db.prepare(`INSERT INTO operation_staff(id,business_id,name,avatar_seed,display_role,capabilities_json,status,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
        .bind(after.staffId, after.businessId, after.name, after.avatarSeed, after.role, JSON.stringify(after.capabilities), after.active ? "active" : "inactive", after.revision, context.occurredAt, context.occurredAt));
    statements.push(db.prepare("INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,(:previous_row_count::integer=1)::integer").bind(token));
    statements.push(db.prepare("DELETE FROM operation_staff_branches WHERE business_id=? AND staff_id=?").bind(after.businessId, after.staffId));
    for (const id of after.branchIds) statements.push(db.prepare("INSERT INTO operation_staff_branches(business_id,branch_id,staff_id) VALUES(?,?,?)").bind(after.businessId, id, after.staffId));
    statements.push(db.prepare("DELETE FROM operation_staff_windows WHERE business_id=? AND staff_id=?").bind(after.businessId, after.staffId));
    for (const w of after.availability) statements.push(db.prepare("INSERT INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note) VALUES(?,?,?,?,?,?,?)")
      .bind(w.id, after.businessId, after.staffId, w.state, w.start, w.end, w.note));
    for (const id of after.branchIds) statements.push(...this.catalogStatements(after.businessId, id, context.occurredAt, context.actor.id));
    statements.push(receiptStatement(db, context, branchId, receipt), auditStatement(db, context, branchId, "staff.saved", "staff", after.staffId,
      before ? { revision: before.revision, active: before.active, branchIds: before.branchIds } : null,
      { revision: after.revision, active: after.active, branchIds: after.branchIds }), deleteGuard(db, token));
    branchIds.forEach((_, index) => statements.push(deleteGuard(db, `${token}-${index}`)));
    await batch(db, statements);
  }

  async correctRecord(before: ServiceRecordView, after: ServiceRecordView, context: AuthorizedMutation, receipt: MutationReceipt) {
    const db = this.database, token = opaqueId("correction"), correction = after.corrections.at(-1)!;
    await batch(db, [authorizationGuard(db, context, after.branchId, token),
      db.prepare("UPDATE service_records SET summary=?,business_note=?,revision=?,updated_at=? WHERE business_id=? AND branch_id=? AND id=? AND revision=?")
        .bind(after.summary, after.businessNote, after.revision, context.occurredAt, after.businessId, after.branchId, after.serviceRecordId, before.revision),
      db.prepare("INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,(:previous_row_count::integer=1)::integer").bind(`${token}-version`),
      db.prepare("INSERT INTO service_record_revisions(id,business_id,branch_id,record_id,kind,data_json,actor_person_id,occurred_at) VALUES(?,?,?,?,'correction',?,?,?)")
        .bind(correction.id, after.businessId, after.branchId, after.serviceRecordId, JSON.stringify(correction), context.actor.id, context.occurredAt),
      receiptStatement(db, context, after.branchId, receipt),
      auditStatement(db, context, after.branchId, "record.corrected", "service-record", after.serviceRecordId, { revision: before.revision }, { revision: after.revision, field: correction.field }),
      deleteGuard(db, `${token}-version`), deleteGuard(db, token),
    ]);
  }

  private async rows<T>(sql: string, ...values: unknown[]): Promise<T[]> {
    const result = await this.database.prepare(sql).bind(...values).all<T>();
    if (result.success === false) throw be1Error("PERSISTENCE_ERROR");
    return result.results ?? [];
  }
  async list(businessId: string, branchId: string, afterId: string, limit: number) {
    return this.hydrate(await this.rows<ExecutionRow>(`${SELECT} WHERE e.business_id=? AND e.branch_id=? AND e.id>? ORDER BY e.id LIMIT ?`, businessId, branchId, afterId, limit));
  }
  async get(businessId: string, branchId: string, id: string) {
    return (await this.hydrate(await this.rows<ExecutionRow>(`${SELECT} WHERE e.business_id=? AND e.branch_id=? AND e.id=?`, businessId, branchId, id)))[0] ?? null;
  }
  async forBooking(businessId: string, branchId: string, bookingId: string) {
    return this.hydrate(await this.rows<ExecutionRow>(`${SELECT} WHERE e.business_id=? AND e.branch_id=? AND e.booking_id=? ORDER BY e.id`, businessId, branchId, bookingId));
  }
  private async hydrate(rows: ExecutionRow[]) {
    if (!rows.length) return [];
    const businessId = rows[0].business_id, branchId = rows[0].branch_id;
    const keys = JSON.stringify(rows.map((r) => r.id));
    const scope = "business_id=? AND branch_id=? AND execution_id IN (SELECT value FROM jsonb_array_elements_text((?)::text::jsonb))";
    const [assignments, events, tasks] = await Promise.all([
      this.rows<AssignmentRow>(`SELECT * FROM execution_assignments WHERE ${scope} ORDER BY assigned_at,id`, businessId, branchId, keys),
      this.rows<EventRow>(`SELECT * FROM execution_events WHERE ${scope} ORDER BY occurred_at,sequence`, businessId, branchId, keys),
      this.rows<TaskRow>(`SELECT * FROM execution_care_tasks WHERE ${scope} ORDER BY scheduled_date,scheduled_time,id`, businessId, branchId, keys),
    ]);
    return rows.map((r) => decode(r, assignments.filter((a) => a.execution_id === r.id), events.filter((e) => e.execution_id === r.id), tasks.filter((t) => t.execution_id === r.id)));
  }

  async rooms(businessId: string, branchId: string): Promise<DemoBookingResource[]> {
    const rows = await this.rows<{ id: string; label: string; kind: "room" | "zone"; capacity: number; service_id: string }>("SELECT * FROM hotel_spaces WHERE business_id=? AND branch_id=? AND status='active' ORDER BY id", businessId, branchId);
    return rows.map((r) => ({ id: r.id, businessId, branchId, module: "hotel", kind: "hotel-room-type", hotelRole: r.kind, label: r.label, capacity: r.capacity, capacityMode: "capacity", serviceIds: [r.service_id] }));
  }

  async staff(businessId: string, branchId: string): Promise<StaffView[]> {
    const rows = await this.rows<{ id: string; name: string; avatar_seed: string; display_role: StaffView["role"]; capabilities_json: string; status: string; revision: number; created_at: string; updated_at: string }>(
      `SELECT s.* FROM operation_staff s JOIN operation_staff_branches a ON a.business_id=s.business_id AND a.staff_id=s.id WHERE a.business_id=? AND a.branch_id=? ORDER BY s.id`, businessId, branchId);
    const ids = JSON.stringify(rows.map((r) => r.id));
    const [links, windows] = await Promise.all([
      this.rows<{ staff_id: string; branch_id: string }>("SELECT * FROM operation_staff_branches WHERE business_id=? AND staff_id IN (SELECT value FROM jsonb_array_elements_text((?)::text::jsonb))", businessId, ids),
      this.rows<{ id: string; staff_id: string; state: StaffView["availability"][number]["state"]; start_local: string; end_local: string; note: string | null }>("SELECT * FROM operation_staff_windows WHERE business_id=? AND staff_id IN (SELECT value FROM jsonb_array_elements_text((?)::text::jsonb)) ORDER BY id", businessId, ids),
    ]);
    return rows.map((r) => ({ staffId: r.id, businessId, name: r.name, avatarSeed: r.avatar_seed, role: r.display_role, capabilities: JSON.parse(r.capabilities_json), active: r.status === "active", revision: r.revision,
      branchIds: links.filter((a) => a.staff_id === r.id).map((a) => a.branch_id), availability: windows.filter((w) => w.staff_id === r.id).map((w) => ({ id: w.id, state: w.state, start: w.start_local, end: w.end_local, note: w.note })),
      createdAt: r.created_at, updatedAt: r.updated_at }));
  }

  async records(businessId: string, branchId: string, executionIds?: string[]): Promise<ServiceRecordView[]> {
    const rows = await this.rows<{ id: string; execution_id: string; booking_id: string; module: ExecutionView["kind"]; customer_id: string; pet_id: string; completed_at: string; summary: string; business_note: string; snapshot_json: string; revision: number; created_at: string; updated_at: string }>(
      `SELECT r.*,e.booking_id,e.module FROM service_records r JOIN service_executions e ON e.business_id=r.business_id AND e.branch_id=r.branch_id AND e.id=r.execution_id WHERE r.business_id=? AND r.branch_id=? ${executionIds ? "AND r.execution_id IN (SELECT value FROM jsonb_array_elements_text((?)::text::jsonb))" : ""} ORDER BY r.completed_at,r.id`,
      businessId, branchId, ...(executionIds ? [JSON.stringify(executionIds)] : []));
    const revisions = await this.rows<{ id: string; record_id: string; kind: string; data_json: string }>("SELECT * FROM service_record_revisions WHERE business_id=? AND branch_id=? AND record_id IN (SELECT value FROM jsonb_array_elements_text((?)::text::jsonb)) ORDER BY occurred_at,id", businessId, branchId, JSON.stringify(rows.map((r) => r.id)));
    return rows.map((r) => ({ ...JSON.parse(r.snapshot_json), serviceRecordId: r.id, businessId, branchId, customerId: r.customer_id, petId: r.pet_id, bookingId: r.booking_id,
      serviceModule: r.module, source: r.module === "grooming" ? "grooming-job" : r.module === "hotel" ? "hotel-stay" : "daycare-attendance",
      serviceJobId: r.module === "grooming" ? r.execution_id : null, hotelStayId: r.module === "hotel" ? r.execution_id : null, daycareAttendanceId: r.module === "daycare" ? r.execution_id : null,
      completedAt: r.completed_at, summary: r.summary, businessNote: r.business_note, revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at,
      sourceRevisions: revisions.filter((v) => v.record_id === r.id && v.kind === "source-recompleted").map((v) => JSON.parse(v.data_json)),
      corrections: revisions.filter((v) => v.record_id === r.id && v.kind === "correction").map((v) => JSON.parse(v.data_json)),
      handover: { status: "pending", handedOverAt: null, handedOverBy: null, note: "", paymentStatusAtHandover: null, history: [] },
    } as ServiceRecordView));
  }

  /** Can be composed with a verified Intake/approval write in the same batch. */
  statements(write: ExecutionWrite, token: string): PreparedStatement[] {
    const { before, after, context } = write, r = after.record, db = this.database;
    const values = encode(after, token), id = executionId(after);
    const predicate = "EXISTS(SELECT 1 FROM service_executions WHERE business_id=? AND branch_id=? AND id=? AND write_token=?)";
    const bindings = [r.businessId, r.branchId, id, token];
    const statements = [before
      ? db.prepare(`UPDATE service_executions SET customer_id=?,status=?,intake_id=?,scheduled_start=?,scheduled_end=?,business_note=?,details_json=?,revision=?,write_token=?,updated_at=?,cancelled_at=? WHERE business_id=? AND branch_id=? AND id=? AND revision=?`)
        .bind(r.customerId, r.status, r.intakeId, values[9], values[10], r.businessNote, values[12], r.revision, token, r.updatedAt, r.cancelledAt, r.businessId, r.branchId, id, before.record.revision)
      : db.prepare(`INSERT INTO service_executions(${COLUMNS}) VALUES(${values.map(() => "?").join(",")})`).bind(...values),
    ];
    statements.push(db.prepare(`INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,(${predicate})::integer`).bind(`${token}-version`, ...bindings));
    if (write.requireActiveSource) {
      statements.push(db.prepare(`INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,(EXISTS(
        SELECT 1 FROM bookings b JOIN customers c ON c.business_id=b.business_id AND c.id=b.customer_id
        JOIN business_pet_profiles p ON p.business_id=b.business_id AND p.pet_id=?
        JOIN branch_enabled_modules m ON m.business_id=b.business_id AND m.branch_id=b.branch_id AND m.module=b.service_module
        WHERE b.business_id=? AND b.branch_id=? AND b.id=? AND b.status<>'cancelled' AND c.status='active' AND p.status='active'))::integer`)
        .bind(`${token}-source`, r.petId, r.businessId, r.branchId, r.bookingId));
      statements.push(deleteGuard(db, `${token}-source`));
    }
    for (const s of write.checkedStaff ?? []) {
      statements.push(db.prepare(`INSERT INTO backend_guards(id,allowed,version_ok) SELECT ?,1,(EXISTS(SELECT 1 FROM operation_staff WHERE business_id=? AND id=? AND revision=? AND status='active'))::integer`)
        .bind(`${token}-staff`, r.businessId, s.id, s.revision), deleteGuard(db, `${token}-staff`));
    }
    const replaceAssignments = !before || JSON.stringify(assignmentState(before)) !== JSON.stringify(assignmentState(after)) || (!reserves(before) && reserves(after));
    if (replaceAssignments) statements.push(db.prepare(`DELETE FROM execution_assignments WHERE business_id=? AND branch_id=? AND execution_id=? AND ${predicate}`).bind(r.businessId, r.branchId, id, ...bindings));
    const end = values[10] ?? new Date(Date.parse(`${values[9]}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
    const assignments: { id: string; resourceId: string | null; spaceId: string | null; staffId: string | null; start: string; end: string; at: string; by: string | null; reason: string | null }[] = [];
    const addAssignment = (resourceId: string | null, staffId: string | null) => assignments.push({ id: opaqueId("asn"), resourceId, spaceId: null, staffId, start: String(values[9]), end: String(end), at: context.occurredAt, by: context.actor.id, reason: null });
    if (after.kind === "grooming") after.record.assignedResourceIds.forEach((resourceId) => addAssignment(resourceId, null));
    if (after.kind === "daycare") {
      if (after.record.zoneId) addAssignment(after.record.zoneId, null);
      if (after.record.responsibleStaffId) addAssignment(null, after.record.responsibleStaffId);
    }
    if (after.kind === "hotel") assignments.push(...after.record.roomAssignments.map((a) => ({ id: a.id, resourceId: null, staffId: null, spaceId: a.roomId, start: a.startDate, end: a.endDate ?? after.record.scheduledCheckOut, at: a.assignedAt, by: a.assignedBy, reason: a.reason })));
    for (const a of replaceAssignments ? assignments : []) statements.push(db.prepare(`INSERT INTO execution_assignments(id,business_id,branch_id,execution_id,resource_id,space_id,staff_id,start_local,end_local,assigned_at,assigned_by,reason) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE (${predicate})`)
      .bind(a.id, r.businessId, r.branchId, id, a.resourceId, a.spaceId, a.staffId, a.start, a.end, a.at, a.by, a.reason, ...bindings));
    const existingEvents = eventIds(before);
    const event = (eventId: string, kind: string, at: string, summary: string, data: unknown) => {
      if (!existingEvents.has(eventId)) statements.push(db.prepare(`INSERT INTO execution_events(id,business_id,branch_id,execution_id,kind,summary,data_json,actor_person_id,occurred_at) SELECT ?,?,?,?,?,?,?,?,? WHERE (${predicate})`)
        .bind(eventId, r.businessId, r.branchId, id, kind, summary, JSON.stringify(data), context.actor.id, at, ...bindings));
    };
    // Existing event IDs are immutable. Only new source events are appended.
    for (const h of r.history) event(h.id, `history:${h.type}`, h.at, h.summary, {});
    if (after.kind === "grooming") for (const a of after.record.addOns) event(a.id, "addon", a.approvedAt, "บริการเพิ่มเติมที่อนุมัติแล้ว", a);
    if (after.kind === "daycare") for (const c of after.record.careEvents) event(c.id, "daycare-care", c.occurredAt, c.label, c);
    if (after.kind === "hotel") {
      for (const m of after.record.roomMoveHistory) event(m.id, "room-move", m.movedAt, "ย้ายห้อง", m);
      for (const i of after.record.incidentNotes) {
        event(i.id, "incident", i.createdAt, "บันทึกเหตุการณ์", { ...i, resolvedAt: null, resolvedBy: null });
        if (i.resolvedAt) event(`${i.id}-resolved`, "incident-resolved", i.resolvedAt, "ติดตามเรียบร้อย", { id: i.id, resolvedAt: i.resolvedAt, resolvedBy: i.resolvedBy });
      }
      const previousTasks = new Map(before?.kind === "hotel" ? before.record.dailyCareTasks.map((t) => [t.id, JSON.stringify(t)]) : []);
      for (const t of after.record.dailyCareTasks.filter((t) => previousTasks.get(t.id) !== JSON.stringify(t))) statements.push(db.prepare(`INSERT INTO execution_care_tasks(id,business_id,branch_id,execution_id,kind,label,scheduled_date,scheduled_time,staff_id,completed_at,completed_by,instructions,authorized_intake_id)
        SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE (${predicate})
        ON CONFLICT(id) DO UPDATE SET staff_id=excluded.staff_id,completed_at=excluded.completed_at,completed_by=excluded.completed_by`)
        .bind(t.id, r.businessId, r.branchId, id, t.kind, t.label, t.scheduledDate, t.scheduledTime, t.assignedStaffId ?? null, t.completedAt, t.completedBy, t.instructions ?? null, t.authorization?.intakeId ?? null, ...bindings));
    }
    if (write.serviceRecord) statements.push(...this.recordStatements(write.serviceRecord, after, context, predicate, bindings));
    if (write.receipt) statements.push(receiptStatement(db, context, r.branchId, write.receipt, predicate, bindings));
    statements.push(auditStatement(db, context, r.branchId, write.receipt?.command ?? "execution.projected", "execution", id,
      before ? { status: before.record.status, revision: before.record.revision } : null, { status: r.status, revision: r.revision, module: after.kind }, predicate, bindings));
    statements.push(deleteGuard(db, `${token}-version`));
    return statements;
  }

  private recordStatements(record: ServiceRecordView, execution: ExecutionView, context: AuthorizedMutation, predicate: string, bindings: unknown[]) {
    const db = this.database, r = execution.record;
    const snapshot = JSON.stringify({ serviceLabel: record.serviceLabel, details: record.details, activities: record.activities, staffResourceLabels: record.staffResourceLabels, photos: [] });
    return [
      db.prepare(`INSERT INTO service_record_revisions(id,business_id,branch_id,record_id,kind,data_json,actor_person_id,occurred_at)
        SELECT ?,business_id,branch_id,id,'source-recompleted',jsonb_build_object('id',?::text,'at',?::text,'completedAt',completed_at,'summary',summary,'businessNote',business_note,'details',((snapshot_json)::jsonb->'details'),'activities',((snapshot_json)::jsonb->'activities'),'staffResourceLabels',((snapshot_json)::jsonb->'staffResourceLabels'),'photos','[]'::jsonb,'reason','source-recompleted'),?,?
        FROM service_records WHERE business_id=? AND branch_id=? AND execution_id=? AND completed_at<>? AND ${predicate}`)
        .bind(opaqueId("srvrev"), opaqueId("revision"), context.occurredAt, context.actor.id, context.occurredAt, r.businessId, r.branchId, executionId(execution), record.completedAt, ...bindings),
      db.prepare(`INSERT INTO service_records(id,business_id,branch_id,execution_id,customer_id,pet_id,completed_at,summary,business_note,snapshot_json,source_revision,revision,created_at,updated_at)
        SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE (${predicate})
        ON CONFLICT(business_id,branch_id,execution_id) DO UPDATE SET completed_at=excluded.completed_at,summary=excluded.summary,business_note=excluded.business_note,snapshot_json=excluded.snapshot_json,source_revision=excluded.source_revision,revision=service_records.revision+1,updated_at=excluded.updated_at
        WHERE service_records.completed_at<>excluded.completed_at`)
        .bind(record.serviceRecordId, r.businessId, r.branchId, executionId(execution), r.customerId, r.petId, record.completedAt, record.summary, record.businessNote, snapshot, r.revision, 1, context.occurredAt, context.occurredAt, ...bindings),
    ];
  }

  async save(write: ExecutionWrite, additionalStatements: PreparedStatement[] = []) {
    const token = opaqueId("write"), { context, after } = write;
    const results = await batch(this.database, [authorizationGuard(this.database, context, after.record.branchId, token), ...this.statements(write, token), ...additionalStatements, deleteGuard(this.database, token)]);
    if ((results[1]?.meta?.changes ?? 0) !== 1) conflict("version-conflict");
  }
}
