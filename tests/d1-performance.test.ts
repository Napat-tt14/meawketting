import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { D1Be1Repository } from "../app/_backend/be1/d1Repository";
import type { PersonView } from "../app/_backend/be1/contracts";
import { D1Be2Repository } from "../app/_backend/be2/d1Repository";
import { Be3Application } from "../app/_backend/be3/application";
import { D1Be3Repository } from "../app/_backend/be3/d1Repository";
import type { BookingView } from "../app/_backend/be3/contracts";
import { Be4Application } from "../app/_backend/be4/application";
import { D1Be4Repository } from "../app/_backend/be4/d1Repository";
import { Be5Application } from "../app/_backend/be5/application";
import { D1Be5Repository } from "../app/_backend/be5/d1Repository";
import { GuardianGrantService } from "../app/_backend/be5/authority";
import type { IntakeResult } from "../app/_backend/be5/contracts";
import { Be6Application } from "../app/_backend/be6/application";
import { D1Be6Repository } from "../app/_backend/be6/d1Repository";
import type { ConversationView } from "../app/_backend/be6/contracts";
import { Be7Application } from "../app/_backend/be7/application";
import { D1Be7Repository } from "../app/_backend/be7/d1Repository";
import type { BillingMutationResult } from "../app/_backend/be7/contracts";
import { Be8Application } from "../app/_backend/be8/application";
import { withBackend } from "../app/_backend/runtime";
import { ARI, metadata, ONNUT, OWNER, PAW, seededDatabase, WHISKER } from "./d1Fixtures";

// Captured by work/p2-after-query-counts.json on 2026-10-12; no latency was captured.
const postgresP2Baseline: Record<string, { statements: number; transactions: number }> = {
  "reports.get": { statements: 22, transactions: 6 }, "home.summary": { statements: 14, transactions: 6 },
  "billing.summary": { statements: 10, transactions: 6 }, "operations.list.owner": { statements: 19, transactions: 14 },
  "crm.list": { statements: 13, transactions: 8 }, "booking.catalog": { statements: 14, transactions: 11 },
  "charges.list": { statements: 11, transactions: 7 }, "payments.list.empty": { statements: 11, transactions: 7 },
  "booking.update.notes-only": { statements: 57, transactions: 37 },
};

