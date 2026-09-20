import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { TestSql, TestPostgres, migrate } from "./postgresTestKit";
import test from "node:test";
import { Be2Application } from "../app/_backend/be2/application.ts";
import { PostgresBe2Repository } from "../app/_backend/be2/postgresRepository.ts";
import { PostgresBe1Repository } from "../app/_backend/be1/postgresRepository.ts";
import { Be1Error } from "../app/_backend/be1/errors.ts";
import type { RequestMetadata } from "../app/_backend/be1/metadata.ts";

const projectRoot = resolve(import.meta.dirname, "..");
const be1Seed = readFileSync(resolve(projectRoot, "supabase", "seed-be1-dev.sql"), "utf8");
const be2Seed = readFileSync(resolve(projectRoot, "supabase", "seed-be2-dev.sql"), "utf8");

const OWNER = "prs_01k47meawketting000000001";
const MANAGER = "prs_01k47meawketting000000002";
const STAFF = "prs_01k47meawketting000000003";
const INACTIVE_MEMBER = "prs_01k47meawketting000000004";
const OUTSIDER = "prs_01k47meawketting000000005";
const WHISKER = "business-whisker-rest";
const PAW = "business-paw-partner";

function fixture(file?: string) {
  const inspect = new TestSql(file ?? ":memory:");
  migrate(inspect);
  inspect.exec(be1Seed);
  inspect.exec(be2Seed);
  const database = new TestPostgres(inspect);
  const authorizationRepository = new PostgresBe1Repository(database);
  const repository = new PostgresBe2Repository(database);
  let timeSequence = 0;
  let idSequence = 0;
  const application = new Be2Application(authorizationRepository, repository, {
    now: () => `2026-09-07T01:${String(timeSequence++).padStart(2, "0")}:00.000Z`,
    id: (prefix) => `${prefix}_01k47be2test${String(idSequence++).padStart(12, "0")}`,
  });
  return { inspect, database, authorizationRepository, repository, application };
}

function metadata(correlationId = "corr-be2-test-0001"): RequestMetadata {
  return {
    requestId: `req-${correlationId}`,
    correlationId,
    receivedAt: "2026-09-07T00:59:59.000Z",
  };
}

async function actor(application: Be2Application, personId = OWNER) {
  return application.resolvePerson(personId);
}

function hasCode(code: Be1Error["code"]) {
  return (error: unknown) => error instanceof Be1Error && error.code === code;
}

test("seeded Customer/Pet directory is Business-wide, searchable, and paginated", async () => {
  const { inspect, application } = fixture();
  try {
    const owner = await actor(application);
    const all = await application.listCustomers(owner, { businessId: WHISKER, limit: 100 });
    assert.equal(all.total, 2);
    assert.deepEqual(all.items.map((customer) => customer.id), ["booking-contact-nalin", "booking-contact-pim"]);
    assert.deepEqual(all.items[0]?.pets.map((pet) => pet.id), ["booking-pet-mochi", "booking-pet-milo", "booking-pet-biscuit"]);

    const byName = await application.searchCustomers(owner, { businessId: WHISKER, query: "นลิน" });
    assert.deepEqual(byName.items.map((customer) => customer.id), ["booking-contact-nalin"]);
    const byPhone = await application.searchCustomers(owner, { businessId: WHISKER, query: "555-0142" });
    assert.deepEqual(byPhone.items.map((customer) => customer.id), ["booking-contact-nalin"]);
    const byPet = await application.searchCustomers(owner, { businessId: WHISKER, query: "LUNA" });
    assert.deepEqual(byPet.items.map((customer) => customer.id), ["booking-contact-pim"]);
    const first = await application.listCustomers(owner, { businessId: WHISKER, limit: 1, offset: 0 });
    const second = await application.listCustomers(owner, { businessId: WHISKER, limit: 1, offset: 1 });
    assert.equal(first.total, 2);
    assert.equal(second.total, 2);
    assert.notEqual(first.items[0]?.id, second.items[0]?.id);

    // Branch is deliberately absent from the identity query. Both Whisker
    // Branch contexts reference this exact Business-level directory.
    assert.equal(inspect.prepare("SELECT COUNT(*) AS count FROM customers WHERE business_id = ?").get(WHISKER)?.count, 2);
  } finally {
    inspect.close();
  }
});

