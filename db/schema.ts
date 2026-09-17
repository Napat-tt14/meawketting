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

// BE4 and later mutations use these relational guards/receipts. Guards exist
// only inside a D1 batch and are deleted before commit; they are not domain data.
export const backendGuards = sqliteTable("backend_guards", {
  id: text("id").primaryKey().notNull(),
  allowed: integer("allowed").notNull(),
  versionOk: integer("version_ok").notNull().default(1),
}, (table) => [check("ck_backend_authorization", sql`${table.allowed} = 1`), check("ck_backend_version", sql`${table.versionOk} = 1`)]);

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

export const backendMutations = sqliteTable("backend_mutations", {
  businessId: text("business_id").notNull().references(() => businesses.id),
  branchId: text("branch_id").notNull(),
  command: text("command").notNull(),
  requestKey: text("request_key").notNull(),
  requestHash: text("request_hash").notNull(),
  targetId: text("target_id").notNull(),
  actorPersonId: text("actor_person_id").notNull().references(() => persons.id),
  createdAt: text("created_at").notNull(),
}, (t) => [
  primaryKey({ columns: [t.businessId, t.command, t.requestKey] }),
  foreignKey({ columns: [t.businessId, t.branchId], foreignColumns: [branches.businessId, branches.id] }),
  index("idx_backend_mutations_target").on(t.businessId, t.targetId),
]);

// A Business-local operational staff profile is separate from a login or
// membership. An optional Person link never creates authorization.
export const operationStaff = sqliteTable("operation_staff", {
  id: text("id").primaryKey().notNull(),
  businessId: text("business_id").notNull().references(() => businesses.id),
  personId: text("person_id").references(() => persons.id),
  name: text("name").notNull(),
  avatarSeed: text("avatar_seed").notNull(),
  displayRole: text("display_role").notNull(),
  capabilities: text("capabilities_json").notNull(),
  status: text("status").notNull().default("active"),
  revision: integer("revision").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => [
  uniqueIndex("uq_operation_staff_scope").on(t.businessId, t.id),
  check("ck_operation_staff_role", sql`${t.displayRole} in ('owner','manager','staff')`),
  check("ck_operation_staff_capabilities", sql`json_valid(${t.capabilities})`),
  lifecycle(t.status),
]);

export const operationStaffBranches = sqliteTable("operation_staff_branches", {
  businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), staffId: text("staff_id").notNull(),
}, (t) => [
  primaryKey({ columns: [t.businessId, t.branchId, t.staffId] }),
  foreignKey({ columns: [t.businessId, t.branchId], foreignColumns: [branches.businessId, branches.id] }),
  foreignKey({ columns: [t.businessId, t.staffId], foreignColumns: [operationStaff.businessId, operationStaff.id] }),
]);

export const operationStaffWindows = sqliteTable("operation_staff_windows", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), staffId: text("staff_id").notNull(),
  state: text("state").notNull(), startLocal: text("start_local").notNull(), endLocal: text("end_local").notNull(), note: text("note"),
}, (t) => [
  foreignKey({ columns: [t.businessId, t.staffId], foreignColumns: [operationStaff.businessId, operationStaff.id] }),
  index("idx_operation_staff_windows").on(t.businessId, t.staffId, t.startLocal, t.endLocal),
  check("ck_operation_staff_window_state", sql`${t.state} in ('working','unavailable','break','time-off')`),
  check("ck_operation_staff_window_range", sql`${t.startLocal} < ${t.endLocal} or (${t.startLocal} = ${t.endLocal} and length(${t.startLocal}) = 10)`),
]);

export const hotelSpaces = sqliteTable("hotel_spaces", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(),
  serviceId: text("service_id").notNull(), label: text("label").notNull(), kind: text("kind").notNull(),
  capacity: integer("capacity").notNull(), status: text("status").notNull().default("active"),
}, (t) => [
  uniqueIndex("uq_hotel_spaces_scope").on(t.businessId, t.branchId, t.id),
  foreignKey({ columns: [t.businessId, t.branchId, t.serviceId], foreignColumns: [bookingServices.businessId, bookingServices.branchId, bookingServices.id] }),
  index("idx_hotel_spaces_branch").on(t.businessId, t.branchId, t.status),
  check("ck_hotel_spaces_kind", sql`${t.kind} in ('room','zone')`),
  check("ck_hotel_spaces_capacity", sql`${t.capacity} between 1 and 10000`), lifecycle(t.status),
]);

