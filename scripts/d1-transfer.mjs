// One-time operator tool. Delete this file and the source driver after verified cutover.
// This tool is never imported by the Worker and writes no database dump or media file.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const identifier = value => { assert(/^[a-z_][a-z0-9_]*$/.test(value), "Unexpected SQL identifier"); return `"${value}"`; };
const checksum = value => createHash("sha256").update(value).digest("hex");
const instant = name => name.endsWith("_at") && !["opens_at", "closes_at"].includes(name);
const skipped = new Set(["backend_guards", "auth_sessions", "auth_oauth_states"]);

export function normalizeRow(table, columns, source) {
  const row = {};
  for (const column of columns) {
    let value = source[column.name];
    assert(value !== undefined, `Missing source column ${table}.${column.name}`);
    assert(!column.notnull || value !== null, `Null required source column ${table}.${column.name}`);
    if (value !== null && column.type.toUpperCase() === "INTEGER") {
      assert(typeof value === "number" || typeof value === "bigint" || (typeof value === "string" && /^-?\d+$/.test(value)), "Invalid source integer");
      value = Number(value); assert(Number.isSafeInteger(value), "Source integer exceeds safe precision");
      if ((["bookings", "booking_services"].includes(table) && column.name === "estimate") || (table === "message_approvals" && column.name === "additional_price")) value *= 100;
      assert(Number.isSafeInteger(value), "Minor-unit amount exceeds safe precision");
    }
    if (value !== null && instant(column.name)) {
      assert(value instanceof Date || typeof value === "string", "Invalid source instant");
      const date = value instanceof Date ? value : new Date(value);
      assert(Number.isFinite(date.getTime()), "Invalid source instant"); value = date.toISOString();
    }
    assert(value === null || typeof value === "string" || typeof value === "number", "Unsupported source value");
    row[column.name] = value;
  }
  return row;
}

export function insertStatement(table, columns, row) {
  const names = columns.map(column => column.name), keys = columns.filter(column => column.pk).map(column => column.name);
  assert(keys.length, "Target table requires a primary key");
  const updates = names.filter(name => !keys.includes(name));
  const sql = `INSERT INTO ${identifier(table)} (${names.map(identifier)}) VALUES (${names.map(() => "?")}) ON CONFLICT (${keys.map(identifier)}) ${updates.length ? `DO UPDATE SET ${updates.map(name => `${identifier(name)}=excluded.${identifier(name)}`).join(",")}` : "DO NOTHING"}`;
  assert(names.length <= 90, "D1 bound-parameter ceiling exceeded");
  return { sql, params: names.map(name => row[name]) };
}

function schemaMetadata() {
  const source = readFileSync(resolve("migrations/d1/0001_initial.sql"), "utf8"), db = new DatabaseSync(":memory:");
  db.exec(source);
  const all = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(row => row.name);
  const columns = new Map(all.map(table => [table, db.prepare(`PRAGMA table_info(${identifier(table)})`).all()]));
  const pending = new Set(all.filter(table => !skipped.has(table))), ordered = [];
  while (pending.size) {
    const next = [...pending].find(table => db.prepare(`PRAGMA foreign_key_list(${identifier(table)})`).all().every(fk => !pending.has(fk.table) || fk.table === table));
    assert(next, "Circular foreign-key dependency requires an explicit import order"); ordered.push(next); pending.delete(next);
  }
  const triggers = db.prepare("SELECT name,sql FROM sqlite_schema WHERE type='trigger' ORDER BY name").all(); db.close();
  return { all, ordered, columns, triggers, schemaHash: checksum(source) };
}