test("Customer create/read/update notes/tags/lifecycle is durable and duplicate warnings never merge", async () => {
  const { inspect, application } = fixture();
  try {
    const owner = await actor(application);
    const createdResult = await application.createCustomer(owner, {
      businessId: WHISKER,
      displayName: "คุณดาว",
      phone: "081 222 3344",
      email: "DAO@EXAMPLE.TEST",
      businessNotes: "โทรหลังเที่ยง",
      tags: [" VIP ", "vip", "Hotel"],
    }, metadata("corr-customer-create"));
    assert.equal(createdResult.outcome, "created");
    if (createdResult.outcome !== "created") return;
    const created = createdResult.customer;
    assert.match(created.id, /^cus_/);
    assert.equal(created.email, "dao@example.test");
    assert.deepEqual(created.tags, ["VIP", "Hotel"]);
    assert.equal((await application.getCustomer(owner, WHISKER, created.id)).businessNotes, "โทรหลังเที่ยง");

    const warned = await application.createCustomer(owner, {
      businessId: WHISKER,
      displayName: "คุณดาวอีกคน",
      phone: "081-222-3344",
      email: null,
      businessNotes: "",
    }, metadata("corr-customer-duplicate"));
    assert.equal(warned.outcome, "duplicate-warning");
    assert.equal(inspect.prepare("SELECT COUNT(*) AS count FROM customers WHERE business_id = ? AND phone_key = ?").get(WHISKER, "0812223344")?.count, 1);

    const allowed = await application.createCustomer(owner, {
      businessId: WHISKER,
      displayName: "คุณดาวอีกคน",
      phone: "081-222-3344",
      email: null,
      businessNotes: "",
      allowPotentialDuplicate: true,
    }, metadata("corr-customer-duplicate-allowed"));
    assert.equal(allowed.outcome, "created");
    if (allowed.outcome !== "created") return;
    assert.notEqual(allowed.customer.id, created.id);
    assert.equal(inspect.prepare("SELECT COUNT(*) AS count FROM customers WHERE business_id = ? AND phone_key = ?").get(WHISKER, "0812223344")?.count, 2);

    const updated = await application.updateCustomer(owner, {
      businessId: WHISKER,
      customerId: created.id,
      displayName: "คุณดาวเหนือ",
      phone: "081-222-3344",
      email: "north@example.test",
      businessNotes: "ข้อมูลใหม่",
    }, metadata("corr-customer-update"));
    assert.equal(updated.displayName, "คุณดาวเหนือ");
    const notes = await application.updateCustomerNotes(owner, {
      businessId: WHISKER,
      customerId: created.id,
      businessNotes: "หมายเหตุทีมเท่านั้น",
    }, metadata("corr-customer-notes"));
    assert.equal(notes.businessNotes, "หมายเหตุทีมเท่านั้น");
    const tags = await application.updateCustomerTags(owner, {
      businessId: WHISKER,
      customerId: created.id,
      tags: ["Daycare", "DAYCARE", "ติดตาม"],
    }, metadata("corr-customer-tags"));
    assert.deepEqual(tags.tags, ["Daycare", "ติดตาม"]);

    assert.equal((await application.setCustomerActive(owner, WHISKER, created.id, false, metadata("corr-customer-off"))).status, "inactive");
    assert.equal((await application.setCustomerActive(owner, WHISKER, allowed.customer.id, false, metadata("corr-customer-duplicate-off"))).status, "inactive");
    const inactiveWarning = await application.createCustomer(owner, {
      businessId: WHISKER,
      displayName: "คุณดาวคืนรายการ",
      phone: "081-222-3344",
      email: null,
      businessNotes: "",
    }, metadata("corr-customer-inactive-duplicate"));
    assert.equal(inactiveWarning.outcome, "duplicate-warning", "inactive identities remain duplicate candidates rather than being silently recreated");
    assert.equal((await application.listCustomers(owner, { businessId: WHISKER, limit: 100 })).items.some((item) => item.id === created.id), false);
    assert.equal((await application.listCustomers(owner, { businessId: WHISKER, includeInactive: true, limit: 100 })).items.some((item) => item.id === created.id), true);
    assert.equal((await application.setCustomerActive(owner, WHISKER, created.id, true, metadata("corr-customer-on"))).status, "active");
  } finally {
    inspect.close();
  }
});