// The discriminator represents three execution aggregates, not a Booking
// status. Only operational scalar details are JSON; references, assignments,
// events, care tasks and Service Records have independent constrained rows.
export const serviceExecutions = sqliteTable("service_executions", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(),
  bookingId: text("booking_id").notNull(), customerId: text("customer_id").notNull(), petId: text("pet_id").notNull(),
  module: text("module").notNull(), status: text("status").notNull(), intakeId: text("intake_id"),
  scheduledStart: text("scheduled_start").notNull(), scheduledEnd: text("scheduled_end"),
  businessNote: text("business_note").notNull().default(""), details: text("details_json").notNull().default("{}"),
  revision: integer("revision").notNull().default(1), writeToken: text("write_token").notNull(),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(), cancelledAt: text("cancelled_at"),
}, (t) => [
  uniqueIndex("uq_service_executions_source").on(t.businessId, t.bookingId, t.petId, t.module),
  uniqueIndex("uq_service_executions_scope").on(t.businessId, t.branchId, t.id),
  foreignKey({ columns: [t.businessId, t.branchId, t.bookingId], foreignColumns: [bookings.businessId, bookings.branchId, bookings.id] }),
  foreignKey({ columns: [t.businessId, t.customerId], foreignColumns: [customers.businessId, customers.id] }),
  foreignKey({ columns: [t.businessId, t.petId], foreignColumns: [businessPetProfiles.businessId, businessPetProfiles.petId] }),
  index("idx_executions_branch_module_range").on(t.businessId, t.branchId, t.module, t.scheduledStart, t.id),
  index("idx_executions_customer").on(t.businessId, t.customerId, t.branchId, t.updatedAt),
  check("ck_executions_module", sql`${t.module} in ('grooming','hotel','daycare')`),
  check("ck_executions_revision", sql`${t.revision} >= 1`),
  check("ck_executions_details", sql`json_valid(${t.details}) and length(${t.details}) <= 16000`),
  check("ck_executions_note", sql`length(${t.businessNote}) <= 4000`),
  check("ck_executions_status", sql`(${t.module} = 'grooming' and ${t.status} in ('booked','checked-in','waiting','in-service','ready-for-pickup','completed','cancelled')) or (${t.module} = 'hotel' and ${t.status} in ('booked','expected-today','checked-in','in-stay','ready-for-checkout','checked-out','completed','cancelled','no-show')) or (${t.module} = 'daycare' and ${t.status} in ('booked','checked-in','active','ready-for-pickup','checked-out','completed','cancelled'))`),
]);

export const executionAssignments = sqliteTable("execution_assignments", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(),
  executionId: text("execution_id").notNull(), resourceId: text("resource_id"), spaceId: text("space_id"), staffId: text("staff_id"),
  startLocal: text("start_local").notNull(), endLocal: text("end_local").notNull(),
  assignedAt: text("assigned_at").notNull(), assignedBy: text("assigned_by").references(() => persons.id), reason: text("reason"),
}, (t) => [
  foreignKey({ columns: [t.businessId, t.branchId, t.executionId], foreignColumns: [serviceExecutions.businessId, serviceExecutions.branchId, serviceExecutions.id] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.resourceId], foreignColumns: [bookingResources.businessId, bookingResources.branchId, bookingResources.id] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.spaceId], foreignColumns: [hotelSpaces.businessId, hotelSpaces.branchId, hotelSpaces.id] }),
  foreignKey({ columns: [t.businessId, t.staffId], foreignColumns: [operationStaff.businessId, operationStaff.id] }),
  index("idx_execution_assignments_source").on(t.businessId, t.branchId, t.executionId),
  index("idx_execution_assignments_resource").on(t.businessId, t.branchId, t.resourceId, t.startLocal, t.endLocal),
  index("idx_execution_assignments_space").on(t.businessId, t.branchId, t.spaceId, t.startLocal, t.endLocal),
  check("ck_execution_assignment_target", sql`(${t.resourceId} is not null) + (${t.spaceId} is not null) + (${t.staffId} is not null) = 1`),
  check("ck_execution_assignment_range", sql`${t.endLocal} >= ${t.startLocal}`),
]);

export const executionEvents = sqliteTable("execution_events", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), executionId: text("execution_id").notNull(),
  kind: text("kind").notNull(), summary: text("summary").notNull(), data: text("data_json").notNull().default("{}"),
  actorPersonId: text("actor_person_id").references(() => persons.id), occurredAt: text("occurred_at").notNull(),
}, (t) => [
  uniqueIndex("uq_execution_event_scope").on(t.businessId, t.branchId, t.id),
  foreignKey({ columns: [t.businessId, t.branchId, t.executionId], foreignColumns: [serviceExecutions.businessId, serviceExecutions.branchId, serviceExecutions.id] }),
  index("idx_execution_events_source").on(t.businessId, t.branchId, t.executionId, t.occurredAt, t.id),
  check("ck_execution_events_json", sql`json_valid(${t.data}) and length(${t.data}) <= 16000`),
]);

export const executionCareTasks = sqliteTable("execution_care_tasks", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), executionId: text("execution_id").notNull(),
  kind: text("kind").notNull(), label: text("label").notNull(), scheduledDate: text("scheduled_date").notNull(), scheduledTime: text("scheduled_time").notNull(),
  staffId: text("staff_id"), completedAt: text("completed_at"), completedBy: text("completed_by").references(() => persons.id), instructions: text("instructions"), authorizedIntakeId: text("authorized_intake_id"),
}, (t) => [
  foreignKey({ columns: [t.businessId, t.branchId, t.executionId], foreignColumns: [serviceExecutions.businessId, serviceExecutions.branchId, serviceExecutions.id] }),
  foreignKey({ columns: [t.businessId, t.staffId], foreignColumns: [operationStaff.businessId, operationStaff.id] }),
  index("idx_execution_care_due").on(t.businessId, t.branchId, t.executionId, t.scheduledDate, t.completedAt),
  check("ck_execution_care_kind", sql`${t.kind} in ('meal','water','medication','activity','cleaning','check','note','other')`),
]);

