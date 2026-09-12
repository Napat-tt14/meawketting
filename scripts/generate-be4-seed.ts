// Explicit DEV/TEST generator. Runtime code never imports fixture data.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEMO_BOOKING_RESOURCES, DEMO_TEAM_MEMBER_FIXTURES } from "../app/_prototype/businessState";

const sql: string[] = ["-- DEV/TEST ONLY. Deterministic operational staff and Hotel spaces; no login or Passport authority."];
const quote = (value: unknown) => value === null ? "NULL" : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
function insert(table: string, columns: string[], values: unknown[]) { sql.push(`INSERT OR IGNORE INTO ${table}(${columns.join(",")}) VALUES(${values.map(quote).join(",")});`); }
for (const s of DEMO_TEAM_MEMBER_FIXTURES) {
  insert("operation_staff", ["id", "business_id", "name", "avatar_seed", "display_role", "capabilities_json", "status", "revision", "created_at", "updated_at"], [s.staffId, s.businessId, s.name, s.avatarSeed, s.role, JSON.stringify(s.capabilities), s.active ? "active" : "inactive", 1, s.createdAt, s.updatedAt]);
  for (const id of s.branchIds) insert("operation_staff_branches", ["business_id", "branch_id", "staff_id"], [s.businessId, id, s.staffId]);
  for (const w of s.availability) insert("operation_staff_windows", ["id", "business_id", "staff_id", "state", "start_local", "end_local", "note"], [w.id, s.businessId, s.staffId, w.state, w.start, w.end, w.note]);
}
for (const r of DEMO_BOOKING_RESOURCES.filter((r) => r.hotelRole === "room" || r.hotelRole === "zone")) {
  insert("hotel_spaces", ["id", "business_id", "branch_id", "service_id", "label", "kind", "capacity", "status"], [r.id, r.businessId, r.branchId, r.serviceIds[0], r.label, r.hotelRole, r.capacity, "active"]);
}
sql.push("DELETE FROM booking_resource_availability_windows WHERE resource_id IN (SELECT id FROM booking_resources WHERE compatibility_staff_id IS NOT NULL);");
sql.push(readFileSync(resolve(import.meta.dirname, "../drizzle/0006_be4_booking_execution_backfill.sql"), "utf8")
  .replace("'execution_'||lower(hex(randomblob(16)))", "'execution-seed-'||b.id||'-'||p.pet_id")
  .replace("'event_'||lower(hex(randomblob(16)))", "'event-seed-'||e.id")
  .replace("'assignment_'||lower(hex(randomblob(16)))", "'assignment-seed-'||e.id||'-'||a.resource_id"));
writeFileSync(resolve(import.meta.dirname, "seed-be4-dev.sql"), `${sql.join("\n")}\n`);