test("Pet profiles, multiple Pets, duplicate warnings, and neutral contact relationships persist independently", async () => {
  const { inspect, application } = fixture();
  try {
    const owner = await actor(application);
    const created = await application.createPet(owner, {
      businessId: WHISKER,
      customerId: "booking-contact-pim",
      name: "Kiwi",
      species: "cat",
      businessNotes: "กลัวเสียงดัง",
    }, metadata("corr-pet-create"));
    assert.equal(created.outcome, "created");
    if (created.outcome !== "created") return;
    assert.match(created.pet.id, /^pet_/);
    assert.equal(created.pet.profileSource, "business-local");
    assert.ok(created.customer.pets.some((pet) => pet.id === created.pet.id));

    const warning = await application.createPet(owner, {
      businessId: WHISKER,
      customerId: "booking-contact-nalin",
      name: " kiwi ",
      species: "cat",
      businessNotes: "",
    }, metadata("corr-pet-duplicate"));
    assert.equal(warning.outcome, "duplicate-warning");
    assert.equal(inspect.prepare("SELECT COUNT(*) AS count FROM business_pet_profiles WHERE business_id = ? AND name_key = 'kiwi'").get(WHISKER)?.count, 1);

    const second = await application.createPet(owner, {
      businessId: WHISKER,
      customerId: "booking-contact-pim",
      name: "Pepper",
      species: "dog",
      businessNotes: "",
    }, metadata("corr-pet-second"));
    assert.equal(second.outcome, "created");
    if (second.outcome !== "created") return;
    const pim = await application.getCustomer(owner, WHISKER, "booking-contact-pim");
    assert.ok(pim.pets.length >= 4, "one Customer keeps multiple durable Pet relationships");

    const updated = await application.updatePet(owner, {
      businessId: WHISKER,
      petId: created.pet.id,
      name: "Kiwi Bean",
      species: "cat",
      businessNotes: "ใช้ผ้าคลุมกรง",
    }, metadata("corr-pet-update"));
    assert.equal(updated.name, "Kiwi Bean");
    assert.equal(updated.businessNotes, "ใช้ผ้าคลุมกรง");

    const linked = await application.linkCustomerPet(owner, {
      businessId: WHISKER,
      customerId: "booking-contact-nalin",
      petId: created.pet.id,
    }, metadata("corr-pet-link"));
    assert.ok(linked.pets.some((pet) => pet.id === created.pet.id));
    assert.deepEqual((await application.getPet(owner, WHISKER, created.pet.id)).customerIds.sort(), ["booking-contact-nalin", "booking-contact-pim"]);

    const unlinked = await application.unlinkCustomerPet(owner, {
      businessId: WHISKER,
      customerId: "booking-contact-nalin",
      petId: created.pet.id,
    }, metadata("corr-pet-unlink"));
    assert.equal(unlinked.pets.some((pet) => pet.id === created.pet.id), false);
    assert.equal((await application.getPet(owner, WHISKER, created.pet.id)).name, "Kiwi Bean", "unlink never deletes Pet identity/profile");

    assert.equal((await application.setPetActive(owner, WHISKER, second.pet.id, false, metadata("corr-pet-off"))).status, "inactive");
    assert.equal((await application.getCustomer(owner, WHISKER, "booking-contact-pim")).pets.some((pet) => pet.id === second.pet.id), false);
    const inactivePetWarning = await application.createPet(owner, {
      businessId: WHISKER,
      customerId: "booking-contact-nalin",
      name: "Pepper",
      species: "dog",
      businessNotes: "",
    }, metadata("corr-pet-inactive-duplicate"));
    assert.equal(inactivePetWarning.outcome, "duplicate-warning", "inactive Pet profiles remain duplicate candidates");
    assert.equal((await application.setPetActive(owner, WHISKER, second.pet.id, true, metadata("corr-pet-on"))).status, "active");
  } finally {
    inspect.close();
  }
});