export const serviceRecords = sqliteTable("service_records", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), executionId: text("execution_id").notNull(),
  customerId: text("customer_id").notNull(), petId: text("pet_id").notNull(), completedAt: text("completed_at").notNull(),
  summary: text("summary").notNull(), businessNote: text("business_note").notNull(), snapshot: text("snapshot_json").notNull(),
  sourceRevision: integer("source_revision").notNull(), revision: integer("revision").notNull().default(1), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t) => [
  uniqueIndex("uq_service_records_source").on(t.businessId, t.branchId, t.executionId),
  uniqueIndex("uq_service_records_scope").on(t.businessId, t.branchId, t.id),
  foreignKey({ columns: [t.businessId, t.branchId, t.executionId], foreignColumns: [serviceExecutions.businessId, serviceExecutions.branchId, serviceExecutions.id] }),
  foreignKey({ columns: [t.businessId, t.customerId], foreignColumns: [customers.businessId, customers.id] }),
  foreignKey({ columns: [t.businessId, t.petId], foreignColumns: [businessPetProfiles.businessId, businessPetProfiles.petId] }),
  index("idx_service_records_history").on(t.businessId, t.branchId, t.customerId, t.completedAt, t.id),
  check("ck_service_record_snapshot", sql`json_valid(${t.snapshot})`),
]);

export const serviceRecordRevisions = sqliteTable("service_record_revisions", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), recordId: text("record_id").notNull(),
  kind: text("kind").notNull(), data: text("data_json").notNull(), actorPersonId: text("actor_person_id").notNull().references(() => persons.id), occurredAt: text("occurred_at").notNull(),
}, (t) => [
  foreignKey({ columns: [t.businessId, t.branchId, t.recordId], foreignColumns: [serviceRecords.businessId, serviceRecords.branchId, serviceRecords.id] }),
  index("idx_service_record_revisions").on(t.businessId, t.branchId, t.recordId, t.occurredAt, t.id),
  check("ck_service_record_revision_kind", sql`${t.kind} in ('correction','source-recompleted')`),
  check("ck_service_record_revision_json", sql`json_valid(${t.data})`),
]);

// BE5: Passport authority belongs to a Person/Pet relationship, never a Business Customer.
export const passportProfiles = sqliteTable("passport_profiles", {
  petId: text("pet_id").primaryKey().notNull().references(() => pets.id),
  name: text("name").notNull(), species: text("species").notNull(), reference: text("reference").notNull(),
  photoObjectKey: text("photo_object_key"), revision: integer("revision").notNull().default(1), updatedAt: text("updated_at").notNull(),
}, (t) => [check("ck_passport_species", sql`${t.species} in ('cat','dog')`), check("ck_passport_name", sql`length(${t.name}) between 1 and 160`)]);
export const petAuthorities = sqliteTable("pet_authorities", {
  id: text("id").primaryKey().notNull(), personId: text("person_id").notNull().references(() => persons.id), petId: text("pet_id").notNull().references(() => pets.id),
  role: text("role").notNull(), status: text("status").notNull().default("active"), source: text("source").notNull(),
  providerReference: text("provider_reference"), revision: integer("revision").notNull().default(1), createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("uq_pet_authority_person").on(t.personId, t.petId), uniqueIndex("uq_pet_authority_pet").on(t.id, t.petId),
  check("ck_pet_authority_role", sql`${t.role} in ('primary','co-guardian')`), check("ck_pet_authority_status", sql`${t.status} in ('active','inactive')`),
  check("ck_pet_authority_source", sql`${t.source} in ('dev-test','verified-provider')`)]);
export const consents = sqliteTable("consents", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(),
  authorityId: text("authority_id").notNull(), petId: text("pet_id").notNull(), status: text("status").notNull(),
  decidedAt: text("decided_at"), revision: integer("revision").notNull().default(1), createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("uq_consent_scope").on(t.businessId, t.branchId, t.id),
  foreignKey({ columns: [t.businessId, t.branchId], foreignColumns: [branches.businessId, branches.id] }),
  foreignKey({ columns: [t.authorityId, t.petId], foreignColumns: [petAuthorities.id, petAuthorities.petId] }),
  check("ck_consent_status", sql`${t.status} in ('pending','approved','denied')`)]);
export const accessGrants = sqliteTable("access_grants", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), consentId: text("consent_id").notNull(),
  tokenHash: text("token_hash").notNull(), purpose: text("purpose").notNull(), expiresAt: text("expires_at").notNull(), revokedAt: text("revoked_at"),
  revision: integer("revision").notNull().default(1), createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("uq_access_grant_token").on(t.tokenHash), uniqueIndex("uq_access_grant_consent").on(t.consentId), uniqueIndex("uq_access_grant_scope").on(t.businessId, t.branchId, t.id),
  foreignKey({ columns: [t.businessId, t.branchId, t.consentId], foreignColumns: [consents.businessId, consents.branchId, consents.id] }),
  index("idx_access_grant_expiry").on(t.businessId, t.branchId, t.expiresAt), check("ck_access_grant_token", sql`length(${t.tokenHash})=64`),
  check("ck_access_grant_expiry", sql`${t.expiresAt}>${t.createdAt}`), check("ck_access_grant_purpose", sql`length(${t.purpose}) between 1 and 500`)]);
export const accessGrantScopes = sqliteTable("access_grant_scopes", {
  grantId: text("grant_id").notNull().references(() => accessGrants.id), scope: text("scope").notNull(),
}, (t) => [primaryKey({ columns: [t.grantId, t.scope] }), check("ck_access_grant_scope", sql`${t.scope} in ('basicIdentity','photo','passportReference')`)]);
export const accessEvents = sqliteTable("access_events", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), grantId: text("grant_id").notNull(),
  kind: text("kind").notNull(), actorPersonId: text("actor_person_id").notNull().references(() => persons.id), metadata: text("metadata_json").notNull().default("{}"), occurredAt: text("occurred_at").notNull(),
}, (t) => [foreignKey({ columns: [t.businessId, t.branchId, t.grantId], foreignColumns: [accessGrants.businessId, accessGrants.branchId, accessGrants.id] }),
  index("idx_access_events_grant").on(t.businessId, t.branchId, t.grantId, t.occurredAt), check("ck_access_event_json", sql`json_valid(${t.metadata}) and length(${t.metadata})<=2000`)]);