test("LOCAL D1 performance probe reproduces operation counts, durations and payload sizes", async t => {
  const db = seededDatabase(); t.after(() => db.close());
  for (const phase of [5, 6, 7]) db.inspect.exec(readFileSync(`tests/fixtures/d1/seed-be${phase}-dev.sql`, "utf8"));
  const now = () => "2026-08-18T04:00:00.000Z", scope = { businessId: WHISKER, branchId: ARI };
  const auth = new D1Be1Repository(db), customers = new D1Be2Repository(db), bookings = new D1Be3Repository(db), operations = new D1Be4Repository(db);
  const planning = new Be3Application(auth, customers, bookings, { now }), be4 = new Be4Application(auth, customers, bookings, operations, now);
  const be6 = new Be6Application(auth, new D1Be6Repository(db, "dev-test"), now), be7 = new Be7Application(auth, new D1Be7Repository(db, "dev-test"), undefined, now), be8 = new Be8Application(auth, db, now);
  const actor = await planning.resolvePerson(OWNER);
  const input = { ...scope, serviceId: "ari-grooming-bath-groom", customerId: "booking-contact-nalin", petIds: ["booking-pet-mochi"],
    start: "2026-09-10T10:00", end: "2026-09-10T11:30", assignedResourceIds: ["ari-groomer-pim", "ari-station-a", "ari-dryer-1"],
    status: "confirmed" as const, estimate: 850, notes: "", idempotencyKey: "d1-perf-notes" };
  const created = await planning.createBooking(actor, input, metadata()); assert.equal(created.outcome, "created");
  if (created.outcome !== "created") throw new Error("Performance fixture Booking unavailable");
  let edited: BookingView = created.booking;
  const source = db.inspect.prepare("SELECT id FROM service_executions WHERE booking_id='booking-fixture-ari-grooming-1030'").get()!.id as string;
  const qrSource = db.inspect.prepare("SELECT id FROM service_executions WHERE booking_id=?").get(edited.id)!.id as string;
  let balance = (await be7.executeBe7(actor, { ...scope, type: "charge.checkout", executionId: source, requestKey: "d1-perf-checkout" }, metadata()) as BillingMutationResult).balance;
  const context = { customerId: input.customerId, petId: input.petIds[0], bookingId: "booking-fixture-ari-grooming-1030", executionId: source };
  const conversation = await be6.executeBe6(actor, { ...scope, type: "conversation.ensure", context, requestKey: "d1-perf-conversation" }, metadata()) as ConversationView;
  await be6.executeBe6(actor, { ...scope, type: "message.send", context, conversationId: conversation.conversationId, text: "Performance fixture", requestKey: "d1-perf-message" }, metadata());
  const results: Record<string, unknown>[] = [];
  const originalBatch = db.batch.bind(db); let directoryOrderingRows = 0, customerHydrationRows = 0;
  db.batch = async statements => {
    const result = await originalBatch(statements);
    statements.forEach((statement, index) => {
      if ((statement as unknown as { query: string }).query.includes("SELECT id,display_name FROM matching")) directoryOrderingRows += result[index].results?.length ?? 0;
      if ((statement as unknown as { query: string }).query.includes("FROM selected_customers c ORDER BY")) customerHydrationRows += result[index].results?.length ?? 0;
    });
    return result;
  };
  async function measure(label: string, task: (person: PersonView) => Promise<unknown>) {
    const before = { ...db.metrics }, orderingBefore = directoryOrderingRows, hydrationBefore = customerHydrationRows, started = performance.now();
    const response = await withBackend(new Request(`https://test.invalid/api/local-probe/${label}`), { DB: db.binding }, async () => {
      // The persisted Person is already authenticated by the fixture; OAuth/session network work is excluded.
      return Response.json(await task(await planning.resolvePerson(OWNER)));
    });
    const applicationDurationMs = performance.now() - started, responseBytes = (await response.arrayBuffer()).byteLength;
    const delta = (key: keyof typeof before) => db.metrics[key] - before[key];
    results.push({ label, environment: "LOCAL", apiCalls: 1, d1Statements: delta("statements"), d1Batches: delta("batches"),
      applicationDurationMs, adapterRpcDurationMs: delta("rpcDuration"), dbReportedDurationMs: delta("duration"),
      dbReportedStatements: delta("reportedStatements"), responseBytes, rowsReadReported: delta("rowsRead"), rowsWrittenReported: delta("rowsWritten"),
      directoryOrderingRows: directoryOrderingRows - orderingBefore,
      customerHydrationRows: customerHydrationRows - hydrationBefore,
      postgresP2Before: postgresP2Baseline[label] ?? null });
    assert.equal(response.status, 200); assert.ok(delta("statements") > 0); assert.ok(responseBytes > 0);
  }
  await measure("home.summary", person => be8.executeBe8(person, { ...scope, type: "home.summary" }, metadata()));
  await measure("crm.list", person => be8.executeBe8(person, { ...scope, type: "crm.list", limit: 50 }, metadata()));
  await measure("crm.first-page", person => be8.executeBe8(person, { ...scope, type: "crm.list", offset: 0, limit: 50 }, metadata()));
  await measure("crm.get", person => be8.executeBe8(person, { ...scope, type: "crm.get", customerId: input.customerId }, metadata()));
  await measure("calendar.range", person => planning.listBookings(person, { ...scope, rangeStart: "2026-08-17", rangeEnd: "2026-08-24", limit: 100 }));
  await measure("booking.catalog", person => planning.getCatalog(person, WHISKER, ARI));
  await measure("booking.list", person => planning.listBookings(person, { ...scope, limit: 50 }));
  const childrenBefore = ["booking_pets", "booking_resource_assignments", "booking_resource_reservations"].map(table => db.inspect.prepare(`SELECT * FROM ${table} WHERE booking_id=?`).all(edited.id));
  await measure("booking.update.notes-only", async person => {
    const result = await planning.updateBooking(person, { ...input, bookingId: edited.id, expectedRevision: edited.revision, notes: "Only this note changed" }, metadata());
    assert.equal(result.outcome, "updated"); if (result.outcome !== "updated") throw new Error("Notes mutation failed"); edited = result.booking; return result;
  });
  assert.deepEqual(["booking_pets", "booking_resource_assignments", "booking_resource_reservations"].map(table => db.inspect.prepare(`SELECT * FROM ${table} WHERE booking_id=?`).all(edited.id)), childrenBefore);
  await measure("booking.reschedule", async person => {
    const result = await planning.rescheduleBooking(person, { ...scope, bookingId: edited.id, expectedRevision: edited.revision, start: "2026-09-11T10:00", end: "2026-09-11T11:30" }, metadata());
    assert.equal(result.outcome, "updated"); if (result.outcome !== "updated") throw new Error("Reschedule failed"); edited = result.booking; return result;
  });
  await measure("operations.list.owner", person => be4.executeBe4(person, { ...scope, type: "operations.list", limit: 100 }, metadata()));
  await measure("inbox.list", person => be6.executeBe6(person, { ...scope, type: "inbox.list", limit: 50 }, metadata()));
  await measure("conversation.get", person => be6.executeBe6(person, { ...scope, type: "conversation.get", conversationId: conversation.conversationId }, metadata()));
  await measure("charges.list", person => be7.executeBe7(person, { ...scope, type: "charges.list", limit: 50 }, metadata()));
  await measure("payments.list.empty", person => be7.executeBe7(person, { ...scope, type: "payments.list", limit: 50 }, metadata()));
  await measure("billing.summary", person => be8.executeBe8(person, { ...scope, type: "billing.summary" }, metadata()));
  await measure("payment.record", async person => {
    const result = await be7.executeBe7(person, { ...scope, type: "payment.record", chargeId: balance.charge.chargeId, expectedRevision: balance.charge.revision, amount: 100, method: "cash", note: "", requestKey: "d1-perf-payment" }, metadata()) as BillingMutationResult;
    balance = result.balance; assert.equal(balance.paid, 100); return result;
  });
  await measure("payments.list", person => be7.executeBe7(person, { ...scope, type: "payments.list", limit: 50 }, metadata()));
  await measure("reports.get", person => be8.executeBe8(person, { ...scope, type: "reports.get", options: {} }, metadata()));
  for (const [label, businessId, branchId, serviceModule] of [["grooming.list", WHISKER, ARI, "grooming"], ["hotel.list", WHISKER, ARI, "hotel"], ["daycare.list", PAW, ONNUT, "daycare"]] as const) {
    await measure(label, person => be4.executeBe4(person, { type: "operations.list", businessId, branchId, module: serviceModule, limit: 100 }, metadata()));
  }
  // Privacy grants use the real clock so the database expiry proof remains meaningful.
  const qrNow = () => new Date().toISOString(), guardian = new GuardianGrantService(db, "dev-test", qrNow), intakes = new Be5Application(auth, new D1Be5Repository(db, "dev-test"), qrNow);
  const issued = await guardian.issue("prs_be5_guardian_000001", { ...scope, petId: input.petIds[0], scope: ["basicIdentity"], purpose: "LOCAL performance check-in", durationMinutes: 120, pending: false }, "d1-perf-qr-issue");
  assert.ok(issued.token); let intake: IntakeResult;
  await measure("qr.scan", person => intakes.executeBe5(person, { ...scope, type: "access.scan", value: issued.token! }, metadata()));
  await measure("qr.intake.start", async person => {
    intake = await intakes.executeBe5(person, { ...scope, type: "intake.start", value: issued.token!, executionId: qrSource, requestKey: "d1-perf-intake" }, metadata()) as IntakeResult; return intake;
  });
  await measure("qr.check-in", async person => {
    const result = await intakes.executeBe5(person, { ...scope, type: "intake.receive", intakeId: intake.record.id, expectedRevision: intake.record.revision, requestKey: "d1-perf-check-in" }, metadata()) as IntakeResult;
    assert.equal(result.record.checkInState, "checked-in"); return result;
  });
  db.inspect.exec(`WITH RECURSIVE series(n) AS (VALUES(0) UNION ALL SELECT n+1 FROM series WHERE n<999)
    INSERT INTO customers(id,business_id,display_name,display_name_key,business_notes,status,created_at,updated_at,created_by_person_id,updated_by_person_id)
    SELECT 'perf_customer_'||printf('%04d',n),'${WHISKER}','Performance Customer '||n,'performance customer '||n,'','active','2026-08-17T03:00:00.000Z','2026-08-17T03:00:00.000Z','${OWNER}','${OWNER}' FROM series`);
  await measure("crm.first-page.1000-customers", person => be8.executeBe8(person, { ...scope, type: "crm.list", offset: 0, limit: 50 }, metadata()));
  assert.equal(results.at(-1)!.directoryOrderingRows, 0);
  assert.equal(results.at(-1)!.customerHydrationRows, 51);
  assert.ok(Number(results.at(-1)!.rowsReadReported) < 100);
  assert.equal(results.length, 25); assert.deepEqual(db.inspect.prepare("PRAGMA foreign_key_check").all(), []);
  mkdirSync("work", { recursive: true });
  writeFileSync("work/d1-performance-local.json", JSON.stringify({ environment: "LOCAL", measuredAt: new Date().toISOString(),
    command: "npx tsx --test tests/d1-performance.test.ts", fixtureClock: now(),
    note: "Synthetic seeded data and one simulated API request per operation with fresh request-scoped verified-read cache. Persisted Person lookup is counted; OAuth, token/session verification, browser/network/Cloudflare latency are excluded. Local SQLite binding emulates D1 meta.duration using measured SQLite execution. Native first() returns no metadata; dbReportedStatements documents partial duration/row coverage. RowsReadReported counts rows returned by this local binding, not Cloudflare rows scanned. The real CRM screen uses SQL normalized-name offset pagination: it hydrates at most limit+1 Customers, including one next-page sentinel, with no whole-directory ID/name read. customerHydrationRows reports the bounded projection output. Aggregate counts still scan matching records inside D1. One run is a baseline, not a load test. P2 PostgreSQL baseline supplies statement/transaction counts only; null means no comparable recorded baseline. REMOTE TEST and PRODUCTION measurements have not been performed.",
    postgresP2Baseline: { source: "work/p2-after-query-counts.json, captured 2026-10-12; reproduced values are preserved here", results: postgresP2Baseline }, results,
  }, null, 2));
  const table = results.map(row => {
    const baseline = postgresP2Baseline[String(row.label)];
    return `| ${row.label} | ${baseline ? `${baseline.statements} / ${baseline.transactions}` : "Unavailable"} | ${row.d1Statements} / ${row.d1Batches} | ${row.apiCalls} | ${Number(row.applicationDurationMs).toFixed(2)} | ${Number(row.adapterRpcDurationMs).toFixed(2)} | ${Number(row.dbReportedDurationMs).toFixed(2)} (${row.dbReportedStatements}/${row.d1Statements}) | ${row.responseBytes} |`;
  });
  writeFileSync("work/d1-performance-comparison.md", `# LOCAL PostgreSQL P2 / D1 comparison\n\nMeasured by \`npx tsx --test tests/d1-performance.test.ts\`. Results are synthetic local SQLite execution through the native D1 adapter contract; they are not Cloudflare remote or production latency. Each row uses one simulated API request with a fresh verified-read cache and includes a persisted Person lookup. OAuth and session verification, browser rendering and network work are excluded.\n\nP2 PostgreSQL baseline counts come from the captured 2026-10-12 probe. They have no comparable latency or payload measurements; unavailable values remain unavailable. The notes-only baseline reused an actor resolved before measurement, while this probe counts that lookup and adds current authorization guards. PostgreSQL transactions and D1 batches measure different units; statement counts are the closest comparison.\n\n| Operation | P2 PostgreSQL statements / transactions | D1 statements / batches | Simulated API calls | App ms | Adapter call ms | Local SQLite reported ms (coverage) | JSON bytes |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${table.join("\n")}\n\nNative \`first()\` has no result metadata; coverage is reported statements / all statements. The local binding measures SQLite execution for its emulated \`meta.duration\`; this is not Cloudflare server telemetry. Returned-row counts in the JSON artifact are not D1 scan counts. One run does not establish a latency distribution or throughput. Notes-only children remain unchanged; mutations and QR check-in are asserted successful, with no foreign-key violations.\n\nCRM first-page rows use the actual UI offset path, ordered by normalized name and ID in SQL as approved by the user. For 1,002 Customers it hydrates 51 rows (50 plus one next-page sentinel), returns 50 Customers and performs no whole-directory ID/name read. Aggregate counts still scan records inside D1; returned-row measurements do not establish scan cost.\n\nREMOTE TEST: not measured. PRODUCTION: not measured. Do not infer a production speedup from these local durations. Full measured values and baseline provenance are preserved in \`work/d1-performance-local.json\`.\n`);
});
