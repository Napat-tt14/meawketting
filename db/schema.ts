import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const lifecycle = (column: ReturnType<typeof text>) =>
  check(`ck_${column.name}_lifecycle`, sql`${column} in ('active', 'inactive')`);

export const persons = sqliteTable("persons", {
  id: text("id").primaryKey().notNull(),
  displayName: text("display_name").notNull(),
  primaryEmail: text("primary_email"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("uq_persons_primary_email").on(table.primaryEmail),
  check("ck_persons_id", sql`length(${table.id}) >= 16`),
  check("ck_persons_display_name", sql`length(trim(${table.displayName})) between 1 and 120`),
  lifecycle(table.status),
]);

export const businesses = sqliteTable("businesses", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  contactName: text("contact_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  description: text("description").notNull().default(""),
  address: text("address").notNull().default(""),
  logoUrl: text("logo_url"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  check("ck_businesses_id", sql`length(${table.id}) >= 16`),
  check("ck_businesses_name", sql`length(trim(${table.name})) between 1 and 160`),
  lifecycle(table.status),
]);

export const branches = sqliteTable("branches", {
  id: text("id").primaryKey().notNull(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull(),
  area: text("area").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  timezone: text("timezone").notNull().default("Asia/Bangkok"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  uniqueIndex("uq_branches_business_name_key").on(table.businessId, table.nameKey),
  uniqueIndex("uq_branches_business_id_id").on(table.businessId, table.id),
  index("idx_branches_business_status").on(table.businessId, table.status),
  check("ck_branches_id", sql`length(${table.id}) >= 8`),
  check("ck_branches_name", sql`length(trim(${table.name})) between 1 and 160`),
  lifecycle(table.status),
]);

export const branchEnabledModules = sqliteTable("branch_enabled_modules", {
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  module: text("module").notNull(),
  createdAt: text("created_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  primaryKey({ columns: [table.branchId, table.module], name: "pk_branch_enabled_modules" }),
  foreignKey({
    name: "fk_branch_enabled_modules_branch_scope",
    columns: [table.businessId, table.branchId],
    foreignColumns: [branches.businessId, branches.id],
  }).onDelete("restrict"),
  index("idx_branch_enabled_modules_business_branch").on(table.businessId, table.branchId),
  check("ck_branch_enabled_modules_module", sql`${table.module} in ('grooming', 'hotel', 'daycare')`),
]);

export const branchOperatingHours = sqliteTable("branch_operating_hours", {
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  weekday: text("weekday").notNull(),
  closed: integer("closed", { mode: "boolean" }).notNull().default(false),
  opensAt: text("opens_at").notNull(),
  closesAt: text("closes_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  primaryKey({ columns: [table.branchId, table.weekday], name: "pk_branch_operating_hours" }),
  foreignKey({
    name: "fk_branch_operating_hours_branch_scope",
    columns: [table.businessId, table.branchId],
    foreignColumns: [branches.businessId, branches.id],
  }).onDelete("restrict"),
  index("idx_branch_operating_hours_business_branch").on(table.businessId, table.branchId),
  check("ck_branch_operating_hours_weekday", sql`${table.weekday} in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')`),
  check("ck_branch_operating_hours_closed", sql`${table.closed} in (0, 1)`),
  check("ck_branch_operating_hours_range", sql`${table.closed} = 1 or ${table.opensAt} < ${table.closesAt}`),
]);

export const businessMemberships = sqliteTable("business_memberships", {
  id: text("id").primaryKey().notNull(),
  personId: text("person_id").notNull().references(() => persons.id, { onDelete: "restrict" }),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  role: text("role").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  uniqueIndex("uq_business_memberships_person_business").on(table.personId, table.businessId),
  uniqueIndex("uq_business_memberships_id_business").on(table.id, table.businessId),
  index("idx_business_memberships_person_status").on(table.personId, table.status),
  index("idx_business_memberships_business_status").on(table.businessId, table.status),
  check("ck_business_memberships_id", sql`length(${table.id}) >= 16`),
  check("ck_business_memberships_role", sql`${table.role} in ('OWNER', 'MANAGER', 'STAFF')`),
  lifecycle(table.status),
]);

export const membershipBranchAccess = sqliteTable("membership_branch_access", {
  membershipId: text("membership_id").notNull(),
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  primaryKey({ columns: [table.membershipId, table.branchId], name: "pk_membership_branch_access" }),
  foreignKey({
    name: "fk_membership_branch_access_membership_scope",
    columns: [table.membershipId, table.businessId],
    foreignColumns: [businessMemberships.id, businessMemberships.businessId],
  }).onDelete("restrict"),
  foreignKey({
    name: "fk_membership_branch_access_branch_scope",
    columns: [table.businessId, table.branchId],
    foreignColumns: [branches.businessId, branches.id],
  }).onDelete("restrict"),
  index("idx_membership_branch_access_membership_status").on(table.membershipId, table.status),
  index("idx_membership_branch_access_business_branch").on(table.businessId, table.branchId),
  lifecycle(table.status),
]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey().notNull(),
  actorPersonId: text("actor_person_id").notNull().references(() => persons.id, { onDelete: "restrict" }),
  actorMembershipId: text("actor_membership_id").notNull().references(() => businessMemberships.id, { onDelete: "restrict" }),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  branchId: text("branch_id"),
  requestId: text("request_id").notNull(),
  correlationId: text("correlation_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  occurredAt: text("occurred_at").notNull(),
}, (table) => [
  foreignKey({
    name: "fk_audit_events_branch_scope",
    columns: [table.businessId, table.branchId],
    foreignColumns: [branches.businessId, branches.id],
  }).onDelete("restrict"),
  index("idx_audit_events_business_time").on(table.businessId, table.occurredAt),
  index("idx_audit_events_branch_time").on(table.branchId, table.occurredAt),
  index("idx_audit_events_correlation").on(table.correlationId),
  check("ck_audit_events_id", sql`length(${table.id}) >= 16`),
  check("ck_audit_events_action", sql`length(trim(${table.action})) between 1 and 120`),
]);

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey().notNull(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  displayName: text("display_name").notNull(),
  displayNameKey: text("display_name_key").notNull(),
  phone: text("phone"),
  phoneKey: text("phone_key"),
  email: text("email"),
  businessNotes: text("business_notes").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  uniqueIndex("uq_customers_business_id_id").on(table.businessId, table.id),
  index("idx_customers_business_status_name").on(table.businessId, table.status, table.displayNameKey, table.id),
  index("idx_customers_business_phone_key").on(table.businessId, table.phoneKey),
  check("ck_customers_id", sql`length(${table.id}) >= 16`),
  check("ck_customers_display_name", sql`length(trim(${table.displayName})) between 1 and 120`),
  check("ck_customers_display_name_key", sql`length(trim(${table.displayNameKey})) between 1 and 120`),
  check("ck_customers_phone", sql`${table.phone} is null or length(${table.phone}) between 1 and 40`),
  check("ck_customers_phone_key", sql`${table.phoneKey} is null or length(${table.phoneKey}) between 1 and 40`),
  check("ck_customers_email", sql`${table.email} is null or length(${table.email}) between 3 and 254`),
  check("ck_customers_business_notes", sql`length(${table.businessNotes}) <= 4000`),
  lifecycle(table.status),
]);

export const pets = sqliteTable("pets", {
  id: text("id").primaryKey().notNull(),
  createdAt: text("created_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  // Preserve stable opaque IDs already used by the frozen prototype fixtures.
  // `booking-pet-leo` is 15 characters; identity stability is more important
  // than imposing an arbitrary minimum that would reject an existing ID.
  check("ck_pets_id", sql`length(${table.id}) >= 8`),
]);

/** Business-local mutable profile for an opaque shared Pet identity. */
export const businessPetProfiles = sqliteTable("business_pet_profiles", {
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  petId: text("pet_id").notNull().references(() => pets.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull(),
  species: text("species").notNull(),
  profileSource: text("profile_source").notNull().default("business-local"),
  businessNotes: text("business_notes").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  primaryKey({ columns: [table.businessId, table.petId], name: "pk_business_pet_profiles" }),
  index("idx_business_pet_profiles_business_status_name").on(table.businessId, table.status, table.nameKey, table.petId),
  index("idx_business_pet_profiles_business_name_species").on(table.businessId, table.nameKey, table.species, table.petId),
  check("ck_business_pet_profiles_name", sql`length(trim(${table.name})) between 1 and 120`),
  check("ck_business_pet_profiles_name_key", sql`length(trim(${table.nameKey})) between 1 and 120`),
  check("ck_business_pet_profiles_species", sql`${table.species} in ('cat', 'dog')`),
  check("ck_business_pet_profiles_source", sql`${table.profileSource} in ('business-local', 'customer-reported')`),
  check("ck_business_pet_profiles_notes", sql`length(${table.businessNotes}) <= 4000`),
  lifecycle(table.status),
]);

export const customerTags = sqliteTable("customer_tags", {
  businessId: text("business_id").notNull(),
  customerId: text("customer_id").notNull(),
  tagKey: text("tag_key").notNull(),
  label: text("label").notNull(),
  position: integer("position").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  primaryKey({ columns: [table.businessId, table.customerId, table.tagKey], name: "pk_customer_tags" }),
  foreignKey({
    name: "fk_customer_tags_customer_scope",
    columns: [table.businessId, table.customerId],
    foreignColumns: [customers.businessId, customers.id],
  }).onDelete("restrict"),
  index("idx_customer_tags_business_customer_position").on(table.businessId, table.customerId, table.position),
  check("ck_customer_tags_tag_key", sql`length(trim(${table.tagKey})) between 1 and 32`),
  check("ck_customer_tags_label", sql`length(trim(${table.label})) between 1 and 32`),
  check("ck_customer_tags_position", sql`${table.position} between 0 and 7`),
]);

/**
 * A Business-local contact association only. It does not represent legal
 * ownership, Guardian status, Passport authority, consent, or an access grant.
 */
export const customerPetRelationships = sqliteTable("customer_pet_relationships", {
  id: text("id").primaryKey().notNull(),
  businessId: text("business_id").notNull(),
  customerId: text("customer_id").notNull(),
  petId: text("pet_id").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  uniqueIndex("uq_customer_pet_relationships_scope").on(table.businessId, table.customerId, table.petId),
  uniqueIndex("uq_customer_pet_relationships_business_id").on(table.businessId, table.id),
  foreignKey({
    name: "fk_customer_pet_relationships_customer_scope",
    columns: [table.businessId, table.customerId],
    foreignColumns: [customers.businessId, customers.id],
  }).onDelete("restrict"),
  foreignKey({
    name: "fk_customer_pet_relationships_pet_scope",
    columns: [table.businessId, table.petId],
    foreignColumns: [businessPetProfiles.businessId, businessPetProfiles.petId],
  }).onDelete("restrict"),
  index("idx_customer_pet_relationships_customer_status").on(table.businessId, table.customerId, table.status),
  index("idx_customer_pet_relationships_pet_status").on(table.businessId, table.petId, table.status),
  check("ck_customer_pet_relationships_id", sql`length(${table.id}) >= 16`),
  lifecycle(table.status),
]);

/** BE3 planning service catalog. This is not service execution configuration. */
export const bookingServices = sqliteTable("booking_services", {
  id: text("id").primaryKey().notNull(),
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  module: text("module").notNull(),
  label: text("label").notNull(),
  timeModel: text("time_model").notNull(),
  defaultDurationMinutes: integer("default_duration_minutes"),
  estimate: integer("estimate"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  uniqueIndex("uq_booking_services_scope_id").on(table.businessId, table.branchId, table.id),
  foreignKey({
    name: "fk_booking_services_branch_scope",
    columns: [table.businessId, table.branchId],
    foreignColumns: [branches.businessId, branches.id],
  }).onDelete("restrict"),
  index("idx_booking_services_branch_status_module").on(table.businessId, table.branchId, table.status, table.module),
  check("ck_booking_services_id", sql`length(${table.id}) >= 8`),
  check("ck_booking_services_module", sql`${table.module} in ('grooming', 'hotel', 'daycare')`),
  check("ck_booking_services_time_model", sql`${table.timeModel} in ('appointment', 'date-range', 'day')`),
  check("ck_booking_services_label", sql`length(trim(${table.label})) between 1 and 160`),
  check("ck_booking_services_duration", sql`${table.defaultDurationMinutes} is null or ${table.defaultDurationMinutes} between 1 and 1440`),
  check("ck_booking_services_estimate", sql`${table.estimate} is null or ${table.estimate} between 0 and 1000000`),
  lifecycle(table.status),
]);

export const bookingServiceResourceRequirements = sqliteTable("booking_service_resource_requirements", {
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  serviceId: text("service_id").notNull(),
  resourceKind: text("resource_kind").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: text("created_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  primaryKey({ columns: [table.businessId, table.branchId, table.serviceId, table.resourceKind], name: "pk_booking_service_resource_requirements" }),
  foreignKey({
    name: "fk_booking_service_requirements_service_scope",
    columns: [table.businessId, table.branchId, table.serviceId],
    foreignColumns: [bookingServices.businessId, bookingServices.branchId, bookingServices.id],
  }).onDelete("restrict"),
  index("idx_booking_service_requirements_service_position").on(table.businessId, table.branchId, table.serviceId, table.position),
  check("ck_booking_service_requirements_kind", sql`${table.resourceKind} in ('groomer', 'grooming-station', 'dryer', 'hotel-room-type', 'daycare-zone')`),
]);

/** Minimal durable schedulable Resource projection; not Team/HR or Hotel room truth. */
export const bookingResources = sqliteTable("booking_resources", {
  id: text("id").primaryKey().notNull(),
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  module: text("module").notNull(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  capacityMode: text("capacity_mode").notNull(),
  capacity: integer("capacity").notNull(),
  compatibilityStaffId: text("compatibility_staff_id"),
  hotelRole: text("hotel_role"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  uniqueIndex("uq_booking_resources_scope_id").on(table.businessId, table.branchId, table.id),
  foreignKey({
    name: "fk_booking_resources_branch_scope",
    columns: [table.businessId, table.branchId],
    foreignColumns: [branches.businessId, branches.id],
  }).onDelete("restrict"),
  index("idx_booking_resources_branch_status_kind").on(table.businessId, table.branchId, table.status, table.kind),
  check("ck_booking_resources_id", sql`length(${table.id}) >= 8`),
  check("ck_booking_resources_module", sql`${table.module} in ('grooming', 'hotel', 'daycare')`),
  check("ck_booking_resources_kind", sql`${table.kind} in ('groomer', 'grooming-station', 'dryer', 'hotel-room-type', 'daycare-zone')`),
  check("ck_booking_resources_label", sql`length(trim(${table.label})) between 1 and 160`),
  check("ck_booking_resources_capacity_mode", sql`${table.capacityMode} in ('exclusive', 'capacity')`),
  check("ck_booking_resources_capacity", sql`${table.capacity} between 1 and 10000`),
  check("ck_booking_resources_hotel_role", sql`${table.hotelRole} is null or ${table.hotelRole} = 'planning-capacity'`),
  lifecycle(table.status),
]);

export const bookingResourceServiceLinks = sqliteTable("booking_resource_service_links", {
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  resourceId: text("resource_id").notNull(),
  serviceId: text("service_id").notNull(),
  createdAt: text("created_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  primaryKey({ columns: [table.businessId, table.branchId, table.resourceId, table.serviceId], name: "pk_booking_resource_service_links" }),
  foreignKey({
    name: "fk_booking_resource_links_resource_scope",
    columns: [table.businessId, table.branchId, table.resourceId],
    foreignColumns: [bookingResources.businessId, bookingResources.branchId, bookingResources.id],
  }).onDelete("restrict"),
  foreignKey({
    name: "fk_booking_resource_links_service_scope",
    columns: [table.businessId, table.branchId, table.serviceId],
    foreignColumns: [bookingServices.businessId, bookingServices.branchId, bookingServices.id],
  }).onDelete("restrict"),
  index("idx_booking_resource_links_service").on(table.businessId, table.branchId, table.serviceId, table.resourceId),
]);

export const bookingResourceAvailabilityWindows = sqliteTable("booking_resource_availability_windows", {
  id: text("id").primaryKey().notNull(),
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  resourceId: text("resource_id").notNull(),
  state: text("state").notNull(),
  startLocal: text("start_local").notNull(),
  endLocal: text("end_local").notNull(),
  startMinute: integer("start_minute").notNull(),
  endMinute: integer("end_minute").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  foreignKey({
    name: "fk_booking_resource_windows_resource_scope",
    columns: [table.businessId, table.branchId, table.resourceId],
    foreignColumns: [bookingResources.businessId, bookingResources.branchId, bookingResources.id],
  }).onDelete("restrict"),
  index("idx_booking_resource_windows_interval").on(table.businessId, table.branchId, table.resourceId, table.startMinute, table.endMinute),
  check("ck_booking_resource_windows_state", sql`${table.state} in ('working', 'unavailable', 'break', 'time-off')`),
  check("ck_booking_resource_windows_range", sql`${table.endMinute} > ${table.startMinute}`),
]);

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey().notNull(),
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  customerId: text("customer_id").notNull(),
  serviceId: text("service_id").notNull(),
  serviceModule: text("service_module").notNull(),
  timeModel: text("time_model").notNull(),
  startLocal: text("start_local").notNull(),
  endLocal: text("end_local"),
  startMinute: integer("start_minute").notNull(),
  endMinute: integer("end_minute").notNull(),
  startWeekday: text("start_weekday").notNull(),
  status: text("status").notNull().default("pending"),
  estimate: integer("estimate"),
  notes: text("notes").notNull().default(""),
  revision: integer("revision").notNull().default(1),
  writeToken: text("write_token").notNull(),
  idempotencyKey: text("idempotency_key"),
  createRequestHash: text("create_request_hash"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  cancelledAt: text("cancelled_at"),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  updatedByPersonId: text("updated_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
  cancelledByPersonId: text("cancelled_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  uniqueIndex("uq_bookings_scope_id").on(table.businessId, table.branchId, table.id),
  uniqueIndex("uq_bookings_business_idempotency").on(table.businessId, table.idempotencyKey),
  foreignKey({
    name: "fk_bookings_branch_scope",
    columns: [table.businessId, table.branchId],
    foreignColumns: [branches.businessId, branches.id],
  }).onDelete("restrict"),
  foreignKey({
    name: "fk_bookings_customer_scope",
    columns: [table.businessId, table.customerId],
    foreignColumns: [customers.businessId, customers.id],
  }).onDelete("restrict"),
  foreignKey({
    name: "fk_bookings_service_scope",
    columns: [table.businessId, table.branchId, table.serviceId],
    foreignColumns: [bookingServices.businessId, bookingServices.branchId, bookingServices.id],
  }).onDelete("restrict"),
  index("idx_bookings_branch_range").on(table.businessId, table.branchId, table.startMinute, table.endMinute, table.id),
  index("idx_bookings_business_customer_range").on(table.businessId, table.customerId, table.startMinute, table.id),
  index("idx_bookings_branch_module_status_range").on(table.businessId, table.branchId, table.serviceModule, table.status, table.startMinute),
  check("ck_bookings_id", sql`length(${table.id}) >= 8`),
  check("ck_bookings_module", sql`${table.serviceModule} in ('grooming', 'hotel', 'daycare')`),
  check("ck_bookings_time_model", sql`${table.timeModel} in ('appointment', 'date-range', 'day')`),
  check("ck_bookings_status", sql`${table.status} in ('pending', 'confirmed', 'arrived', 'cancelled')`),
  check("ck_bookings_interval", sql`${table.endMinute} > ${table.startMinute}`),
  check("ck_bookings_end_shape", sql`(${table.timeModel} = 'day' and ${table.endLocal} is null) or (${table.timeModel} <> 'day' and ${table.endLocal} is not null)`),
  check("ck_bookings_estimate", sql`${table.estimate} is null or ${table.estimate} between 0 and 1000000`),
  check("ck_bookings_notes", sql`length(${table.notes}) <= 4000`),
  check("ck_bookings_revision", sql`${table.revision} >= 1`),
  check("ck_bookings_idempotency", sql`(${table.idempotencyKey} is null and ${table.createRequestHash} is null) or (${table.idempotencyKey} is not null and length(${table.idempotencyKey}) between 8 and 160 and length(${table.createRequestHash}) = 64)`),
]);

export const bookingPets = sqliteTable("booking_pets", {
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  bookingId: text("booking_id").notNull(),
  petId: text("pet_id").notNull(),
  position: integer("position").notNull(),
  createdAt: text("created_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  primaryKey({ columns: [table.businessId, table.branchId, table.bookingId, table.petId], name: "pk_booking_pets" }),
  foreignKey({
    name: "fk_booking_pets_booking_scope",
    columns: [table.businessId, table.branchId, table.bookingId],
    foreignColumns: [bookings.businessId, bookings.branchId, bookings.id],
  }).onDelete("restrict"),
  foreignKey({
    name: "fk_booking_pets_profile_scope",
    columns: [table.businessId, table.petId],
    foreignColumns: [businessPetProfiles.businessId, businessPetProfiles.petId],
  }).onDelete("restrict"),
  index("idx_booking_pets_business_pet_booking").on(table.businessId, table.petId, table.bookingId),
  check("ck_booking_pets_position", sql`${table.position} between 0 and 23`),
]);

export const bookingResourceAssignments = sqliteTable("booking_resource_assignments", {
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  bookingId: text("booking_id").notNull(),
  resourceId: text("resource_id").notNull(),
  position: integer("position").notNull(),
  createdAt: text("created_at").notNull(),
  createdByPersonId: text("created_by_person_id").references(() => persons.id, { onDelete: "restrict" }),
}, (table) => [
  primaryKey({ columns: [table.businessId, table.branchId, table.bookingId, table.resourceId], name: "pk_booking_resource_assignments" }),
  foreignKey({
    name: "fk_booking_assignments_booking_scope",
    columns: [table.businessId, table.branchId, table.bookingId],
    foreignColumns: [bookings.businessId, bookings.branchId, bookings.id],
  }).onDelete("restrict"),
  foreignKey({
    name: "fk_booking_assignments_resource_scope",
    columns: [table.businessId, table.branchId, table.resourceId],
    foreignColumns: [bookingResources.businessId, bookingResources.branchId, bookingResources.id],
  }).onDelete("restrict"),
  index("idx_booking_assignments_resource_booking").on(table.businessId, table.branchId, table.resourceId, table.bookingId),
  check("ck_booking_assignments_position", sql`${table.position} between 0 and 23`),
]);

/** Write-time reservation ledger used by SQLite triggers to serialize conflict checks. */
export const bookingResourceReservations = sqliteTable("booking_resource_reservations", {
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  bookingId: text("booking_id").notNull(),
  resourceId: text("resource_id").notNull(),
  reservationKey: text("reservation_key").notNull(),
  reservationDate: text("reservation_date"),
  startMinute: integer("start_minute").notNull(),
  endMinute: integer("end_minute").notNull(),
  units: integer("units").notNull(),
}, (table) => [
  primaryKey({ columns: [table.businessId, table.branchId, table.bookingId, table.resourceId, table.reservationKey], name: "pk_booking_resource_reservations" }),
  foreignKey({
    name: "fk_booking_reservations_assignment_scope",
    columns: [table.businessId, table.branchId, table.bookingId, table.resourceId],
    foreignColumns: [bookingResourceAssignments.businessId, bookingResourceAssignments.branchId, bookingResourceAssignments.bookingId, bookingResourceAssignments.resourceId],
  }).onDelete("restrict"),
  index("idx_booking_reservations_resource_interval").on(table.businessId, table.branchId, table.resourceId, table.startMinute, table.endMinute),
  index("idx_booking_reservations_resource_date").on(table.businessId, table.branchId, table.resourceId, table.reservationDate),
  check("ck_booking_reservations_range", sql`${table.endMinute} > ${table.startMinute}`),
  check("ck_booking_reservations_units", sql`${table.units} between 1 and 10000`),
]);

/** A final statement per mutation; its trigger revalidates the complete aggregate. */
export const bookingWriteCommits = sqliteTable("booking_write_commits", {
  businessId: text("business_id").notNull(),
  branchId: text("branch_id").notNull(),
  bookingId: text("booking_id").notNull(),
  revision: integer("revision").notNull(),
  writeToken: text("write_token").notNull(),
  committedAt: text("committed_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.businessId, table.branchId, table.bookingId, table.revision], name: "pk_booking_write_commits" }),
  foreignKey({
    name: "fk_booking_write_commits_booking_scope",
    columns: [table.businessId, table.branchId, table.bookingId],
    foreignColumns: [bookings.businessId, bookings.branchId, bookings.id],
  }).onDelete("restrict"),
  index("idx_booking_write_commits_token").on(table.writeToken),
]);