export const businessIntakes = sqliteTable("business_intakes", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), grantId: text("grant_id").notNull(), targetKey: text("target_key").notNull(),
  customerId: text("customer_id"), petId: text("pet_id"), executionId: text("execution_id"), belongings: text("belongings_json").notNull().default("[]"),
  businessNote: text("business_note").notNull().default(""), taskState: text("task_state").notNull().default("allowed-data"), checkedInAt: text("checked_in_at"),
  createdBy: text("created_by").notNull().references(() => persons.id), revision: integer("revision").notNull().default(1), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t) => [uniqueIndex("uq_intake_source").on(t.businessId, t.branchId, t.grantId, t.targetKey), uniqueIndex("uq_intake_scope").on(t.businessId, t.branchId, t.id),
  foreignKey({ columns: [t.businessId, t.branchId, t.grantId], foreignColumns: [accessGrants.businessId, accessGrants.branchId, accessGrants.id] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.executionId], foreignColumns: [serviceExecutions.businessId, serviceExecutions.branchId, serviceExecutions.id] }),
  foreignKey({ columns: [t.businessId, t.customerId], foreignColumns: [customers.businessId, customers.id] }),
  foreignKey({ columns: [t.businessId, t.petId], foreignColumns: [businessPetProfiles.businessId, businessPetProfiles.petId] }),
  index("idx_intake_branch").on(t.businessId, t.branchId, t.updatedAt), check("ck_intake_belongings", sql`json_valid(${t.belongings}) and length(${t.belongings})<=2000`),
  check("ck_intake_note", sql`length(${t.businessNote})<=4000`), check("ck_intake_task", sql`${t.taskState} in ('allowed-data','intake','review','complete')`)]);
export const intakeCorrections = sqliteTable("intake_corrections", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), intakeId: text("intake_id").notNull(),
  topic: text("topic").notNull(), currentValue: text("current_value").notNull(), suggestedValue: text("suggested_value").notNull(), note: text("note").notNull(),
  actorPersonId: text("actor_person_id").notNull().references(() => persons.id), createdAt: text("created_at").notNull(),
}, (t) => [foreignKey({ columns: [t.businessId, t.branchId, t.intakeId], foreignColumns: [businessIntakes.businessId, businessIntakes.branchId, businessIntakes.id] }),
  index("idx_intake_corrections_source").on(t.businessId, t.branchId, t.intakeId, t.createdAt), check("ck_intake_correction_topic", sql`${t.topic} in ('name','species','passport-reference')`)]);

// BE6: Business/Customer conversation identity; each context and message retains Branch privacy.
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), customerId: text("customer_id").notNull(), createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("uq_conversation_customer").on(t.businessId, t.customerId), uniqueIndex("uq_conversation_scope").on(t.businessId, t.id),
  foreignKey({ columns: [t.businessId, t.customerId], foreignColumns: [customers.businessId, customers.id] })]);
export const conversationContexts = sqliteTable("conversation_contexts", {
  businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), conversationId: text("conversation_id").notNull(),
  petId: text("pet_id"), bookingId: text("booking_id"), executionId: text("execution_id"), revision: integer("revision").notNull().default(1), updatedAt: text("updated_at").notNull(),
}, (t) => [primaryKey({ columns: [t.businessId, t.branchId, t.conversationId] }),
  foreignKey({ columns: [t.businessId, t.branchId], foreignColumns: [branches.businessId, branches.id] }),
  foreignKey({ columns: [t.businessId, t.conversationId], foreignColumns: [conversations.businessId, conversations.id] }),
  foreignKey({ columns: [t.businessId, t.petId], foreignColumns: [businessPetProfiles.businessId, businessPetProfiles.petId] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.bookingId], foreignColumns: [bookings.businessId, bookings.branchId, bookings.id] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.executionId], foreignColumns: [serviceExecutions.businessId, serviceExecutions.branchId, serviceExecutions.id] })]);
export const messages = sqliteTable("messages", {
  sequence: integer("sequence").primaryKey({ autoIncrement: true }), id: text("id").notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), conversationId: text("conversation_id").notNull(),
  kind: text("kind").notNull(), direction: text("direction").notNull(), body: text("body").notNull(), petId: text("pet_id"), bookingId: text("booking_id"), executionId: text("execution_id"),
  actorPersonId: text("actor_person_id").references(() => persons.id), occurredAt: text("occurred_at").notNull(), createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("uq_message_id").on(t.id), uniqueIndex("uq_message_scope").on(t.businessId, t.branchId, t.id),
  foreignKey({ columns: [t.businessId, t.branchId, t.conversationId], foreignColumns: [conversationContexts.businessId, conversationContexts.branchId, conversationContexts.conversationId] }),
  foreignKey({ columns: [t.businessId, t.petId], foreignColumns: [businessPetProfiles.businessId, businessPetProfiles.petId] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.bookingId], foreignColumns: [bookings.businessId, bookings.branchId, bookings.id] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.executionId], foreignColumns: [serviceExecutions.businessId, serviceExecutions.branchId, serviceExecutions.id] }),
  index("idx_messages_conversation_order").on(t.businessId, t.conversationId, t.branchId, t.sequence),
  check("ck_message_kind", sql`${t.kind} in ('text','add-service-request')`), check("ck_message_direction", sql`${t.direction} in ('business','customer')`), check("ck_message_length", sql`length(${t.body}) between 1 and 5000`)]);