test("server authorization denies wrong Business, spoofed IDs, inactive membership, and cross-tenant links", async () => {
  const { inspect, application } = fixture();
  try {
    const owner = await actor(application);
    await assert.rejects(application.getCustomer(owner, PAW, "booking-contact-nalin"), hasCode("NOT_FOUND"));
    await assert.rejects(application.getCustomer(owner, WHISKER, "cus_spoofed_0000000001"), hasCode("NOT_FOUND"));
    await assert.rejects(application.getPet(owner, WHISKER, "booking-pet-pudding"), hasCode("NOT_FOUND"));
    await assert.rejects(application.linkCustomerPet(owner, {
      businessId: WHISKER,
      customerId: "booking-contact-nalin",
      petId: "booking-pet-pudding",
    }, metadata()), hasCode("NOT_FOUND"));

    const inactive = await actor(application, INACTIVE_MEMBER);
    await assert.rejects(application.listCustomers(inactive, { businessId: PAW }), hasCode("MEMBERSHIP_INACTIVE"));
    const outsider = await actor(application, OUTSIDER);
    await assert.rejects(application.listCustomers(outsider, { businessId: WHISKER }), hasCode("FORBIDDEN"));
  } finally {
    inspect.close();
  }
});

test("active OWNER, MANAGER, and STAFF reuse the BE1 membership policy without Branch-fragmenting identities", async () => {
  const { inspect, application } = fixture();
  try {
    const manager = await actor(application, MANAGER);
    const staff = await actor(application, STAFF);
    assert.equal((await application.listCustomers(manager, { businessId: WHISKER })).total, 2);
    assert.equal((await application.listCustomers(staff, { businessId: WHISKER })).total, 2);

    const managerCreate = await application.createCustomer(manager, {
      businessId: WHISKER,
      displayName: "ลูกค้าผู้จัดการ",
      phone: null,
      email: null,
      businessNotes: "",
    }, metadata("corr-manager-create"));
    assert.equal(managerCreate.outcome, "created");
    if (managerCreate.outcome !== "created") return;
    const staffUpdate = await application.updateCustomerTags(staff, {
      businessId: WHISKER,
      customerId: managerCreate.customer.id,
      tags: ["Front desk"],
    }, metadata("corr-staff-update"));
    assert.deepEqual(staffUpdate.tags, ["Front desk"]);
  } finally {
    inspect.close();
  }
});