async function cloudflare(env, path, options) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/${path}`, {
    ...options, headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, ...options.headers }, redirect: "error", signal: AbortSignal.timeout(60000),
  });
  assert(response.ok, `Cloudflare operator request failed (HTTP ${response.status})`);
  return response;
}
function remote(env) {
  return async statements => {
    assert(statements.length > 0 && statements.length <= 90, "D1 batch ceiling exceeded");
    const response = await cloudflare(env, `d1/database/${env.D1_DATABASE_ID}/query`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ batch: statements }),
    });
    const envelope = await response.json();
    assert(envelope.success && envelope.result?.every(result => result.success), "D1 operator query failed");
    return envelope.result.map(result => result.results ?? []);
  };
}

function identitySql(schema, withSupabase) {
  const external = `SELECT id,person_id,provider,subject provider_subject,NULL::text email,NULL::text display_name,verified_at created_at,verified_at updated_at,2 priority,NULL::text auth_user_id
    FROM ${schema}.person_external_identities WHERE status='active' AND provider='line' AND issuer='https://access.line.me'`;
  const provider = `SELECT i.id::text,l.person_id,CASE WHEN i.provider='custom:line' THEN 'line' ELSE i.provider END provider,
    coalesce(i.identity_data->>'sub',i.provider_id) provider_subject,i.identity_data->>'email' email,
    coalesce(i.identity_data->>'name',u.raw_user_meta_data->>'name') display_name,i.created_at::text,coalesce(i.updated_at,i.created_at)::text updated_at,1 priority,i.user_id::text auth_user_id
    FROM auth.identities i JOIN auth.users u ON u.id=i.user_id LEFT JOIN ${schema}.auth_person_links l ON l.auth_user_id=i.user_id
    WHERE i.provider IN ('google','line','custom:line')`;
  const prefix = `WITH provider_identities AS (${withSupabase ? `${provider} UNION ALL ` : ""}${external})`;
  return { query: `${prefix}, ranked_identities AS (
    SELECT *,row_number() OVER(PARTITION BY provider,provider_subject ORDER BY person_id IS NULL,priority,id) identity_order FROM provider_identities)
    SELECT id,person_id,provider,provider_subject,email,display_name,created_at,updated_at FROM ranked_identities WHERE identity_order=1`,
    conflicts: `${prefix} SELECT count(*)::text n FROM (SELECT provider,provider_subject FROM provider_identities GROUP BY provider,provider_subject HAVING count(DISTINCT person_id)>1) ambiguous` };
}

function sourceSql(table, columns, schema, identities) {
  if (table === "auth_identities") return identities;
  if (table === "business_registrations") return `SELECT (SELECT i.id FROM (${identities}) i WHERE i.person_id=l.person_id ORDER BY i.provider,i.id LIMIT 1) identity_id,
    l.person_id,r.business_id,r.branch_id,r.request_hash,r.confirmed_at FROM ${schema}.business_registrations r JOIN ${schema}.auth_person_links l ON l.auth_user_id=r.auth_user_id`;
  return `SELECT ${columns.map(column => identifier(column.name))} FROM ${schema}.${identifier(table)}`;
}

async function* sourceRows(tx, query, table, columns) {
  const keys = columns.filter(column => column.pk).sort((a, b) => a.pk - b.pk).map(column => column.name);
  for await (const rows of tx.unsafe(`SELECT * FROM (${query}) transfer_rows ORDER BY ${keys.map(identifier)}`).cursor(100)) {
    for (const source of rows) yield normalizeRow(table, columns, source);
  }
}
async function summarize(rows) {
  const hash = createHash("sha256"); let count = 0;
  for await (const row of rows) { hash.update(JSON.stringify(row) + "\n"); count++; }
  return { count, sha256: hash.digest("hex") };
}
async function* targetRows(query, table, columns) {
  const order = columns.filter(column => column.pk).sort((a, b) => a.pk - b.pk).map(column => identifier(column.name));
  for (let offset = 0; ; offset += 100) {
    const [rows] = await query([{ sql: `SELECT ${columns.map(c => identifier(c.name))} FROM ${identifier(table)} ORDER BY ${order} LIMIT 100 OFFSET ?`, params: [offset] }]);
    for (const row of rows) yield Object.fromEntries(columns.map(column => [column.name, row[column.name]]));
    if (rows.length < 100) break;
  }
}

async function copyMedia(env, row) {
  assert(env.D1_SOURCE_STORAGE_URL && env.D1_SOURCE_STORAGE_KEY && env.D1_R2_BUCKET, "Existing media requires a private R2 bucket and one-time source storage credentials");
  const origin = new URL(env.D1_SOURCE_STORAGE_URL); assert(origin.protocol === "https:", "Source storage must use HTTPS");
  const key = [row.business_id, row.branch_id ?? "business", row.pet_id ?? "logo", row.id].map(encodeURIComponent).join("/");
  const sourceKey = row.object_path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(new URL(`/storage/v1/object/authenticated/business-media/${sourceKey}`, origin), {
    headers: { authorization: `Bearer ${env.D1_SOURCE_STORAGE_KEY}`, apikey: env.D1_SOURCE_STORAGE_KEY }, redirect: "error", signal: AbortSignal.timeout(60000),
  });
  assert(response.ok && response.body, "Source media read failed");
  const hash = createHash("sha256"); let bytes = 0;
  const body = response.body.pipeThrough(new TransformStream({ transform(chunk, controller) { bytes += chunk.length; assert(bytes <= 10485760, "Media size limit exceeded"); hash.update(chunk); controller.enqueue(chunk); } }));
  const objectPath = `r2/buckets/${encodeURIComponent(env.D1_R2_BUCKET)}/objects/${key}`;
  await cloudflare(env, objectPath, { method: "PUT", headers: { "content-type": row.content_type, "content-length": String(row.byte_size) }, body, duplex: "half" });
  assert.equal(bytes, row.byte_size, "Source media size differs from metadata");
  const uploaded = await cloudflare(env, objectPath, { method: "GET" }); assert(uploaded.body, "R2 object read failed");
  const copiedHash = createHash("sha256"); let copiedBytes = 0;
  for await (const chunk of uploaded.body) { copiedBytes += chunk.length; copiedHash.update(chunk); }
  assert.equal(copiedBytes, bytes, "R2 media size mismatch"); assert.equal(copiedHash.digest("hex"), hash.digest("hex"), "R2 media content mismatch");
  return key;
}

async function sourceClient(env) {
  assert(env.D1_SOURCE_URL, "D1_SOURCE_URL is required");
  const postgres = (await import("postgres")).default;
  return postgres(env.D1_SOURCE_URL, { max: 1, prepare: false, connect_timeout: 15,
    ssl: { rejectUnauthorized: true, ...(env.D1_SOURCE_CA_FILE ? { ca: readFileSync(env.D1_SOURCE_CA_FILE, "utf8") } : {}) }, onnotice: () => {} });
}
async function sourceManifest(tx, env, metadata) {
  const schema = identifier(env.D1_SOURCE_SCHEMA ?? "public");
  const [{ present }] = await tx`SELECT to_regclass('auth.identities') IS NOT NULL present`;
  const identities = identitySql(schema, present), [{ n }] = await tx.unsafe(identities.conflicts);
  assert.equal(Number(n), 0, "A provider subject is linked to multiple Persons; resolve verified linkage before transfer");
  const sql = new Map(metadata.ordered.map(table => [table, sourceSql(table, metadata.columns.get(table), schema, identities.query)]));
  const manifest = {};
  for (const table of metadata.ordered) manifest[table] = await summarize(sourceRows(tx, sql.get(table), table, metadata.columns.get(table)));
  return { sql, manifest };
}
export async function inspectSource(env = process.env) {
  const source = await sourceClient(env);
  try {
    return await source.begin("isolation level repeatable read read only", async tx => {
      const { manifest } = await sourceManifest(tx, env, schemaMetadata());
      return { mode: "read-only", transformedTables: Object.fromEntries(Object.entries(manifest).map(([table, value]) => [table, value.count])) };
    });
  } finally { await source.end({ timeout: 5 }); }
}

export async function transfer(env = process.env) {
  assert.equal(env.D1_WRITE_FREEZE_CONFIRMED, "yes", "Cutover requires an active write freeze");
  assert.equal(env.D1_TESTS_PASSED_CONFIRMED, "yes", "Cutover requires successful local tests");
  for (const key of ["D1_SOURCE_URL", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "D1_DATABASE_ID"]) assert(env[key], `${key} is required`);
  assert(/^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID) && /^[a-f0-9-]{36}$/.test(env.D1_DATABASE_ID), "Invalid Cloudflare target identity");
  const schema = identifier(env.D1_SOURCE_SCHEMA ?? "public"), metadata = schemaMetadata(), query = remote(env);
  const source = await sourceClient(env);
  try {
    return await source.begin("isolation level repeatable read read only", async tx => {
      const [{ count: guards }] = await tx.unsafe(`SELECT count(*)::text count FROM ${schema}.backend_guards`); assert.equal(Number(guards), 0, "Source has unresolved mutation guards");
      const known = new Set([...metadata.all, "auth_person_links", "meawketting_migrations"]);
      const tables = await tx`SELECT table_name FROM information_schema.tables WHERE table_schema=${env.D1_SOURCE_SCHEMA ?? "public"} AND table_type='BASE TABLE'`;
      assert(tables.every(row => known.has(row.table_name)), "Source has an unmapped application table");
      const { sql, manifest } = await sourceManifest(tx, env, metadata);
      if (manifest.media_objects.count) assert(env.D1_R2_BUCKET && env.D1_SOURCE_STORAGE_KEY, "Existing media cannot cut over without private R2");
      const sourceHash = checksum(JSON.stringify({ schema: metadata.schemaHash, manifest }));
      const [control] = await query([{ sql: "SELECT name FROM sqlite_schema WHERE type='table' AND name='d1_transfer_progress'" }]);
      if (control.length) {
        const [rows] = await query([{ sql: "SELECT source_hash,state FROM d1_transfer_progress WHERE id=1" }]);
        assert(rows.length === 1 && rows[0].source_hash === sourceHash && rows[0].state === "importing", "Nonempty target does not match this frozen source; fix forward");
      } else {
        for (const table of metadata.all) {
          const [rows] = await query([{ sql: `SELECT count(*) n FROM ${identifier(table)}` }]); assert.equal(rows[0].n, 0, "Refusing nonempty target without a matching transfer marker");
        }
        await query([{ sql: "CREATE TABLE d1_transfer_progress(id INTEGER PRIMARY KEY CHECK(id=1),source_hash TEXT NOT NULL,state TEXT NOT NULL) STRICT" },
          { sql: "INSERT INTO d1_transfer_progress(id,source_hash,state) VALUES(1,?,'importing')", params: [sourceHash] }]);
      }
      // Creation-time guards reject valid terminal historical rows. Only this undeployed,
      // frozen import suspends them; STRICT checks and scoped foreign keys remain enforced.
      const objectKeys = new Map();
      try {
        await query(metadata.triggers.map(trigger => ({ sql: `DROP TRIGGER IF EXISTS ${identifier(trigger.name)}` })));
        for (const table of metadata.ordered) {
          const columns = metadata.columns.get(table); let batch = [];
          for await (const row of sourceRows(tx, sql.get(table), table, columns)) {
            if (table === "media_objects") { const prior = row.object_path; row.object_path = await copyMedia(env, row); objectKeys.set(prior, row.object_path); }
            batch.push(insertStatement(table, columns, row));
            if (batch.length === 30) { await query(batch); batch = []; }
          }
          if (batch.length) await query(batch);
          console.log(JSON.stringify({ table, rows: manifest[table].count }));
        }
        for (const [previous, key] of objectKeys) await query([{ sql: "UPDATE passport_profiles SET photo_object_key=? WHERE photo_object_key=?", params: [key, previous] }]);
      } finally {
        await query(metadata.triggers.map(trigger => ({ sql: trigger.sql.replace("CREATE TRIGGER ", "CREATE TRIGGER IF NOT EXISTS ") })));
      }
      const [orphans] = await query([{ sql: "PRAGMA foreign_key_check" }]); assert.equal(orphans.length, 0, "D1 foreign-key orphans remain");
      for (const table of metadata.ordered) {
        // Media path rewrites are verified separately by streamed byte hashes.
        const expected = table === "media_objects" || (table === "passport_profiles" && objectKeys.size) ? await summarize((async function* () {
          for await (const row of sourceRows(tx, sql.get(table), table, metadata.columns.get(table))) {
            if (table === "media_objects") row.object_path = objectKeys.get(row.object_path);
            if (table === "passport_profiles" && row.photo_object_key) row.photo_object_key = objectKeys.get(row.photo_object_key) ?? row.photo_object_key;
            yield row;
          }
        })()) : manifest[table];
        assert.deepEqual(await summarize(targetRows(query, table, metadata.columns.get(table))), expected, `D1 row-count/content verification failed for ${table}`);
      }
      const aggregates = [
        "SELECT business_id,branch_id,status,count(*) n FROM bookings GROUP BY business_id,branch_id,status ORDER BY business_id,branch_id,status",
        "SELECT business_id,status,count(*) n FROM customers GROUP BY business_id,status ORDER BY business_id,status",
        "SELECT business_id,status,count(*) n FROM business_pet_profiles GROUP BY business_id,status ORDER BY business_id,status",
        "SELECT r.business_id,r.branch_id,count(*) n,sum(r.units) units FROM booking_resource_reservations r JOIN bookings b ON b.business_id=r.business_id AND b.branch_id=r.branch_id AND b.id=r.booking_id WHERE b.status<>'cancelled' GROUP BY r.business_id,r.branch_id ORDER BY r.business_id,r.branch_id",
        "SELECT business_id,branch_id,status,count(*) n FROM service_executions WHERE module='hotel' AND status IN ('checked-in','in-stay','ready-for-checkout') GROUP BY business_id,branch_id,status ORDER BY business_id,branch_id,status",
        "SELECT business_id,branch_id,sum(amount_minor) amount_minor,count(*) n FROM payments GROUP BY business_id,branch_id ORDER BY business_id,branch_id",
        "SELECT business_id,branch_id,sum(amount_minor) amount_minor,count(*) n FROM payment_refunds GROUP BY business_id,branch_id ORDER BY business_id,branch_id",
        "SELECT business_id,branch_id,sum(amount_minor) amount_minor,count(*) n FROM charge_items GROUP BY business_id,branch_id ORDER BY business_id,branch_id",
        "SELECT business_id,branch_id,sum(amount_minor) amount_minor,count(*) n FROM payment_allocations GROUP BY business_id,branch_id ORDER BY business_id,branch_id",
        "SELECT business_id,branch_id,sum(amount_minor) amount_minor,count(*) n FROM refund_allocations GROUP BY business_id,branch_id ORDER BY business_id,branch_id",
        "SELECT business_id,branch_id,state,count(*) n FROM message_outbox GROUP BY business_id,branch_id,state ORDER BY business_id,branch_id,state",
        "SELECT business_id,branch_id,state,count(*) n FROM channel_webhook_events GROUP BY business_id,branch_id,state ORDER BY business_id,branch_id,state",
        `WITH amounts AS (SELECT c.business_id,c.branch_id,c.cancelled_at,
          coalesce((SELECT sum(amount_minor) FROM charge_items i WHERE i.business_id=c.business_id AND i.branch_id=c.branch_id AND i.charge_id=c.id),0) invoice_total,
          coalesce((SELECT sum(amount_minor) FROM payment_allocations p WHERE p.business_id=c.business_id AND p.branch_id=c.branch_id AND p.charge_id=c.id),0) paid_total,
          coalesce((SELECT sum(amount_minor) FROM refund_allocations r WHERE r.business_id=c.business_id AND r.branch_id=c.branch_id AND r.charge_id=c.id),0) refunded_total FROM charges c)
          SELECT business_id,branch_id,sum(invoice_total) invoice_total,sum(paid_total) paid_total,sum(refunded_total) refunded_total,
          sum(CASE WHEN cancelled_at IS NULL THEN invoice_total-paid_total+refunded_total ELSE 0 END) outstanding_total FROM amounts GROUP BY business_id,branch_id ORDER BY business_id,branch_id`,
      ];
      await tx.unsafe(`SET LOCAL search_path TO ${schema}`);
      for (const aggregate of aggregates) {
        const original = await tx.unsafe(aggregate), [target] = await query([{ sql: aggregate }]);
        const normalized = rows => rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, (["n", "amount_minor", "units"].includes(key) || key.endsWith("_total")) && value !== null ? Number(value) : value])));
        assert.deepEqual(normalized(target), normalized(original), "D1 scoped financial/booking/LINE aggregate differs from source");
      }
      await query([{ sql: "UPDATE d1_transfer_progress SET state='verified' WHERE id=1" }]);
      return { verified: true, sourceHash, tables: Object.fromEntries(Object.entries(manifest).map(([table, value]) => [table, value.count])), foreignKeyOrphans: 0, mediaObjects: objectKeys.size };
    });
  } finally { await source.end({ timeout: 5 }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await (process.argv.includes("--inspect-source") ? inspectSource() : transfer()), null, 2)); }
  catch { console.error(process.argv.includes("--inspect-source") ? "Read-only source inspection stopped. No source data was changed." : "D1 transfer stopped. Keep the cutover write freeze active, restore any unavailable D1 guards, and fix forward before retrying. No source data was changed."); process.exitCode = 1; }
}