export const conversationReads = sqliteTable("conversation_reads", {
  businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), conversationId: text("conversation_id").notNull(), personId: text("person_id").notNull().references(() => persons.id),
  throughSequence: integer("through_sequence").notNull(), readAt: text("read_at").notNull(),
}, (t) => [primaryKey({ columns: [t.businessId, t.branchId, t.conversationId, t.personId] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.conversationId], foreignColumns: [conversationContexts.businessId, conversationContexts.branchId, conversationContexts.conversationId] }),
  check("ck_conversation_read_cursor", sql`${t.throughSequence}>=0`)]);
export const messageApprovals = sqliteTable("message_approvals", {
  messageId: text("message_id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), serviceName: text("service_name").notNull(),
  additionalPrice: integer("additional_price").notNull(), additionalMinutes: integer("additional_minutes").notNull(), note: text("note").notNull(),
  status: text("status").notNull().default("waiting"), revision: integer("revision").notNull().default(1), respondedAt: text("responded_at"), authorityId: text("authority_id").references(() => petAuthorities.id), responseSource: text("response_source"),
}, (t) => [foreignKey({ columns: [t.businessId, t.branchId, t.messageId], foreignColumns: [messages.businessId, messages.branchId, messages.id] }),
  check("ck_message_approval_status", sql`${t.status} in ('waiting','approved','declined','cancelled','expired')`), check("ck_message_approval_amounts", sql`${t.additionalPrice} between 0 and 10000000 and ${t.additionalMinutes} between 0 and 1440`)]);
export const businessChannels = sqliteTable("business_channels", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), provider: text("provider").notNull(), state: text("state").notNull(),
  externalAccountId: text("external_account_id").notNull(), secretRef: text("secret_ref").notNull(), revision: integer("revision").notNull().default(1), createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("uq_business_channel_provider").on(t.businessId, t.provider), uniqueIndex("uq_channel_external_account").on(t.provider, t.externalAccountId), uniqueIndex("uq_channel_scope").on(t.businessId, t.id),
  foreignKey({ columns: [t.businessId, t.branchId], foreignColumns: [branches.businessId, branches.id] }), check("ck_channel_provider", sql`${t.provider} in ('line','mock')`), check("ck_channel_state", sql`${t.state} in ('active','disconnected')`)]);
export const customerChannelLinks = sqliteTable("customer_channel_links", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), channelId: text("channel_id").notNull(), customerId: text("customer_id").notNull(),
  externalSubject: text("external_subject").notNull(), status: text("status").notNull(), verificationSource: text("verification_source").notNull(), revision: integer("revision").notNull().default(1), createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("uq_channel_customer").on(t.channelId, t.customerId), uniqueIndex("uq_channel_subject").on(t.channelId, t.externalSubject), uniqueIndex("uq_channel_link_scope").on(t.businessId, t.channelId, t.id),
  foreignKey({ columns: [t.businessId, t.channelId], foreignColumns: [businessChannels.businessId, businessChannels.id] }), foreignKey({ columns: [t.businessId, t.customerId], foreignColumns: [customers.businessId, customers.id] }),
  check("ck_channel_link_status", sql`${t.status} in ('active','inactive')`), check("ck_channel_link_source", sql`${t.verificationSource} in ('dev-test','verified-provider')`)]);
// Provider proof links Person only. It confers no Customer relationship or Pet authority.
export const personExternalIdentities = sqliteTable("person_external_identities", {
  id: text("id").primaryKey().notNull(), personId: text("person_id").notNull().references(() => persons.id), provider: text("provider").notNull(), issuer: text("issuer").notNull(),
  subject: text("subject").notNull(), verifiedAt: text("verified_at").notNull(), status: text("status").notNull(),
}, (t) => [uniqueIndex("uq_external_identity_subject").on(t.provider, t.issuer, t.subject), check("ck_external_identity_status", sql`${t.status} in ('active','inactive')`)]);
export const authSessions = sqliteTable("auth_sessions", {
  tokenHash: text("token_hash").primaryKey().notNull(),
  personId: text("person_id").notNull().references(() => persons.id),
  issuedAt: integer("issued_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  revokedAt: integer("revoked_at"),
}, (t) => [
  index("idx_auth_sessions_person").on(t.personId, t.revokedAt, t.expiresAt),
  check("ck_auth_session_token_hash", sql`length(${t.tokenHash}) = 64`),
  check("ck_auth_session_window", sql`${t.issuedAt} > 0 and ${t.expiresAt} > ${t.issuedAt}`),
  check("ck_auth_session_revoked_at", sql`${t.revokedAt} is null or ${t.revokedAt} >= ${t.issuedAt}`),
]);
export const messageOutbox = sqliteTable("message_outbox", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), messageId: text("message_id").notNull(), channelId: text("channel_id"), linkId: text("link_id"), recipient: text("recipient"),
  retryKey: text("retry_key").notNull(), state: text("state").notNull(), attempts: integer("attempts").notNull().default(0), firstAttemptAt: text("first_attempt_at"), availableAt: text("available_at").notNull(),
  leaseToken: text("lease_token"), leaseUntil: text("lease_until"), providerMessageId: text("provider_message_id"), providerRequestId: text("provider_request_id"), failureCode: text("failure_code"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t) => [uniqueIndex("uq_outbox_message").on(t.businessId, t.branchId, t.messageId), uniqueIndex("uq_outbox_retry_key").on(t.retryKey),
  foreignKey({ columns: [t.businessId, t.branchId, t.messageId], foreignColumns: [messages.businessId, messages.branchId, messages.id] }),
  foreignKey({ columns: [t.businessId, t.channelId, t.linkId], foreignColumns: [customerChannelLinks.businessId, customerChannelLinks.channelId, customerChannelLinks.id] }),
  foreignKey({ columns: [t.businessId, t.channelId], foreignColumns: [businessChannels.businessId, businessChannels.id] }),
  index("idx_outbox_due").on(t.state, t.availableAt, t.leaseUntil), check("ck_outbox_state", sql`${t.state} in ('blocked','queued','sending','retry','sent','failed')`)]);