test("relational constraints enforce lifecycle, profile vocabulary, and cross-Business relationship scope", () => {
  const { inspect } = fixture();
  try {
    assert.throws(() => inspect.prepare(`
      INSERT INTO business_pet_profiles (
        business_id, pet_id, name, name_key, species, profile_source, business_notes, status,
        created_at, updated_at
      ) VALUES (?, ?, 'Bad', 'bad', 'bird', 'business-local', '', 'active', ?, ?)
    `).run(WHISKER, "booking-pet-mochi", "2026-09-07T01:00:00.000Z", "2026-09-07T01:00:00.000Z"), /check constraint/i);
    assert.throws(() => inspect.prepare("UPDATE customers SET status = 'deleted' WHERE id = ?").run("booking-contact-nalin"), /check constraint/i);
    assert.throws(() => inspect.prepare(`
      INSERT INTO customer_pet_relationships (
        id, business_id, customer_id, pet_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).run(
      "cpr_cross_business_000001",
      WHISKER,
      "booking-contact-nalin",
      "booking-pet-pudding",
      "2026-09-07T01:00:00.000Z",
      "2026-09-07T01:00:00.000Z",
    ), /FOREIGN KEY constraint/i);
    assert.throws(() => inspect.prepare(`
      INSERT INTO customer_pet_relationships (
        id, business_id, customer_id, pet_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).run(
      "cpr_duplicate_relation_0001",
      WHISKER,
      "booking-contact-nalin",
      "booking-pet-mochi",
      "2026-09-07T01:00:00.000Z",
      "2026-09-07T01:00:00.000Z",
    ), /unique constraint/i);
    assert.deepEqual(inspect.prepare("SELECT conname FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND contype='f' AND NOT convalidated").all(), []);
    assert.equal(inspect.prepare("SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND NOT convalidated) THEN 'ok' ELSE 'invalid' END integrity_check").get()?.integrity_check, "ok");

    const petColumns = new Set(inspect.prepare("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='pets'").all().map((row) => row.name));
    assert.deepEqual([...petColumns].sort(), ["created_at", "created_by_person_id", "id"]);
    for (const forbidden of ["business_id", "owner_id", "guardian_id", "passport_id", "consent_id"]) assert.equal(petColumns.has(forbidden), false);
  } finally {
    inspect.close();
  }
});

test("BE2 audit events retain actor/correlation/target metadata without copying contact or notes", async () => {
  const { inspect, application } = fixture();
  try {
    const owner = await actor(application);
    const result = await application.createCustomer(owner, {
      businessId: WHISKER,
      displayName: "SENSITIVE CUSTOMER NAME",
      phone: "099-SECRET-1122",
      email: "sensitive@example.test",
      businessNotes: "PRIVATE CUSTOMER NOTE",
      tags: ["PRIVATE TAG"],
    }, metadata("corr-audit-minimized"));
    assert.equal(result.outcome, "created");
    const rows = inspect.prepare(`
      SELECT actor_person_id, actor_membership_id, business_id, branch_id, request_id,
             correlation_id, action, target_type, target_id, before_json, after_json
      FROM audit_events
      WHERE correlation_id = ?
    `).all("corr-audit-minimized");
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.actor_person_id, OWNER);
    assert.equal(rows[0]?.business_id, WHISKER);
    assert.equal(rows[0]?.branch_id, null);
    assert.equal(rows[0]?.action, "customer.created");
    const serialized = JSON.stringify(rows);
    for (const sensitive of ["SENSITIVE CUSTOMER NAME", "099-SECRET-1122", "sensitive@example.test", "PRIVATE CUSTOMER NOTE", "PRIVATE TAG"]) {
      assert.equal(serialized.includes(sensitive), false);
    }
    assert.match(String(rows[0]?.after_json), /"hasPhone":true/);
  } finally {
    inspect.close();
  }
});

test("migration-backed Customer/Pet writes survive database reopen", async () => {
  const directory = mkdtempSync(join(tmpdir(), "meawketting-be2-"));
  const databasePath = join(directory, "be2.inspect");
  try {
    const first = fixture(databasePath);
    const owner = await actor(first.application);
    const customerResult = await first.application.createCustomer(owner, {
      businessId: WHISKER,
      displayName: "ลูกค้าคงทน",
      phone: "080-000-0001",
      email: null,
      businessNotes: "durable",
    }, metadata("corr-durable-customer"));
    assert.equal(customerResult.outcome, "created");
    if (customerResult.outcome !== "created") return;
    const petResult = await first.application.createPet(owner, {
      businessId: WHISKER,
      customerId: customerResult.customer.id,
      name: "Durable Cat",
      species: "cat",
      businessNotes: "durable pet",
    }, metadata("corr-durable-pet"));
    assert.equal(petResult.outcome, "created");
    if (petResult.outcome !== "created") return;
    first.inspect.close();

    const reopened = new TestSql(databasePath);
    reopened.close();
    const database = new TestPostgres(reopened);
    const application = new Be2Application(new PostgresBe1Repository(database), new PostgresBe2Repository(database));
    const reopenedOwner = await actor(application);
    const durable = await application.getCustomer(reopenedOwner, WHISKER, customerResult.customer.id);
    assert.equal(durable.displayName, "ลูกค้าคงทน");
    assert.deepEqual(durable.pets.map((pet) => pet.id), [petResult.pet.id]);
    reopened.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