export const channelWebhookEvents = sqliteTable("channel_webhook_events", {
  channelId: text("channel_id").notNull(), eventId: text("event_id").notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), eventHash: text("event_hash").notNull(),
  providerMessageId: text("provider_message_id").notNull(), externalSubject: text("external_subject").notNull(), messageId: text("message_id"), state: text("state").notNull(), pendingBody: text("pending_body"), occurredAt: text("occurred_at").notNull(), receivedAt: text("received_at").notNull(),
}, (t) => [primaryKey({ columns: [t.channelId, t.eventId] }), uniqueIndex("uq_channel_provider_message").on(t.channelId, t.providerMessageId),
  foreignKey({ columns: [t.businessId, t.channelId], foreignColumns: [businessChannels.businessId, businessChannels.id] }), foreignKey({ columns: [t.businessId, t.branchId], foreignColumns: [branches.businessId, branches.id] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.messageId], foreignColumns: [messages.businessId, messages.branchId, messages.id] }),
  index("idx_channel_pending_events").on(t.channelId, t.state, t.receivedAt), check("ck_channel_event_state", sql`${t.state} in ('received','unlinked')`)]);
export const outboxAttempts = sqliteTable("outbox_attempts", {
  id: text("id").primaryKey().notNull(), outboxId: text("outbox_id").notNull().references(() => messageOutbox.id),
  startedAt: text("started_at").notNull(), finishedAt: text("finished_at"), outcome: text("outcome").notNull().default("sending"), failureCode: text("failure_code"), providerRequestId: text("provider_request_id"),
}, (t) => [index("idx_outbox_attempt_history").on(t.outboxId, t.startedAt), check("ck_outbox_attempt_outcome", sql`${t.outcome} in ('sending','accepted','retry','failed','not-connected')`)]);

// BE7 stores integer satang. The current Product accepts whole THB only.
// Charge items describe debt; Payments and Refunds describe money movement.
export const charges = sqliteTable("charges", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), bookingId: text("booking_id").notNull(), customerId: text("customer_id").notNull(),
  petId: text("pet_id"), executionId: text("execution_id"), module: text("module").notNull(), serviceLabel: text("service_label").notNull(), currency: text("currency").notNull().default("THB"),
  cancelledAt: text("cancelled_at"), cancellationReason: text("cancellation_reason"), revision: integer("revision").notNull().default(1),
  createdBy: text("created_by").notNull().references(() => persons.id), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t) => [uniqueIndex("uq_charge_booking").on(t.businessId, t.branchId, t.bookingId), uniqueIndex("uq_charge_scope").on(t.businessId, t.branchId, t.id),
  foreignKey({ columns: [t.businessId, t.branchId, t.bookingId], foreignColumns: [bookings.businessId, bookings.branchId, bookings.id] }),
  foreignKey({ columns: [t.businessId, t.customerId], foreignColumns: [customers.businessId, customers.id] }),
  foreignKey({ columns: [t.businessId, t.petId], foreignColumns: [businessPetProfiles.businessId, businessPetProfiles.petId] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.executionId], foreignColumns: [serviceExecutions.businessId, serviceExecutions.branchId, serviceExecutions.id] }),
  index("idx_charge_customer").on(t.businessId, t.branchId, t.customerId, t.createdAt), check("ck_charge_currency", sql`${t.currency}='THB'`),
  check("ck_charge_module", sql`${t.module} in ('grooming','hotel','daycare')`), check("ck_charge_revision", sql`${t.revision}>0`),
  check("ck_charge_cancellation", sql`(${t.cancelledAt} is null and ${t.cancellationReason} is null) or (${t.cancelledAt} is not null and length(trim(${t.cancellationReason})) between 1 and 1000)`)]);
export const chargeItems = sqliteTable("charge_items", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), chargeId: text("charge_id").notNull(), kind: text("kind").notNull(), label: text("label").notNull(),
  amountMinor: integer("amount_minor").notNull(), reason: text("reason"), sourceEventId: text("source_event_id"), executionId: text("execution_id"), createdAt: text("created_at").notNull(),
}, (t) => [foreignKey({ columns: [t.businessId, t.branchId, t.chargeId], foreignColumns: [charges.businessId, charges.branchId, charges.id] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.executionId], foreignColumns: [serviceExecutions.businessId, serviceExecutions.branchId, serviceExecutions.id] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.sourceEventId], foreignColumns: [executionEvents.businessId, executionEvents.branchId, executionEvents.id] }),
  uniqueIndex("uq_charge_source_event").on(t.chargeId, t.sourceEventId), index("idx_charge_items").on(t.businessId, t.branchId, t.chargeId),
  check("ck_charge_item_kind", sql`${t.kind} in ('base-service','add-on','manual-adjustment','discount')`),
  check("ck_charge_item_amount", sql`typeof(${t.amountMinor})='integer' and abs(${t.amountMinor})<=1000000000 and ${t.amountMinor}%100=0 and ((${t.kind}='discount' and ${t.amountMinor}<0) or (${t.kind}<>'discount' and ${t.amountMinor}>=0))`),
  check("ck_charge_item_label", sql`length(trim(${t.label})) between 1 and 160`), check("ck_charge_item_reason", sql`${t.kind} not in ('discount','manual-adjustment') or length(trim(${t.reason})) between 1 and 1000`)]);
export const chargeEvents = sqliteTable("charge_events", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), chargeId: text("charge_id").notNull(),
  kind: text("kind").notNull(), summary: text("summary").notNull(), actorPersonId: text("actor_person_id").notNull().references(() => persons.id), occurredAt: text("occurred_at").notNull(),
}, (t) => [foreignKey({ columns: [t.businessId, t.branchId, t.chargeId], foreignColumns: [charges.businessId, charges.branchId, charges.id] }),
  index("idx_charge_events").on(t.businessId, t.branchId, t.chargeId, t.occurredAt), check("ck_charge_event_kind", sql`${t.kind} in ('created','adjusted','cancelled')`)]);
export const paymentProviderAccounts = sqliteTable("payment_provider_accounts", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull().references(() => businesses.id), provider: text("provider").notNull(), externalAccountId: text("external_account_id").notNull(),
  secretRef: text("secret_ref").notNull(), source: text("source").notNull(), status: text("status").notNull().default("active"), revision: integer("revision").notNull().default(1),
}, (t) => [uniqueIndex("uq_payment_account_scope").on(t.businessId, t.id), uniqueIndex("uq_payment_external_account").on(t.provider, t.externalAccountId),
  check("ck_payment_account_source", sql`${t.source} in ('dev-test','verified-provider')`), check("ck_payment_account_status", sql`${t.status} in ('active','inactive')`)]);
export const paymentAttempts = sqliteTable("payment_attempts", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), chargeId: text("charge_id").notNull(), accountId: text("account_id").notNull(),
  amountMinor: integer("amount_minor").notNull(), currency: text("currency").notNull().default("THB"), idempotencyKey: text("idempotency_key").notNull(), state: text("state").notNull().default("created"),
  providerReference: text("provider_reference"), attempts: integer("attempts").notNull().default(0), leaseToken: text("lease_token"), leaseUntil: text("lease_until"),
  nextAttemptAt: text("next_attempt_at").notNull(), failureCode: text("failure_code"), revision: integer("revision").notNull().default(1),
  createdBy: text("created_by").notNull().references(() => persons.id), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t) => [uniqueIndex("uq_payment_attempt_scope").on(t.businessId, t.branchId, t.id), uniqueIndex("uq_payment_attempt_key").on(t.idempotencyKey), uniqueIndex("uq_payment_attempt_provider_ref").on(t.accountId, t.providerReference),
  foreignKey({ columns: [t.businessId, t.branchId, t.chargeId], foreignColumns: [charges.businessId, charges.branchId, charges.id] }),
  foreignKey({ columns: [t.businessId, t.accountId], foreignColumns: [paymentProviderAccounts.businessId, paymentProviderAccounts.id] }),
  index("idx_payment_attempt_due").on(t.state, t.nextAttemptAt, t.leaseUntil), index("idx_payment_attempt_charge").on(t.businessId, t.branchId, t.chargeId, t.state),
  check("ck_payment_attempt_amount", sql`typeof(${t.amountMinor})='integer' and ${t.amountMinor} between 100 and 1000000000 and ${t.amountMinor}%100=0 and ${t.currency}='THB'`),
  check("ck_payment_attempt_state", sql`${t.state} in ('created','pending','retry','failed','succeeded','reconciliation')`)]);
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), customerId: text("customer_id").notNull(),
  amountMinor: integer("amount_minor").notNull(), currency: text("currency").notNull().default("THB"), method: text("method").notNull(), source: text("source").notNull(),
  attemptId: text("attempt_id"), accountId: text("account_id"), providerReference: text("provider_reference"), note: text("note").notNull().default(""),
  recordedBy: text("recorded_by").notNull().references(() => persons.id), recordedAt: text("recorded_at").notNull(), occurredAt: text("occurred_at").notNull(),
}, (t) => [uniqueIndex("uq_payment_scope").on(t.businessId, t.branchId, t.id), uniqueIndex("uq_payment_attempt").on(t.attemptId), uniqueIndex("uq_payment_provider_ref").on(t.accountId, t.providerReference),
  foreignKey({ columns: [t.businessId, t.branchId], foreignColumns: [branches.businessId, branches.id] }), foreignKey({ columns: [t.businessId, t.customerId], foreignColumns: [customers.businessId, customers.id] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.attemptId], foreignColumns: [paymentAttempts.businessId, paymentAttempts.branchId, paymentAttempts.id] }),
  foreignKey({ columns: [t.businessId, t.accountId], foreignColumns: [paymentProviderAccounts.businessId, paymentProviderAccounts.id] }),
  index("idx_payment_branch_date").on(t.businessId, t.branchId, t.occurredAt), index("idx_payment_customer").on(t.businessId, t.customerId, t.branchId, t.occurredAt),
  check("ck_payment_amount", sql`typeof(${t.amountMinor})='integer' and ${t.amountMinor} between 100 and 1000000000 and ${t.amountMinor}%100=0 and ${t.currency}='THB'`),
  check("ck_payment_method", sql`${t.method} in ('cash','bank-transfer','other')`), check("ck_payment_source", sql`(${t.source}='manual' and ${t.attemptId} is null and ${t.accountId} is null and ${t.providerReference} is null) or (${t.source}='provider' and ${t.attemptId} is not null and ${t.accountId} is not null and ${t.providerReference} is not null)`)]);
export const paymentAllocations = sqliteTable("payment_allocations", {
  businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), paymentId: text("payment_id").notNull(), chargeId: text("charge_id").notNull(), amountMinor: integer("amount_minor").notNull(),
}, (t) => [primaryKey({ columns: [t.businessId, t.branchId, t.paymentId, t.chargeId] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.paymentId], foreignColumns: [payments.businessId, payments.branchId, payments.id] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.chargeId], foreignColumns: [charges.businessId, charges.branchId, charges.id] }), index("idx_payment_allocation_charge").on(t.businessId, t.branchId, t.chargeId),
  check("ck_payment_allocation_amount", sql`typeof(${t.amountMinor})='integer' and ${t.amountMinor}>0 and ${t.amountMinor}%100=0`)]);
export const paymentRefunds = sqliteTable("payment_refunds", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), paymentId: text("payment_id").notNull(),
  amountMinor: integer("amount_minor").notNull(), reason: text("reason").notNull(), recordedBy: text("recorded_by").notNull().references(() => persons.id), recordedAt: text("recorded_at").notNull(),
}, (t) => [uniqueIndex("uq_refund_scope").on(t.businessId, t.branchId, t.id), uniqueIndex("uq_refund_payment_scope").on(t.businessId, t.branchId, t.paymentId, t.id),
  foreignKey({ columns: [t.businessId, t.branchId, t.paymentId], foreignColumns: [payments.businessId, payments.branchId, payments.id] }), index("idx_refund_payment").on(t.businessId, t.branchId, t.paymentId), index("idx_refund_branch_date").on(t.businessId, t.branchId, t.recordedAt),
  check("ck_refund_amount", sql`typeof(${t.amountMinor})='integer' and ${t.amountMinor}>0 and ${t.amountMinor}%100=0`), check("ck_refund_reason", sql`length(trim(${t.reason})) between 1 and 1000`)]);
export const refundAllocations = sqliteTable("refund_allocations", {
  businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), refundId: text("refund_id").notNull(), paymentId: text("payment_id").notNull(), chargeId: text("charge_id").notNull(), amountMinor: integer("amount_minor").notNull(),
}, (t) => [primaryKey({ columns: [t.businessId, t.branchId, t.refundId, t.chargeId] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.paymentId, t.refundId], foreignColumns: [paymentRefunds.businessId, paymentRefunds.branchId, paymentRefunds.paymentId, paymentRefunds.id] }),
  foreignKey({ columns: [t.businessId, t.branchId, t.paymentId, t.chargeId], foreignColumns: [paymentAllocations.businessId, paymentAllocations.branchId, paymentAllocations.paymentId, paymentAllocations.chargeId] }), index("idx_refund_allocation_charge").on(t.businessId, t.branchId, t.chargeId),
  check("ck_refund_allocation_amount", sql`typeof(${t.amountMinor})='integer' and ${t.amountMinor}>0 and ${t.amountMinor}%100=0`)]);
export const paymentWebhookEvents = sqliteTable("payment_webhook_events", {
  accountId: text("account_id").notNull(), eventId: text("event_id").notNull(), businessId: text("business_id").notNull(), eventHash: text("event_hash").notNull(),
  attemptId: text("attempt_id").references(() => paymentAttempts.id), state: text("state").notNull(), normalizedEvent: text("normalized_event_json").notNull(), failureCode: text("failure_code"), receivedAt: text("received_at").notNull(),
}, (t) => [primaryKey({ columns: [t.accountId, t.eventId] }), foreignKey({ columns: [t.businessId, t.accountId], foreignColumns: [paymentProviderAccounts.businessId, paymentProviderAccounts.id] }),
  index("idx_payment_webhook_review").on(t.businessId, t.state, t.receivedAt), check("ck_payment_webhook_state", sql`${t.state} in ('applied','ignored','reconciliation')`), check("ck_payment_webhook_json", sql`json_valid(${t.normalizedEvent}) and length(${t.normalizedEvent})<=4000`)]);
export const paymentAttemptEvents = sqliteTable("payment_attempt_events", {
  id: text("id").primaryKey().notNull(), businessId: text("business_id").notNull(), branchId: text("branch_id").notNull(), attemptId: text("attempt_id").notNull(), kind: text("kind").notNull(),
  failureCode: text("failure_code"), occurredAt: text("occurred_at").notNull(),
}, (t) => [foreignKey({ columns: [t.businessId, t.branchId, t.attemptId], foreignColumns: [paymentAttempts.businessId, paymentAttempts.branchId, paymentAttempts.id] }), index("idx_payment_attempt_history").on(t.businessId, t.branchId, t.attemptId, t.occurredAt)]);
