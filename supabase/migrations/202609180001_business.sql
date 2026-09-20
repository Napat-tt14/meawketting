-- Clean PostgreSQL baseline. Stable domain IDs and text ISO dates are preserved.
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_person_id" text NOT NULL,
	"actor_membership_id" text NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text,
	"request_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"before_json" text,
	"after_json" text,
	"occurred_at" text NOT NULL,
	CONSTRAINT "ck_audit_events_id" CHECK(length("audit_events"."id") >= 16),
	CONSTRAINT "ck_audit_events_action" CHECK(length(trim("audit_events"."action")) between 1 and 120)
);

CREATE TABLE "branch_enabled_modules" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"module" text NOT NULL,
	"created_at" text NOT NULL,
	"created_by_person_id" text,
	PRIMARY KEY("branch_id", "module"),
	CONSTRAINT "ck_branch_enabled_modules_module" CHECK("branch_enabled_modules"."module" in ('grooming', 'hotel', 'daycare'))
);

CREATE TABLE "branch_operating_hours" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"weekday" text NOT NULL,
	"closed" integer DEFAULT 0 NOT NULL,
	"opens_at" text NOT NULL,
	"closes_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"updated_by_person_id" text,
	PRIMARY KEY("branch_id", "weekday"),
	CONSTRAINT "ck_branch_operating_hours_weekday" CHECK("branch_operating_hours"."weekday" in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
	CONSTRAINT "ck_branch_operating_hours_closed" CHECK("branch_operating_hours"."closed" in (0, 1)),
	CONSTRAINT "ck_branch_operating_hours_range" CHECK("branch_operating_hours"."closed" = 1 or "branch_operating_hours"."opens_at" < "branch_operating_hours"."closes_at")
);

CREATE TABLE "branches" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"area" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"timezone" text DEFAULT 'Asia/Bangkok' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"created_by_person_id" text,
	"updated_by_person_id" text,
	CONSTRAINT "ck_branches_id" CHECK(length("branches"."id") >= 8),
	CONSTRAINT "ck_branches_name" CHECK(length(trim("branches"."name")) between 1 and 160),
	CONSTRAINT "ck_status_lifecycle" CHECK("branches"."status" in ('active', 'inactive'))
);

CREATE TABLE "business_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"business_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"created_by_person_id" text,
	"updated_by_person_id" text,
	CONSTRAINT "ck_business_memberships_id" CHECK(length("business_memberships"."id") >= 16),
	CONSTRAINT "ck_business_memberships_role" CHECK("business_memberships"."role" in ('OWNER', 'MANAGER', 'STAFF')),
	CONSTRAINT "ck_status_lifecycle" CHECK("business_memberships"."status" in ('active', 'inactive'))
);

CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"created_by_person_id" text,
	"updated_by_person_id" text,
	CONSTRAINT "ck_businesses_id" CHECK(length("businesses"."id") >= 16),
	CONSTRAINT "ck_businesses_name" CHECK(length(trim("businesses"."name")) between 1 and 160),
	CONSTRAINT "ck_status_lifecycle" CHECK("businesses"."status" in ('active', 'inactive'))
);

CREATE TABLE "persons" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"primary_email" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "ck_persons_id" CHECK(length("persons"."id") >= 16),
	CONSTRAINT "ck_persons_display_name" CHECK(length(trim("persons"."display_name")) between 1 and 120),
	CONSTRAINT "ck_status_lifecycle" CHECK("persons"."status" in ('active', 'inactive'))
);

CREATE TABLE "membership_branch_access" (
	"membership_id" text NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"created_by_person_id" text,
	"updated_by_person_id" text,
	PRIMARY KEY("membership_id", "branch_id"),
	CONSTRAINT "ck_status_lifecycle" CHECK("membership_branch_access"."status" in ('active', 'inactive'))
);

CREATE TABLE "business_pet_profiles" (
	"business_id" text NOT NULL,
	"pet_id" text NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"species" text NOT NULL,
	"profile_source" text DEFAULT 'business-local' NOT NULL,
	"business_notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"created_by_person_id" text,
	"updated_by_person_id" text,
	PRIMARY KEY("business_id", "pet_id"),
	CONSTRAINT "ck_business_pet_profiles_name" CHECK(length(trim("business_pet_profiles"."name")) between 1 and 120),
	CONSTRAINT "ck_business_pet_profiles_name_key" CHECK(length(trim("business_pet_profiles"."name_key")) between 1 and 120),
	CONSTRAINT "ck_business_pet_profiles_species" CHECK("business_pet_profiles"."species" in ('cat', 'dog')),
	CONSTRAINT "ck_business_pet_profiles_source" CHECK("business_pet_profiles"."profile_source" in ('business-local', 'customer-reported')),
	CONSTRAINT "ck_business_pet_profiles_notes" CHECK(length("business_pet_profiles"."business_notes") <= 4000),
	CONSTRAINT "ck_status_lifecycle" CHECK("business_pet_profiles"."status" in ('active', 'inactive'))
);

CREATE TABLE "customer_pet_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"pet_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"created_by_person_id" text,
	"updated_by_person_id" text,
	CONSTRAINT "ck_customer_pet_relationships_id" CHECK(length("customer_pet_relationships"."id") >= 16),
	CONSTRAINT "ck_status_lifecycle" CHECK("customer_pet_relationships"."status" in ('active', 'inactive'))
);

CREATE TABLE "customer_tags" (
	"business_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"tag_key" text NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"created_by_person_id" text,
	"updated_by_person_id" text,
	PRIMARY KEY("business_id", "customer_id", "tag_key"),
	CONSTRAINT "ck_customer_tags_tag_key" CHECK(length(trim("customer_tags"."tag_key")) between 1 and 32),
	CONSTRAINT "ck_customer_tags_label" CHECK(length(trim("customer_tags"."label")) between 1 and 32),
	CONSTRAINT "ck_customer_tags_position" CHECK("customer_tags"."position" between 0 and 7)
);

CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"display_name" text NOT NULL,
	"display_name_key" text NOT NULL,
	"phone" text,
	"phone_key" text,
	"email" text,
	"business_notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"created_by_person_id" text,
	"updated_by_person_id" text,
	CONSTRAINT "ck_customers_id" CHECK(length("customers"."id") >= 16),
	CONSTRAINT "ck_customers_display_name" CHECK(length(trim("customers"."display_name")) between 1 and 120),
	CONSTRAINT "ck_customers_display_name_key" CHECK(length(trim("customers"."display_name_key")) between 1 and 120),
	CONSTRAINT "ck_customers_phone" CHECK("customers"."phone" is null or length("customers"."phone") between 1 and 40),
	CONSTRAINT "ck_customers_phone_key" CHECK("customers"."phone_key" is null or length("customers"."phone_key") between 1 and 40),
	CONSTRAINT "ck_customers_email" CHECK("customers"."email" is null or length("customers"."email") between 3 and 254),
	CONSTRAINT "ck_customers_business_notes" CHECK(length("customers"."business_notes") <= 4000),
	CONSTRAINT "ck_status_lifecycle" CHECK("customers"."status" in ('active', 'inactive'))
);

CREATE TABLE "pets" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text NOT NULL,
	"created_by_person_id" text,
	CONSTRAINT "ck_pets_id" CHECK(length("pets"."id") >= 8)
);

CREATE TABLE "booking_pets" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"pet_id" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" text NOT NULL,
	"created_by_person_id" text,
	PRIMARY KEY("business_id", "branch_id", "booking_id", "pet_id"),
	CONSTRAINT "ck_booking_pets_position" CHECK("booking_pets"."position" between 0 and 23)
);

CREATE TABLE "booking_resource_assignments" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" text NOT NULL,
	"created_by_person_id" text,
	PRIMARY KEY("business_id", "branch_id", "booking_id", "resource_id"),
	CONSTRAINT "ck_booking_assignments_position" CHECK("booking_resource_assignments"."position" between 0 and 23)
);

CREATE TABLE "booking_resource_availability_windows" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"state" text NOT NULL,
	"start_local" text NOT NULL,
	"end_local" text NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"created_by_person_id" text,
	"updated_by_person_id" text,
	CONSTRAINT "ck_booking_resource_windows_state" CHECK("booking_resource_availability_windows"."state" in ('working', 'unavailable', 'break', 'time-off')),
	CONSTRAINT "ck_booking_resource_windows_range" CHECK("booking_resource_availability_windows"."end_minute" > "booking_resource_availability_windows"."start_minute")
);

CREATE TABLE "booking_resource_reservations" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"reservation_key" text NOT NULL,
	"reservation_date" text,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"units" integer NOT NULL,
	PRIMARY KEY("business_id", "branch_id", "booking_id", "resource_id", "reservation_key"),
	CONSTRAINT "ck_booking_reservations_range" CHECK("booking_resource_reservations"."end_minute" > "booking_resource_reservations"."start_minute"),
	CONSTRAINT "ck_booking_reservations_units" CHECK("booking_resource_reservations"."units" between 1 and 10000)
);

CREATE TABLE "booking_resource_service_links" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"service_id" text NOT NULL,
	"created_at" text NOT NULL,
	"created_by_person_id" text,
	PRIMARY KEY("business_id", "branch_id", "resource_id", "service_id"));

CREATE TABLE "booking_resources" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"module" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"capacity_mode" text NOT NULL,
	"capacity" integer NOT NULL,
	"compatibility_staff_id" text,
	"hotel_role" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"created_by_person_id" text,
	"updated_by_person_id" text,
	CONSTRAINT "ck_booking_resources_id" CHECK(length("booking_resources"."id") >= 8),
	CONSTRAINT "ck_booking_resources_module" CHECK("booking_resources"."module" in ('grooming', 'hotel', 'daycare')),
	CONSTRAINT "ck_booking_resources_kind" CHECK("booking_resources"."kind" in ('groomer', 'grooming-station', 'dryer', 'hotel-room-type', 'daycare-zone')),
	CONSTRAINT "ck_booking_resources_label" CHECK(length(trim("booking_resources"."label")) between 1 and 160),
	CONSTRAINT "ck_booking_resources_capacity_mode" CHECK("booking_resources"."capacity_mode" in ('exclusive', 'capacity')),
	CONSTRAINT "ck_booking_resources_capacity" CHECK("booking_resources"."capacity" between 1 and 10000),
	CONSTRAINT "ck_booking_resources_hotel_role" CHECK("booking_resources"."hotel_role" is null or "booking_resources"."hotel_role" = 'planning-capacity'),
	CONSTRAINT "ck_status_lifecycle" CHECK("booking_resources"."status" in ('active', 'inactive'))
);

CREATE TABLE "booking_service_resource_requirements" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"service_id" text NOT NULL,
	"resource_kind" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"created_by_person_id" text,
	PRIMARY KEY("business_id", "branch_id", "service_id", "resource_kind"),
	CONSTRAINT "ck_booking_service_requirements_kind" CHECK("booking_service_resource_requirements"."resource_kind" in ('groomer', 'grooming-station', 'dryer', 'hotel-room-type', 'daycare-zone'))
);

CREATE TABLE "booking_services" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"module" text NOT NULL,
	"label" text NOT NULL,
	"time_model" text NOT NULL,
	"default_duration_minutes" integer,
	"estimate" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"created_by_person_id" text,
	"updated_by_person_id" text,
	CONSTRAINT "ck_booking_services_id" CHECK(length("booking_services"."id") >= 8),
	CONSTRAINT "ck_booking_services_module" CHECK("booking_services"."module" in ('grooming', 'hotel', 'daycare')),
	CONSTRAINT "ck_booking_services_time_model" CHECK("booking_services"."time_model" in ('appointment', 'date-range', 'day')),
	CONSTRAINT "ck_booking_services_label" CHECK(length(trim("booking_services"."label")) between 1 and 160),
	CONSTRAINT "ck_booking_services_duration" CHECK("booking_services"."default_duration_minutes" is null or "booking_services"."default_duration_minutes" between 1 and 1440),
	CONSTRAINT "ck_booking_services_estimate" CHECK("booking_services"."estimate" is null or "booking_services"."estimate" between 0 and 1000000),
	CONSTRAINT "ck_status_lifecycle" CHECK("booking_services"."status" in ('active', 'inactive'))
);

CREATE TABLE "booking_write_commits" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"revision" integer NOT NULL,
	"write_token" text NOT NULL,
	"committed_at" text NOT NULL,
	PRIMARY KEY("business_id", "branch_id", "booking_id", "revision"));

CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"service_id" text NOT NULL,
	"service_module" text NOT NULL,
	"time_model" text NOT NULL,
	"start_local" text NOT NULL,
	"end_local" text,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"start_weekday" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"estimate" integer,
	"notes" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"write_token" text NOT NULL,
	"idempotency_key" text,
	"create_request_hash" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"cancelled_at" text,
	"created_by_person_id" text,
	"updated_by_person_id" text,
	"cancelled_by_person_id" text,
	CONSTRAINT "ck_bookings_id" CHECK(length("bookings"."id") >= 8),
	CONSTRAINT "ck_bookings_module" CHECK("bookings"."service_module" in ('grooming', 'hotel', 'daycare')),
	CONSTRAINT "ck_bookings_time_model" CHECK("bookings"."time_model" in ('appointment', 'date-range', 'day')),
	CONSTRAINT "ck_bookings_status" CHECK("bookings"."status" in ('pending', 'confirmed', 'arrived', 'cancelled')),
	CONSTRAINT "ck_bookings_interval" CHECK("bookings"."end_minute" > "bookings"."start_minute"),
	CONSTRAINT "ck_bookings_end_shape" CHECK(("bookings"."time_model" = 'day' and "bookings"."end_local" is null) or ("bookings"."time_model" <> 'day' and "bookings"."end_local" is not null)),
	CONSTRAINT "ck_bookings_estimate" CHECK("bookings"."estimate" is null or "bookings"."estimate" between 0 and 1000000),
	CONSTRAINT "ck_bookings_notes" CHECK(length("bookings"."notes") <= 4000),
	CONSTRAINT "ck_bookings_revision" CHECK("bookings"."revision" >= 1),
	CONSTRAINT "ck_bookings_idempotency" CHECK(("bookings"."idempotency_key" is null and "bookings"."create_request_hash" is null) or ("bookings"."idempotency_key" is not null and length("bookings"."idempotency_key") between 8 and 160 and length("bookings"."create_request_hash") = 64))
);

CREATE TABLE "backend_mutations" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"command" text NOT NULL,
	"request_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"target_id" text NOT NULL,
	"actor_person_id" text NOT NULL,
	"created_at" text NOT NULL,
	PRIMARY KEY("business_id", "command", "request_key"));

CREATE TABLE "execution_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"resource_id" text,
	"space_id" text,
	"staff_id" text,
	"start_local" text NOT NULL,
	"end_local" text NOT NULL,
	"assigned_at" text NOT NULL,
	"assigned_by" text,
	"reason" text,
	CONSTRAINT "ck_execution_assignment_target" CHECK(("execution_assignments"."resource_id" is not null)::integer::integer + ("execution_assignments"."space_id" is not null)::integer::integer + ("execution_assignments"."staff_id" is not null)::integer::integer = 1),
	CONSTRAINT "ck_execution_assignment_range" CHECK("execution_assignments"."end_local" >= "execution_assignments"."start_local")
);

CREATE TABLE "execution_care_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"scheduled_date" text NOT NULL,
	"scheduled_time" text NOT NULL,
	"staff_id" text,
	"completed_at" text,
	"completed_by" text,
	"instructions" text,
	"authorized_intake_id" text,
	CONSTRAINT "ck_execution_care_kind" CHECK("execution_care_tasks"."kind" in ('meal','water','medication','activity','cleaning','check','note','other'))
);

CREATE TABLE "execution_events" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"data_json" text DEFAULT '{}' NOT NULL,
	"actor_person_id" text,
	"occurred_at" text NOT NULL,
	CONSTRAINT "ck_execution_events_json" CHECK(("execution_events"."data_json" IS JSON) and length("execution_events"."data_json") <= 16000)
);

CREATE TABLE "hotel_spaces" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"service_id" text NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"capacity" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "ck_hotel_spaces_kind" CHECK("hotel_spaces"."kind" in ('room','zone')),
	CONSTRAINT "ck_hotel_spaces_capacity" CHECK("hotel_spaces"."capacity" between 1 and 10000),
	CONSTRAINT "ck_status_lifecycle" CHECK("hotel_spaces"."status" in ('active', 'inactive'))
);

CREATE TABLE "operation_staff" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"person_id" text,
	"name" text NOT NULL,
	"avatar_seed" text NOT NULL,
	"display_role" text NOT NULL,
	"capabilities_json" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "ck_operation_staff_role" CHECK("operation_staff"."display_role" in ('owner','manager','staff')),
	CONSTRAINT "ck_operation_staff_capabilities" CHECK(("operation_staff"."capabilities_json" IS JSON)),
	CONSTRAINT "ck_status_lifecycle" CHECK("operation_staff"."status" in ('active', 'inactive'))
);

CREATE TABLE "operation_staff_branches" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"staff_id" text NOT NULL,
	PRIMARY KEY("business_id", "branch_id", "staff_id"));

CREATE TABLE "operation_staff_windows" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"state" text NOT NULL,
	"start_local" text NOT NULL,
	"end_local" text NOT NULL,
	"note" text,
	CONSTRAINT "ck_operation_staff_window_state" CHECK("operation_staff_windows"."state" in ('working','unavailable','break','time-off')),
	CONSTRAINT "ck_operation_staff_window_range" CHECK("operation_staff_windows"."start_local" < "operation_staff_windows"."end_local" or ("operation_staff_windows"."start_local" = "operation_staff_windows"."end_local" and length("operation_staff_windows"."start_local") = 10))
);

CREATE TABLE "service_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"pet_id" text NOT NULL,
	"module" text NOT NULL,
	"status" text NOT NULL,
	"intake_id" text,
	"scheduled_start" text NOT NULL,
	"scheduled_end" text,
	"business_note" text DEFAULT '' NOT NULL,
	"details_json" text DEFAULT '{}' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"write_token" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"cancelled_at" text,
	CONSTRAINT "ck_executions_module" CHECK("service_executions"."module" in ('grooming','hotel','daycare')),
	CONSTRAINT "ck_executions_revision" CHECK("service_executions"."revision" >= 1),
	CONSTRAINT "ck_executions_details" CHECK(("service_executions"."details_json" IS JSON) and length("service_executions"."details_json") <= 16000),
	CONSTRAINT "ck_executions_note" CHECK(length("service_executions"."business_note") <= 4000),
	CONSTRAINT "ck_executions_status" CHECK(("service_executions"."module" = 'grooming' and "service_executions"."status" in ('booked','checked-in','waiting','in-service','ready-for-pickup','completed','cancelled')) or ("service_executions"."module" = 'hotel' and "service_executions"."status" in ('booked','expected-today','checked-in','in-stay','ready-for-checkout','checked-out','completed','cancelled','no-show')) or ("service_executions"."module" = 'daycare' and "service_executions"."status" in ('booked','checked-in','active','ready-for-pickup','checked-out','completed','cancelled')))
);

CREATE TABLE "service_record_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"record_id" text NOT NULL,
	"kind" text NOT NULL,
	"data_json" text NOT NULL,
	"actor_person_id" text NOT NULL,
	"occurred_at" text NOT NULL,
	CONSTRAINT "ck_service_record_revision_kind" CHECK("service_record_revisions"."kind" in ('correction','source-recompleted')),
	CONSTRAINT "ck_service_record_revision_json" CHECK(("service_record_revisions"."data_json" IS JSON))
);

CREATE TABLE "service_records" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"pet_id" text NOT NULL,
	"completed_at" text NOT NULL,
	"summary" text NOT NULL,
	"business_note" text NOT NULL,
	"snapshot_json" text NOT NULL,
	"source_revision" integer NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "ck_service_record_snapshot" CHECK(("service_records"."snapshot_json" IS JSON))
);

CREATE TABLE "backend_guards" (
	"id" text PRIMARY KEY NOT NULL,
	"allowed" integer NOT NULL,
	"version_ok" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "ck_backend_authorization" CHECK("backend_guards"."allowed" = 1),
	CONSTRAINT "ck_backend_version" CHECK("backend_guards"."version_ok" = 1)
);

CREATE TABLE "access_events" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"grant_id" text NOT NULL,
	"kind" text NOT NULL,
	"actor_person_id" text NOT NULL,
	"metadata_json" text DEFAULT '{}' NOT NULL,
	"occurred_at" text NOT NULL,
	CONSTRAINT "ck_access_event_json" CHECK(("access_events"."metadata_json" IS JSON) and length("access_events"."metadata_json")<=2000)
);

CREATE TABLE "access_grant_scopes" (
	"grant_id" text NOT NULL,
	"scope" text NOT NULL,
	PRIMARY KEY("grant_id", "scope"),
	CONSTRAINT "ck_access_grant_scope" CHECK("access_grant_scopes"."scope" in ('basicIdentity','photo','passportReference'))
);

CREATE TABLE "access_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"consent_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" text NOT NULL,
	"revoked_at" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "ck_access_grant_token" CHECK(length("access_grants"."token_hash")=64),
	CONSTRAINT "ck_access_grant_expiry" CHECK("access_grants"."expires_at">"access_grants"."created_at"),
	CONSTRAINT "ck_access_grant_purpose" CHECK(length("access_grants"."purpose") between 1 and 500)
);

CREATE TABLE "business_intakes" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"grant_id" text NOT NULL,
	"target_key" text NOT NULL,
	"customer_id" text,
	"pet_id" text,
	"execution_id" text,
	"belongings_json" text DEFAULT '[]' NOT NULL,
	"business_note" text DEFAULT '' NOT NULL,
	"task_state" text DEFAULT 'allowed-data' NOT NULL,
	"checked_in_at" text,
	"created_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "ck_intake_belongings" CHECK(("business_intakes"."belongings_json" IS JSON) and length("business_intakes"."belongings_json")<=2000),
	CONSTRAINT "ck_intake_note" CHECK(length("business_intakes"."business_note")<=4000),
	CONSTRAINT "ck_intake_task" CHECK("business_intakes"."task_state" in ('allowed-data','intake','review','complete'))
);

CREATE TABLE "consents" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"authority_id" text NOT NULL,
	"pet_id" text NOT NULL,
	"status" text NOT NULL,
	"decided_at" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "ck_consent_status" CHECK("consents"."status" in ('pending','approved','denied'))
);

CREATE TABLE "intake_corrections" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"intake_id" text NOT NULL,
	"topic" text NOT NULL,
	"current_value" text NOT NULL,
	"suggested_value" text NOT NULL,
	"note" text NOT NULL,
	"actor_person_id" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "ck_intake_correction_topic" CHECK("intake_corrections"."topic" in ('name','species','passport-reference'))
);

CREATE TABLE "passport_profiles" (
	"pet_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"reference" text NOT NULL,
	"photo_object_key" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "ck_passport_species" CHECK("passport_profiles"."species" in ('cat','dog')),
	CONSTRAINT "ck_passport_name" CHECK(length("passport_profiles"."name") between 1 and 160)
);

CREATE TABLE "pet_authorities" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"pet_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text NOT NULL,
	"provider_reference" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "ck_pet_authority_role" CHECK("pet_authorities"."role" in ('primary','co-guardian')),
	CONSTRAINT "ck_pet_authority_status" CHECK("pet_authorities"."status" in ('active','inactive')),
	CONSTRAINT "ck_pet_authority_source" CHECK("pet_authorities"."source" in ('dev-test','verified-provider'))
);

CREATE TABLE "business_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"provider" text NOT NULL,
	"state" text NOT NULL,
	"external_account_id" text NOT NULL,
	"secret_ref" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "ck_channel_provider" CHECK("business_channels"."provider" in ('line','mock')),
	CONSTRAINT "ck_channel_state" CHECK("business_channels"."state" in ('active','disconnected'))
);

CREATE TABLE "channel_webhook_events" (
	"channel_id" text NOT NULL,
	"event_id" text NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"event_hash" text NOT NULL,
	"provider_message_id" text NOT NULL,
	"external_subject" text NOT NULL,
	"message_id" text,
	"state" text NOT NULL,
	"pending_body" text,
	"occurred_at" text NOT NULL,
	"received_at" text NOT NULL,
	PRIMARY KEY("channel_id", "event_id"),
	CONSTRAINT "ck_channel_event_state" CHECK("channel_webhook_events"."state" in ('received','unlinked'))
);

CREATE TABLE "conversation_contexts" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"pet_id" text,
	"booking_id" text,
	"execution_id" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" text NOT NULL,
	PRIMARY KEY("business_id", "branch_id", "conversation_id"));

CREATE TABLE "conversation_reads" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"person_id" text NOT NULL,
	"through_sequence" bigint NOT NULL,
	"read_at" text NOT NULL,
	PRIMARY KEY("business_id", "branch_id", "conversation_id", "person_id"),
	CONSTRAINT "ck_conversation_read_cursor" CHECK("conversation_reads"."through_sequence">=0)
);

CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"created_at" text NOT NULL);

CREATE TABLE "customer_channel_links" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"external_subject" text NOT NULL,
	"status" text NOT NULL,
	"verification_source" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "ck_channel_link_status" CHECK("customer_channel_links"."status" in ('active','inactive')),
	CONSTRAINT "ck_channel_link_source" CHECK("customer_channel_links"."verification_source" in ('dev-test','verified-provider'))
);

CREATE TABLE "message_approvals" (
	"message_id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"service_name" text NOT NULL,
	"additional_price" integer NOT NULL,
	"additional_minutes" integer NOT NULL,
	"note" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"responded_at" text,
	"authority_id" text,
	"response_source" text,
	CONSTRAINT "ck_message_approval_status" CHECK("message_approvals"."status" in ('waiting','approved','declined','cancelled','expired')),
	CONSTRAINT "ck_message_approval_amounts" CHECK("message_approvals"."additional_price" between 0 and 10000000 and "message_approvals"."additional_minutes" between 0 and 1440)
);

CREATE TABLE "message_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"message_id" text NOT NULL,
	"channel_id" text,
	"link_id" text,
	"recipient" text,
	"retry_key" text NOT NULL,
	"state" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"first_attempt_at" text,
	"available_at" text NOT NULL,
	"lease_token" text,
	"lease_until" text,
	"provider_message_id" text,
	"provider_request_id" text,
	"failure_code" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "ck_outbox_state" CHECK("message_outbox"."state" in ('blocked','queued','sending','retry','sent','failed'))
);

CREATE TABLE "messages" (
	"sequence" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY NOT NULL,
	"id" text NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"kind" text NOT NULL,
	"direction" text NOT NULL,
	"body" text NOT NULL,
	"pet_id" text,
	"booking_id" text,
	"execution_id" text,
	"actor_person_id" text,
	"occurred_at" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "ck_message_kind" CHECK("messages"."kind" in ('text','add-service-request')),
	CONSTRAINT "ck_message_direction" CHECK("messages"."direction" in ('business','customer')),
	CONSTRAINT "ck_message_length" CHECK(length("messages"."body") between 1 and 5000)
);

CREATE TABLE "person_external_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"provider" text NOT NULL,
	"issuer" text NOT NULL,
	"subject" text NOT NULL,
	"verified_at" text NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "ck_external_identity_status" CHECK("person_external_identities"."status" in ('active','inactive'))
);

CREATE TABLE "outbox_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"outbox_id" text NOT NULL,
	"started_at" text NOT NULL,
	"finished_at" text,
	"outcome" text DEFAULT 'sending' NOT NULL,
	"failure_code" text,
	"provider_request_id" text,
	CONSTRAINT "ck_outbox_attempt_outcome" CHECK("outbox_attempts"."outcome" in ('sending','accepted','retry','failed','not-connected'))
);

CREATE TABLE "charge_events" (
  event_sequence bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"charge_id" text NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"actor_person_id" text NOT NULL,
	"occurred_at" text NOT NULL,
	CONSTRAINT "ck_charge_event_kind" CHECK("charge_events"."kind" in ('created','adjusted','cancelled'))
);

CREATE TABLE "charge_items" (
  event_sequence bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"charge_id" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"reason" text,
	"source_event_id" text,
	"execution_id" text,
	"created_at" text NOT NULL,
	CONSTRAINT "ck_charge_item_kind" CHECK("charge_items"."kind" in ('base-service','add-on','manual-adjustment','discount')),
	CONSTRAINT "ck_charge_item_amount" CHECK(abs("charge_items"."amount_minor")<=1000000000 and "charge_items"."amount_minor"%100=0 and (("charge_items"."kind"='discount' and "charge_items"."amount_minor"<0) or ("charge_items"."kind"<>'discount' and "charge_items"."amount_minor">=0))),
	CONSTRAINT "ck_charge_item_label" CHECK(length(trim("charge_items"."label")) between 1 and 160),
	CONSTRAINT "ck_charge_item_reason" CHECK("charge_items"."kind" not in ('discount','manual-adjustment') or length(trim("charge_items"."reason")) between 1 and 1000)
);

CREATE TABLE "charges" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"pet_id" text,
	"execution_id" text,
	"module" text NOT NULL,
	"service_label" text NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"cancelled_at" text,
	"cancellation_reason" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "ck_charge_currency" CHECK("charges"."currency"='THB'),
	CONSTRAINT "ck_charge_module" CHECK("charges"."module" in ('grooming','hotel','daycare')),
	CONSTRAINT "ck_charge_revision" CHECK("charges"."revision">0),
	CONSTRAINT "ck_charge_cancellation" CHECK(("charges"."cancelled_at" is null and "charges"."cancellation_reason" is null) or ("charges"."cancelled_at" is not null and length(trim("charges"."cancellation_reason")) between 1 and 1000))
);

CREATE TABLE "payment_allocations" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"payment_id" text NOT NULL,
	"charge_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	PRIMARY KEY("business_id", "branch_id", "payment_id", "charge_id"),
	CONSTRAINT "ck_payment_allocation_amount" CHECK("payment_allocations"."amount_minor">0 and "payment_allocations"."amount_minor"%100=0)
);

CREATE TABLE "payment_attempt_events" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"attempt_id" text NOT NULL,
	"kind" text NOT NULL,
	"failure_code" text,
	"occurred_at" text NOT NULL);

CREATE TABLE "payment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"charge_id" text NOT NULL,
	"account_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"idempotency_key" text NOT NULL,
	"state" text DEFAULT 'created' NOT NULL,
	"provider_reference" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease_token" text,
	"lease_until" text,
	"next_attempt_at" text NOT NULL,
	"failure_code" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "ck_payment_attempt_amount" CHECK("payment_attempts"."amount_minor" between 100 and 1000000000 and "payment_attempts"."amount_minor"%100=0 and "payment_attempts"."currency"='THB'),
	CONSTRAINT "ck_payment_attempt_state" CHECK("payment_attempts"."state" in ('created','pending','retry','failed','succeeded','reconciliation'))
);

CREATE TABLE "payment_provider_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_account_id" text NOT NULL,
	"secret_ref" text NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "ck_payment_account_source" CHECK("payment_provider_accounts"."source" in ('dev-test','verified-provider')),
	CONSTRAINT "ck_payment_account_status" CHECK("payment_provider_accounts"."status" in ('active','inactive'))
);

CREATE TABLE "payment_refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"payment_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"reason" text NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" text NOT NULL,
	CONSTRAINT "ck_refund_amount" CHECK("payment_refunds"."amount_minor">0 and "payment_refunds"."amount_minor"%100=0),
	CONSTRAINT "ck_refund_reason" CHECK(length(trim("payment_refunds"."reason")) between 1 and 1000)
);

CREATE TABLE "payment_webhook_events" (
	"account_id" text NOT NULL,
	"event_id" text NOT NULL,
	"business_id" text NOT NULL,
	"event_hash" text NOT NULL,
	"attempt_id" text,
	"state" text NOT NULL,
	"normalized_event_json" text NOT NULL,
	"failure_code" text,
	"received_at" text NOT NULL,
	PRIMARY KEY("account_id", "event_id"),
	CONSTRAINT "ck_payment_webhook_state" CHECK("payment_webhook_events"."state" in ('applied','ignored','reconciliation')),
	CONSTRAINT "ck_payment_webhook_json" CHECK(("payment_webhook_events"."normalized_event_json" IS JSON) and length("payment_webhook_events"."normalized_event_json")<=4000)
);

CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"method" text NOT NULL,
	"source" text NOT NULL,
	"attempt_id" text,
	"account_id" text,
	"provider_reference" text,
	"note" text DEFAULT '' NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" text NOT NULL,
	"occurred_at" text NOT NULL,
	CONSTRAINT "ck_payment_amount" CHECK("payments"."amount_minor" between 100 and 1000000000 and "payments"."amount_minor"%100=0 and "payments"."currency"='THB'),
	CONSTRAINT "ck_payment_method" CHECK("payments"."method" in ('cash','bank-transfer','other')),
	CONSTRAINT "ck_payment_source" CHECK(("payments"."source"='manual' and "payments"."attempt_id" is null and "payments"."account_id" is null and "payments"."provider_reference" is null) or ("payments"."source"='provider' and "payments"."attempt_id" is not null and "payments"."account_id" is not null and "payments"."provider_reference" is not null))
);

CREATE TABLE "refund_allocations" (
	"business_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"refund_id" text NOT NULL,
	"payment_id" text NOT NULL,
	"charge_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	PRIMARY KEY("business_id", "branch_id", "refund_id", "charge_id"),
	CONSTRAINT "ck_refund_allocation_amount" CHECK("refund_allocations"."amount_minor">0 and "refund_allocations"."amount_minor"%100=0)
);

CREATE INDEX "idx_audit_events_business_time" ON "audit_events" ("business_id","occurred_at");

CREATE INDEX "idx_audit_events_branch_time" ON "audit_events" ("branch_id","occurred_at");

CREATE INDEX "idx_audit_events_correlation" ON "audit_events" ("correlation_id");

CREATE INDEX "idx_branch_enabled_modules_business_branch" ON "branch_enabled_modules" ("business_id","branch_id");

CREATE INDEX "idx_branch_operating_hours_business_branch" ON "branch_operating_hours" ("business_id","branch_id");

CREATE UNIQUE INDEX "uq_branches_business_name_key" ON "branches" ("business_id","name_key");

CREATE UNIQUE INDEX "uq_branches_business_id_id" ON "branches" ("business_id","id");

CREATE INDEX "idx_branches_business_status" ON "branches" ("business_id","status");

CREATE UNIQUE INDEX "uq_business_memberships_person_business" ON "business_memberships" ("person_id","business_id");

CREATE UNIQUE INDEX "uq_business_memberships_id_business" ON "business_memberships" ("id","business_id");

CREATE INDEX "idx_business_memberships_person_status" ON "business_memberships" ("person_id","status");

CREATE INDEX "idx_business_memberships_business_status" ON "business_memberships" ("business_id","status");

CREATE UNIQUE INDEX "uq_persons_primary_email" ON "persons" ("primary_email");

CREATE INDEX "idx_membership_branch_access_membership_status" ON "membership_branch_access" ("membership_id","status");

CREATE INDEX "idx_membership_branch_access_business_branch" ON "membership_branch_access" ("business_id","branch_id");

CREATE INDEX "idx_business_pet_profiles_business_status_name" ON "business_pet_profiles" ("business_id","status","name_key","pet_id");

CREATE INDEX "idx_business_pet_profiles_business_name_species" ON "business_pet_profiles" ("business_id","name_key","species","pet_id");

CREATE UNIQUE INDEX "uq_customer_pet_relationships_scope" ON "customer_pet_relationships" ("business_id","customer_id","pet_id");

CREATE UNIQUE INDEX "uq_customer_pet_relationships_business_id" ON "customer_pet_relationships" ("business_id","id");

CREATE INDEX "idx_customer_pet_relationships_customer_status" ON "customer_pet_relationships" ("business_id","customer_id","status");

CREATE INDEX "idx_customer_pet_relationships_pet_status" ON "customer_pet_relationships" ("business_id","pet_id","status");

CREATE INDEX "idx_customer_tags_business_customer_position" ON "customer_tags" ("business_id","customer_id","position");

CREATE UNIQUE INDEX "uq_customers_business_id_id" ON "customers" ("business_id","id");

CREATE INDEX "idx_customers_business_status_name" ON "customers" ("business_id","status","display_name_key","id");

CREATE INDEX "idx_customers_business_phone_key" ON "customers" ("business_id","phone_key");

CREATE INDEX "idx_booking_pets_business_pet_booking" ON "booking_pets" ("business_id","pet_id","booking_id");

CREATE INDEX "idx_booking_assignments_resource_booking" ON "booking_resource_assignments" ("business_id","branch_id","resource_id","booking_id");

CREATE INDEX "idx_booking_resource_windows_interval" ON "booking_resource_availability_windows" ("business_id","branch_id","resource_id","start_minute","end_minute");

CREATE INDEX "idx_booking_reservations_resource_interval" ON "booking_resource_reservations" ("business_id","branch_id","resource_id","start_minute","end_minute");

CREATE INDEX "idx_booking_reservations_resource_date" ON "booking_resource_reservations" ("business_id","branch_id","resource_id","reservation_date");

CREATE INDEX "idx_booking_resource_links_service" ON "booking_resource_service_links" ("business_id","branch_id","service_id","resource_id");

CREATE UNIQUE INDEX "uq_booking_resources_scope_id" ON "booking_resources" ("business_id","branch_id","id");

CREATE INDEX "idx_booking_resources_branch_status_kind" ON "booking_resources" ("business_id","branch_id","status","kind");

CREATE INDEX "idx_booking_service_requirements_service_position" ON "booking_service_resource_requirements" ("business_id","branch_id","service_id","position");

CREATE UNIQUE INDEX "uq_booking_services_scope_id" ON "booking_services" ("business_id","branch_id","id");

CREATE INDEX "idx_booking_services_branch_status_module" ON "booking_services" ("business_id","branch_id","status","module");

CREATE INDEX "idx_booking_write_commits_token" ON "booking_write_commits" ("write_token");

CREATE UNIQUE INDEX "uq_bookings_scope_id" ON "bookings" ("business_id","branch_id","id");

CREATE UNIQUE INDEX "uq_bookings_business_idempotency" ON "bookings" ("business_id","idempotency_key");

CREATE INDEX "idx_bookings_branch_range" ON "bookings" ("business_id","branch_id","start_minute","end_minute","id");

CREATE INDEX "idx_bookings_business_customer_range" ON "bookings" ("business_id","customer_id","start_minute","id");

CREATE INDEX "idx_bookings_branch_module_status_range" ON "bookings" ("business_id","branch_id","service_module","status","start_minute");

CREATE INDEX "idx_backend_mutations_target" ON "backend_mutations" ("business_id","target_id");

CREATE INDEX "idx_execution_assignments_source" ON "execution_assignments" ("business_id","branch_id","execution_id");

CREATE INDEX "idx_execution_assignments_resource" ON "execution_assignments" ("business_id","branch_id","resource_id","start_local","end_local");

CREATE INDEX "idx_execution_assignments_space" ON "execution_assignments" ("business_id","branch_id","space_id","start_local","end_local");

CREATE INDEX "idx_execution_care_due" ON "execution_care_tasks" ("business_id","branch_id","execution_id","scheduled_date","completed_at");

CREATE INDEX "idx_execution_events_source" ON "execution_events" ("business_id","branch_id","execution_id","occurred_at","id");

CREATE UNIQUE INDEX "uq_hotel_spaces_scope" ON "hotel_spaces" ("business_id","branch_id","id");

CREATE INDEX "idx_hotel_spaces_branch" ON "hotel_spaces" ("business_id","branch_id","status");

CREATE UNIQUE INDEX "uq_operation_staff_scope" ON "operation_staff" ("business_id","id");

CREATE INDEX "idx_operation_staff_windows" ON "operation_staff_windows" ("business_id","staff_id","start_local","end_local");

CREATE UNIQUE INDEX "uq_service_executions_source" ON "service_executions" ("business_id","booking_id","pet_id","module");

CREATE UNIQUE INDEX "uq_service_executions_scope" ON "service_executions" ("business_id","branch_id","id");

CREATE INDEX "idx_executions_branch_module_range" ON "service_executions" ("business_id","branch_id","module","scheduled_start","id");

CREATE INDEX "idx_executions_customer" ON "service_executions" ("business_id","customer_id","branch_id","updated_at");

CREATE INDEX "idx_service_record_revisions" ON "service_record_revisions" ("business_id","branch_id","record_id","occurred_at","id");

CREATE UNIQUE INDEX "uq_service_records_source" ON "service_records" ("business_id","branch_id","execution_id");

CREATE UNIQUE INDEX "uq_service_records_scope" ON "service_records" ("business_id","branch_id","id");

CREATE INDEX "idx_service_records_history" ON "service_records" ("business_id","branch_id","customer_id","completed_at","id");

CREATE INDEX "idx_access_events_grant" ON "access_events" ("business_id","branch_id","grant_id","occurred_at");

CREATE UNIQUE INDEX "uq_access_grant_token" ON "access_grants" ("token_hash");

CREATE UNIQUE INDEX "uq_access_grant_consent" ON "access_grants" ("consent_id");

CREATE UNIQUE INDEX "uq_access_grant_scope" ON "access_grants" ("business_id","branch_id","id");

CREATE INDEX "idx_access_grant_expiry" ON "access_grants" ("business_id","branch_id","expires_at");

CREATE UNIQUE INDEX "uq_intake_source" ON "business_intakes" ("business_id","branch_id","grant_id","target_key");

CREATE UNIQUE INDEX "uq_intake_scope" ON "business_intakes" ("business_id","branch_id","id");

CREATE INDEX "idx_intake_branch" ON "business_intakes" ("business_id","branch_id","updated_at");

CREATE UNIQUE INDEX "uq_consent_scope" ON "consents" ("business_id","branch_id","id");

CREATE INDEX "idx_intake_corrections_source" ON "intake_corrections" ("business_id","branch_id","intake_id","created_at");

CREATE UNIQUE INDEX "uq_pet_authority_person" ON "pet_authorities" ("person_id","pet_id");

CREATE UNIQUE INDEX "uq_pet_authority_pet" ON "pet_authorities" ("id","pet_id");

CREATE UNIQUE INDEX "uq_business_channel_provider" ON "business_channels" ("business_id","provider");

CREATE UNIQUE INDEX "uq_channel_external_account" ON "business_channels" ("provider","external_account_id");

CREATE UNIQUE INDEX "uq_channel_scope" ON "business_channels" ("business_id","id");

CREATE UNIQUE INDEX "uq_channel_provider_message" ON "channel_webhook_events" ("channel_id","provider_message_id");

CREATE INDEX "idx_channel_pending_events" ON "channel_webhook_events" ("channel_id","state","received_at");

CREATE UNIQUE INDEX "uq_conversation_customer" ON "conversations" ("business_id","customer_id");

CREATE UNIQUE INDEX "uq_conversation_scope" ON "conversations" ("business_id","id");

CREATE UNIQUE INDEX "uq_channel_customer" ON "customer_channel_links" ("channel_id","customer_id");

CREATE UNIQUE INDEX "uq_channel_subject" ON "customer_channel_links" ("channel_id","external_subject");

CREATE UNIQUE INDEX "uq_channel_link_scope" ON "customer_channel_links" ("business_id","channel_id","id");

CREATE UNIQUE INDEX "uq_outbox_message" ON "message_outbox" ("business_id","branch_id","message_id");

CREATE UNIQUE INDEX "uq_outbox_retry_key" ON "message_outbox" ("retry_key");

CREATE INDEX "idx_outbox_due" ON "message_outbox" ("state","available_at","lease_until");

CREATE UNIQUE INDEX "uq_message_id" ON "messages" ("id");

CREATE UNIQUE INDEX "uq_message_scope" ON "messages" ("business_id","branch_id","id");

CREATE INDEX "idx_messages_conversation_order" ON "messages" ("business_id","conversation_id","branch_id","sequence");

CREATE UNIQUE INDEX "uq_external_identity_subject" ON "person_external_identities" ("provider","issuer","subject");

CREATE INDEX "idx_outbox_attempt_history" ON "outbox_attempts" ("outbox_id","started_at");

CREATE INDEX "idx_charge_events" ON "charge_events" ("business_id","branch_id","charge_id","occurred_at");

CREATE UNIQUE INDEX "uq_charge_source_event" ON "charge_items" ("charge_id","source_event_id");

CREATE INDEX "idx_charge_items" ON "charge_items" ("business_id","branch_id","charge_id");

CREATE UNIQUE INDEX "uq_charge_booking" ON "charges" ("business_id","branch_id","booking_id");

CREATE UNIQUE INDEX "uq_charge_scope" ON "charges" ("business_id","branch_id","id");

CREATE INDEX "idx_charge_customer" ON "charges" ("business_id","branch_id","customer_id","created_at");

CREATE INDEX "idx_payment_allocation_charge" ON "payment_allocations" ("business_id","branch_id","charge_id");

CREATE INDEX "idx_payment_attempt_history" ON "payment_attempt_events" ("business_id","branch_id","attempt_id","occurred_at");

CREATE UNIQUE INDEX "uq_payment_attempt_scope" ON "payment_attempts" ("business_id","branch_id","id");

CREATE UNIQUE INDEX "uq_payment_attempt_key" ON "payment_attempts" ("idempotency_key");

CREATE UNIQUE INDEX "uq_payment_attempt_provider_ref" ON "payment_attempts" ("account_id","provider_reference");

CREATE INDEX "idx_payment_attempt_due" ON "payment_attempts" ("state","next_attempt_at","lease_until");

CREATE INDEX "idx_payment_attempt_charge" ON "payment_attempts" ("business_id","branch_id","charge_id","state");

CREATE UNIQUE INDEX "uq_payment_account_scope" ON "payment_provider_accounts" ("business_id","id");

CREATE UNIQUE INDEX "uq_payment_external_account" ON "payment_provider_accounts" ("provider","external_account_id");

CREATE UNIQUE INDEX "uq_refund_scope" ON "payment_refunds" ("business_id","branch_id","id");

CREATE UNIQUE INDEX "uq_refund_payment_scope" ON "payment_refunds" ("business_id","branch_id","payment_id","id");

CREATE INDEX "idx_refund_payment" ON "payment_refunds" ("business_id","branch_id","payment_id");

CREATE INDEX "idx_refund_branch_date" ON "payment_refunds" ("business_id","branch_id","recorded_at");

CREATE INDEX "idx_payment_webhook_review" ON "payment_webhook_events" ("business_id","state","received_at");

CREATE UNIQUE INDEX "uq_payment_scope" ON "payments" ("business_id","branch_id","id");

CREATE UNIQUE INDEX "uq_payment_attempt" ON "payments" ("attempt_id");

CREATE UNIQUE INDEX "uq_payment_provider_ref" ON "payments" ("account_id","provider_reference");

CREATE INDEX "idx_payment_branch_date" ON "payments" ("business_id","branch_id","occurred_at");

CREATE INDEX "idx_payment_customer" ON "payments" ("business_id","customer_id","branch_id","occurred_at");

CREATE INDEX "idx_refund_allocation_charge" ON "refund_allocations" ("business_id","branch_id","charge_id");

CREATE UNIQUE INDEX "uq_execution_event_scope" ON "execution_events" ("business_id","branch_id","id");

CREATE UNIQUE INDEX uq_charge_base_item ON charge_items(charge_id) WHERE kind='base-service';

ALTER TABLE "audit_events" ADD FOREIGN KEY ("actor_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "audit_events" ADD FOREIGN KEY ("actor_membership_id") REFERENCES "business_memberships"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "audit_events" ADD FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "audit_events" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "branch_enabled_modules" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "branch_enabled_modules" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "branch_operating_hours" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "branch_operating_hours" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "branches" ADD FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "branches" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "branches" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "business_memberships" ADD FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "business_memberships" ADD FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "business_memberships" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "business_memberships" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "businesses" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "businesses" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "membership_branch_access" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "membership_branch_access" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "membership_branch_access" ADD FOREIGN KEY ("membership_id","business_id") REFERENCES "business_memberships"("id","business_id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "membership_branch_access" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "business_pet_profiles" ADD FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "business_pet_profiles" ADD FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "business_pet_profiles" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "business_pet_profiles" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "customer_pet_relationships" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "customer_pet_relationships" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "customer_pet_relationships" ADD FOREIGN KEY ("business_id","customer_id") REFERENCES "customers"("business_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "customer_pet_relationships" ADD FOREIGN KEY ("business_id","pet_id") REFERENCES "business_pet_profiles"("business_id","pet_id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "customer_tags" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "customer_tags" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "customer_tags" ADD FOREIGN KEY ("business_id","customer_id") REFERENCES "customers"("business_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "customers" ADD FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "customers" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "customers" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "pets" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_pets" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_pets" ADD FOREIGN KEY ("business_id","branch_id","booking_id") REFERENCES "bookings"("business_id","branch_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_pets" ADD FOREIGN KEY ("business_id","pet_id") REFERENCES "business_pet_profiles"("business_id","pet_id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resource_assignments" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resource_assignments" ADD FOREIGN KEY ("business_id","branch_id","booking_id") REFERENCES "bookings"("business_id","branch_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resource_assignments" ADD FOREIGN KEY ("business_id","branch_id","resource_id") REFERENCES "booking_resources"("business_id","branch_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resource_availability_windows" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resource_availability_windows" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resource_availability_windows" ADD FOREIGN KEY ("business_id","branch_id","resource_id") REFERENCES "booking_resources"("business_id","branch_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resource_reservations" ADD FOREIGN KEY ("business_id","branch_id","booking_id","resource_id") REFERENCES "booking_resource_assignments"("business_id","branch_id","booking_id","resource_id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resource_service_links" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resource_service_links" ADD FOREIGN KEY ("business_id","branch_id","resource_id") REFERENCES "booking_resources"("business_id","branch_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resource_service_links" ADD FOREIGN KEY ("business_id","branch_id","service_id") REFERENCES "booking_services"("business_id","branch_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resources" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resources" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_resources" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_service_resource_requirements" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_service_resource_requirements" ADD FOREIGN KEY ("business_id","branch_id","service_id") REFERENCES "booking_services"("business_id","branch_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_services" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_services" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_services" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "booking_write_commits" ADD FOREIGN KEY ("business_id","branch_id","booking_id") REFERENCES "bookings"("business_id","branch_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "bookings" ADD FOREIGN KEY ("created_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "bookings" ADD FOREIGN KEY ("updated_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "bookings" ADD FOREIGN KEY ("cancelled_by_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "bookings" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "bookings" ADD FOREIGN KEY ("business_id","customer_id") REFERENCES "customers"("business_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "bookings" ADD FOREIGN KEY ("business_id","branch_id","service_id") REFERENCES "booking_services"("business_id","branch_id","id") ON UPDATE no action ON DELETE restrict;

ALTER TABLE "backend_mutations" ADD FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "backend_mutations" ADD FOREIGN KEY ("actor_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "backend_mutations" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "execution_assignments" ADD FOREIGN KEY ("assigned_by") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "execution_assignments" ADD FOREIGN KEY ("business_id","branch_id","execution_id") REFERENCES "service_executions"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "execution_assignments" ADD FOREIGN KEY ("business_id","branch_id","resource_id") REFERENCES "booking_resources"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "execution_assignments" ADD FOREIGN KEY ("business_id","branch_id","space_id") REFERENCES "hotel_spaces"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "execution_assignments" ADD FOREIGN KEY ("business_id","staff_id") REFERENCES "operation_staff"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "execution_care_tasks" ADD FOREIGN KEY ("completed_by") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "execution_care_tasks" ADD FOREIGN KEY ("business_id","branch_id","execution_id") REFERENCES "service_executions"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "execution_care_tasks" ADD FOREIGN KEY ("business_id","staff_id") REFERENCES "operation_staff"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "execution_events" ADD FOREIGN KEY ("actor_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "execution_events" ADD FOREIGN KEY ("business_id","branch_id","execution_id") REFERENCES "service_executions"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "hotel_spaces" ADD FOREIGN KEY ("business_id","branch_id","service_id") REFERENCES "booking_services"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "operation_staff" ADD FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "operation_staff" ADD FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "operation_staff_branches" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "operation_staff_branches" ADD FOREIGN KEY ("business_id","staff_id") REFERENCES "operation_staff"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "operation_staff_windows" ADD FOREIGN KEY ("business_id","staff_id") REFERENCES "operation_staff"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "service_executions" ADD FOREIGN KEY ("business_id","branch_id","booking_id") REFERENCES "bookings"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "service_executions" ADD FOREIGN KEY ("business_id","customer_id") REFERENCES "customers"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "service_executions" ADD FOREIGN KEY ("business_id","pet_id") REFERENCES "business_pet_profiles"("business_id","pet_id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "service_record_revisions" ADD FOREIGN KEY ("actor_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "service_record_revisions" ADD FOREIGN KEY ("business_id","branch_id","record_id") REFERENCES "service_records"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "service_records" ADD FOREIGN KEY ("business_id","branch_id","execution_id") REFERENCES "service_executions"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "service_records" ADD FOREIGN KEY ("business_id","customer_id") REFERENCES "customers"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "service_records" ADD FOREIGN KEY ("business_id","pet_id") REFERENCES "business_pet_profiles"("business_id","pet_id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "access_events" ADD FOREIGN KEY ("actor_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "access_events" ADD FOREIGN KEY ("business_id","branch_id","grant_id") REFERENCES "access_grants"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "access_grant_scopes" ADD FOREIGN KEY ("grant_id") REFERENCES "access_grants"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "access_grants" ADD FOREIGN KEY ("business_id","branch_id","consent_id") REFERENCES "consents"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "business_intakes" ADD FOREIGN KEY ("created_by") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "business_intakes" ADD FOREIGN KEY ("business_id","branch_id","grant_id") REFERENCES "access_grants"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "business_intakes" ADD FOREIGN KEY ("business_id","branch_id","execution_id") REFERENCES "service_executions"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "business_intakes" ADD FOREIGN KEY ("business_id","customer_id") REFERENCES "customers"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "business_intakes" ADD FOREIGN KEY ("business_id","pet_id") REFERENCES "business_pet_profiles"("business_id","pet_id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "consents" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "consents" ADD FOREIGN KEY ("authority_id","pet_id") REFERENCES "pet_authorities"("id","pet_id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "intake_corrections" ADD FOREIGN KEY ("actor_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "intake_corrections" ADD FOREIGN KEY ("business_id","branch_id","intake_id") REFERENCES "business_intakes"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "passport_profiles" ADD FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "pet_authorities" ADD FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "pet_authorities" ADD FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "business_channels" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "channel_webhook_events" ADD FOREIGN KEY ("business_id","channel_id") REFERENCES "business_channels"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "channel_webhook_events" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "channel_webhook_events" ADD FOREIGN KEY ("business_id","branch_id","message_id") REFERENCES "messages"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "conversation_contexts" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "conversation_contexts" ADD FOREIGN KEY ("business_id","conversation_id") REFERENCES "conversations"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "conversation_contexts" ADD FOREIGN KEY ("business_id","pet_id") REFERENCES "business_pet_profiles"("business_id","pet_id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "conversation_contexts" ADD FOREIGN KEY ("business_id","branch_id","booking_id") REFERENCES "bookings"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "conversation_contexts" ADD FOREIGN KEY ("business_id","branch_id","execution_id") REFERENCES "service_executions"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "conversation_reads" ADD FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "conversation_reads" ADD FOREIGN KEY ("business_id","branch_id","conversation_id") REFERENCES "conversation_contexts"("business_id","branch_id","conversation_id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "conversations" ADD FOREIGN KEY ("business_id","customer_id") REFERENCES "customers"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "customer_channel_links" ADD FOREIGN KEY ("business_id","channel_id") REFERENCES "business_channels"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "customer_channel_links" ADD FOREIGN KEY ("business_id","customer_id") REFERENCES "customers"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "message_approvals" ADD FOREIGN KEY ("authority_id") REFERENCES "pet_authorities"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "message_approvals" ADD FOREIGN KEY ("business_id","branch_id","message_id") REFERENCES "messages"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "message_outbox" ADD FOREIGN KEY ("business_id","branch_id","message_id") REFERENCES "messages"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "message_outbox" ADD FOREIGN KEY ("business_id","channel_id","link_id") REFERENCES "customer_channel_links"("business_id","channel_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "message_outbox" ADD FOREIGN KEY ("business_id","channel_id") REFERENCES "business_channels"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "messages" ADD FOREIGN KEY ("actor_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "messages" ADD FOREIGN KEY ("business_id","branch_id","conversation_id") REFERENCES "conversation_contexts"("business_id","branch_id","conversation_id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "messages" ADD FOREIGN KEY ("business_id","pet_id") REFERENCES "business_pet_profiles"("business_id","pet_id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "messages" ADD FOREIGN KEY ("business_id","branch_id","booking_id") REFERENCES "bookings"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "messages" ADD FOREIGN KEY ("business_id","branch_id","execution_id") REFERENCES "service_executions"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "person_external_identities" ADD FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "outbox_attempts" ADD FOREIGN KEY ("outbox_id") REFERENCES "message_outbox"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "charge_events" ADD FOREIGN KEY ("actor_person_id") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "charge_events" ADD FOREIGN KEY ("business_id","branch_id","charge_id") REFERENCES "charges"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "charge_items" ADD FOREIGN KEY ("business_id","branch_id","charge_id") REFERENCES "charges"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "charge_items" ADD FOREIGN KEY ("business_id","branch_id","execution_id") REFERENCES "service_executions"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "charge_items" ADD FOREIGN KEY ("business_id","branch_id","source_event_id") REFERENCES "execution_events"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "charges" ADD FOREIGN KEY ("created_by") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "charges" ADD FOREIGN KEY ("business_id","branch_id","booking_id") REFERENCES "bookings"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "charges" ADD FOREIGN KEY ("business_id","customer_id") REFERENCES "customers"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "charges" ADD FOREIGN KEY ("business_id","pet_id") REFERENCES "business_pet_profiles"("business_id","pet_id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "charges" ADD FOREIGN KEY ("business_id","branch_id","execution_id") REFERENCES "service_executions"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payment_allocations" ADD FOREIGN KEY ("business_id","branch_id","payment_id") REFERENCES "payments"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payment_allocations" ADD FOREIGN KEY ("business_id","branch_id","charge_id") REFERENCES "charges"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payment_attempt_events" ADD FOREIGN KEY ("business_id","branch_id","attempt_id") REFERENCES "payment_attempts"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payment_attempts" ADD FOREIGN KEY ("created_by") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payment_attempts" ADD FOREIGN KEY ("business_id","branch_id","charge_id") REFERENCES "charges"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payment_attempts" ADD FOREIGN KEY ("business_id","account_id") REFERENCES "payment_provider_accounts"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payment_provider_accounts" ADD FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payment_refunds" ADD FOREIGN KEY ("recorded_by") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payment_refunds" ADD FOREIGN KEY ("business_id","branch_id","payment_id") REFERENCES "payments"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payment_webhook_events" ADD FOREIGN KEY ("attempt_id") REFERENCES "payment_attempts"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payment_webhook_events" ADD FOREIGN KEY ("business_id","account_id") REFERENCES "payment_provider_accounts"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payments" ADD FOREIGN KEY ("recorded_by") REFERENCES "persons"("id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payments" ADD FOREIGN KEY ("business_id","branch_id") REFERENCES "branches"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payments" ADD FOREIGN KEY ("business_id","customer_id") REFERENCES "customers"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payments" ADD FOREIGN KEY ("business_id","branch_id","attempt_id") REFERENCES "payment_attempts"("business_id","branch_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "payments" ADD FOREIGN KEY ("business_id","account_id") REFERENCES "payment_provider_accounts"("business_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "refund_allocations" ADD FOREIGN KEY ("business_id","branch_id","payment_id","refund_id") REFERENCES "payment_refunds"("business_id","branch_id","payment_id","id") ON UPDATE no action ON DELETE no action;

ALTER TABLE "refund_allocations" ADD FOREIGN KEY ("business_id","branch_id","payment_id","charge_id") REFERENCES "payment_allocations"("business_id","branch_id","payment_id","charge_id") ON UPDATE no action ON DELETE no action;

CREATE VIEW be4_staff_slots AS
SELECT business_id,staff_id,state,(extract(epoch from (start_local)::timestamp)::bigint)/60 AS start_minute,
  (extract(epoch from (end_local)::timestamp)::bigint)/60 + CASE WHEN length(end_local)=10 AND end_local=start_local THEN 1440 ELSE 0 END AS end_minute
FROM operation_staff_windows;

CREATE FUNCTION trg_be3_reservation_exclusive_conflict_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF EXISTS (
  SELECT 1
  FROM "bookings" candidate
  INNER JOIN "booking_resources" resource
    ON resource.business_id = NEW.business_id
   AND resource.branch_id = NEW.branch_id
   AND resource.id = NEW.resource_id
  WHERE candidate.business_id = NEW.business_id
    AND candidate.branch_id = NEW.branch_id
    AND candidate.id = NEW.booking_id
    AND candidate.status <> 'cancelled'
    AND resource.capacity_mode = 'exclusive'
    AND EXISTS (
      SELECT 1
      FROM "booking_resource_reservations" occupied
      INNER JOIN "bookings" existing
        ON existing.business_id = occupied.business_id
       AND existing.branch_id = occupied.branch_id
       AND existing.id = occupied.booking_id
      WHERE occupied.business_id = NEW.business_id
        AND occupied.branch_id = NEW.branch_id
        AND occupied.resource_id = NEW.resource_id
        AND occupied.booking_id <> NEW.booking_id
        AND existing.status <> 'cancelled'
        AND occupied.start_minute < NEW.end_minute
        AND occupied.end_minute > NEW.start_minute
    )
) THEN
RAISE EXCEPTION 'BE3_TIME_CONFLICT';

END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER "trg_be3_reservation_exclusive_conflict" BEFORE INSERT ON "booking_resource_reservations" FOR EACH ROW EXECUTE FUNCTION trg_be3_reservation_exclusive_conflict_fn();

CREATE FUNCTION trg_be3_reservation_capacity_conflict_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF EXISTS (
  SELECT 1
  FROM "bookings" candidate
  INNER JOIN "booking_resources" resource
    ON resource.business_id = NEW.business_id
   AND resource.branch_id = NEW.branch_id
   AND resource.id = NEW.resource_id
  WHERE candidate.business_id = NEW.business_id
    AND candidate.branch_id = NEW.branch_id
    AND candidate.id = NEW.booking_id
    AND candidate.status <> 'cancelled'
    AND resource.capacity_mode = 'capacity'
    AND (
      NEW.reservation_date IS NULL
      OR NEW.units + COALESCE((
        SELECT SUM(occupied.units)
        FROM "booking_resource_reservations" occupied
        INNER JOIN "bookings" existing
          ON existing.business_id = occupied.business_id
         AND existing.branch_id = occupied.branch_id
         AND existing.id = occupied.booking_id
        WHERE occupied.business_id = NEW.business_id
          AND occupied.branch_id = NEW.branch_id
          AND occupied.resource_id = NEW.resource_id
          AND occupied.reservation_date = NEW.reservation_date
          AND occupied.booking_id <> NEW.booking_id
          AND existing.status <> 'cancelled'
      ), 0) > resource.capacity
    )
) THEN
RAISE EXCEPTION 'BE3_CAPACITY_CONFLICT';

END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER "trg_be3_reservation_capacity_conflict" BEFORE INSERT ON "booking_resource_reservations" FOR EACH ROW EXECUTE FUNCTION trg_be3_reservation_capacity_conflict_fn();

CREATE FUNCTION trg_be3_booking_commit_guard_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS (
    SELECT 1 FROM "bookings" booking
    WHERE booking.business_id = NEW.business_id
      AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id
      AND booking.revision = NEW.revision
      AND booking.write_token = NEW.write_token
  ) THEN RAISE EXCEPTION 'BE3_RESERVATION_INTEGRITY'; END IF;

  IF EXISTS (
    SELECT 1 FROM "bookings" booking
    INNER JOIN "branches" branch
      ON branch.business_id = booking.business_id AND branch.id = booking.branch_id
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND branch.status <> 'active'
  ) THEN RAISE EXCEPTION 'BE3_BRANCH_INACTIVE'; END IF;

  IF EXISTS (
    SELECT 1 FROM "bookings" booking
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM "branch_enabled_modules" enabled
        WHERE enabled.business_id = booking.business_id
          AND enabled.branch_id = booking.branch_id
          AND enabled.module = booking.service_module
      )
  ) THEN RAISE EXCEPTION 'BE3_MODULE_DISABLED'; END IF;

  IF EXISTS (
    SELECT 1 FROM "bookings" booking
    LEFT JOIN "booking_services" service
      ON service.business_id = booking.business_id
     AND service.branch_id = booking.branch_id
     AND service.id = booking.service_id
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND (service.id IS NULL OR service.status <> 'active'
        OR service.module <> booking.service_module OR service.time_model <> booking.time_model)
  ) THEN RAISE EXCEPTION 'BE3_SERVICE_UNAVAILABLE'; END IF;

  IF EXISTS (
    SELECT 1 FROM "bookings" booking
    LEFT JOIN "customers" customer
      ON customer.business_id = booking.business_id AND customer.id = booking.customer_id
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND (customer.id IS NULL OR customer.status <> 'active')
  ) THEN RAISE EXCEPTION 'BE3_CUSTOMER_UNAVAILABLE'; END IF;

  IF EXISTS (
    SELECT 1 FROM "bookings" booking
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM "booking_pets" pet
        WHERE pet.business_id = booking.business_id
          AND pet.branch_id = booking.branch_id
          AND pet.booking_id = booking.id
      )
  ) THEN RAISE EXCEPTION 'BE3_PET_UNAVAILABLE'; END IF;

  IF EXISTS (
    SELECT 1
    FROM "booking_pets" pet
    INNER JOIN "bookings" booking
      ON booking.business_id = pet.business_id
     AND booking.branch_id = pet.branch_id
     AND booking.id = pet.booking_id
    LEFT JOIN "business_pet_profiles" profile
      ON profile.business_id = pet.business_id AND profile.pet_id = pet.pet_id
    WHERE pet.business_id = NEW.business_id AND pet.branch_id = NEW.branch_id
      AND pet.booking_id = NEW.booking_id AND booking.status <> 'cancelled'
      AND (profile.pet_id IS NULL OR profile.status <> 'active')
  ) THEN RAISE EXCEPTION 'BE3_PET_UNAVAILABLE'; END IF;

  IF EXISTS (
    SELECT 1
    FROM "booking_pets" pet
    INNER JOIN "bookings" booking
      ON booking.business_id = pet.business_id
     AND booking.branch_id = pet.branch_id
     AND booking.id = pet.booking_id
    WHERE pet.business_id = NEW.business_id AND pet.branch_id = NEW.branch_id
      AND pet.booking_id = NEW.booking_id AND booking.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM "customer_pet_relationships" relationship
        WHERE relationship.business_id = booking.business_id
          AND relationship.customer_id = booking.customer_id
          AND relationship.pet_id = pet.pet_id
          AND relationship.status = 'active'
      )
  ) THEN RAISE EXCEPTION 'BE3_RELATIONSHIP_MISSING'; END IF;

  IF EXISTS (
    SELECT 1
    FROM "bookings" booking
    INNER JOIN "booking_service_resource_requirements" requirement
      ON requirement.business_id = booking.business_id
     AND requirement.branch_id = booking.branch_id
     AND requirement.service_id = booking.service_id
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1
        FROM "booking_resource_assignments" assignment
        INNER JOIN "booking_resources" resource
          ON resource.business_id = assignment.business_id
         AND resource.branch_id = assignment.branch_id
         AND resource.id = assignment.resource_id
        WHERE assignment.business_id = booking.business_id
          AND assignment.branch_id = booking.branch_id
          AND assignment.booking_id = booking.id
          AND resource.kind = requirement.resource_kind
      )
  ) THEN RAISE EXCEPTION 'BE3_MISSING_RESOURCE'; END IF;

  IF EXISTS (
    SELECT 1
    FROM "booking_resource_assignments" assignment
    INNER JOIN "bookings" booking
      ON booking.business_id = assignment.business_id
     AND booking.branch_id = assignment.branch_id
     AND booking.id = assignment.booking_id
    LEFT JOIN "booking_resources" resource
      ON resource.business_id = assignment.business_id
     AND resource.branch_id = assignment.branch_id
     AND resource.id = assignment.resource_id
    WHERE assignment.business_id = NEW.business_id AND assignment.branch_id = NEW.branch_id
      AND assignment.booking_id = NEW.booking_id AND booking.status <> 'cancelled'
      AND (resource.id IS NULL OR resource.status <> 'active' OR resource.module <> booking.service_module
        OR NOT EXISTS (
          SELECT 1 FROM "booking_resource_service_links" link
          WHERE link.business_id = booking.business_id
            AND link.branch_id = booking.branch_id
            AND link.resource_id = assignment.resource_id
            AND link.service_id = booking.service_id
        ))
  ) THEN RAISE EXCEPTION 'BE3_RESOURCE_UNAVAILABLE'; END IF;

  IF EXISTS (
    SELECT 1
    FROM "bookings" booking
    INNER JOIN "branch_operating_hours" hours
      ON hours.business_id = booking.business_id
     AND hours.branch_id = booking.branch_id
     AND hours.weekday = booking.start_weekday
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND hours.closed = 1
  ) THEN RAISE EXCEPTION 'BE3_BRANCH_CLOSED'; END IF;

  IF EXISTS (
    SELECT 1
    FROM "bookings" booking
    INNER JOIN "branch_operating_hours" hours
      ON hours.business_id = booking.business_id
     AND hours.branch_id = booking.branch_id
     AND hours.weekday = booking.start_weekday
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND booking.time_model = 'appointment' AND hours.closed = 0
      AND (substr(booking.start_local, 12, 5) < hours.opens_at
        OR substr(booking.end_local, 12, 5) > hours.closes_at)
  ) THEN RAISE EXCEPTION 'BE3_OUTSIDE_OPERATING_HOURS'; END IF;

  IF EXISTS (
    SELECT 1
    FROM "booking_resource_assignments" assignment
    INNER JOIN "bookings" booking
      ON booking.business_id = assignment.business_id
     AND booking.branch_id = assignment.branch_id
     AND booking.id = assignment.booking_id
    INNER JOIN "booking_resources" resource
      ON resource.business_id = assignment.business_id
     AND resource.branch_id = assignment.branch_id
     AND resource.id = assignment.resource_id
    WHERE assignment.business_id = NEW.business_id AND assignment.branch_id = NEW.branch_id
      AND assignment.booking_id = NEW.booking_id AND booking.status <> 'cancelled'
      AND resource.compatibility_staff_id IS NOT NULL
      AND (
        (EXISTS (
          SELECT 1 FROM "booking_resource_availability_windows" working
          WHERE working.business_id = assignment.business_id
            AND working.branch_id = assignment.branch_id
            AND working.resource_id = assignment.resource_id
            AND working.state = 'working'
            AND CAST(working.start_minute / 1440 AS INTEGER) <= CAST((booking.end_minute - 1) / 1440 AS INTEGER)
            AND CAST((working.end_minute - 1) / 1440 AS INTEGER) >= CAST(booking.start_minute / 1440 AS INTEGER)
        ) AND NOT EXISTS (
          SELECT 1 FROM "booking_resource_availability_windows" working
          WHERE working.business_id = assignment.business_id
            AND working.branch_id = assignment.branch_id
            AND working.resource_id = assignment.resource_id
            AND working.state = 'working'
            AND booking.start_minute >= working.start_minute
            AND booking.end_minute <= working.end_minute
        ))
        OR EXISTS (
          SELECT 1 FROM "booking_resource_availability_windows" blocked
          WHERE blocked.business_id = assignment.business_id
            AND blocked.branch_id = assignment.branch_id
            AND blocked.resource_id = assignment.resource_id
            AND blocked.state <> 'working'
            AND blocked.start_minute < booking.end_minute
            AND blocked.end_minute > booking.start_minute
        )
      )
  ) THEN RAISE EXCEPTION 'BE3_STAFF_UNAVAILABLE'; END IF;

  IF EXISTS (
    SELECT 1
    FROM "booking_resource_assignments" assignment
    INNER JOIN "bookings" booking
      ON booking.business_id = assignment.business_id
     AND booking.branch_id = assignment.branch_id
     AND booking.id = assignment.booking_id
    INNER JOIN "booking_resources" resource
      ON resource.business_id = assignment.business_id
     AND resource.branch_id = assignment.branch_id
     AND resource.id = assignment.resource_id
    WHERE assignment.business_id = NEW.business_id AND assignment.branch_id = NEW.branch_id
      AND assignment.booking_id = NEW.booking_id
      AND (
        (resource.capacity_mode = 'exclusive' AND (
          SELECT COUNT(*) FROM "booking_resource_reservations" reservation
          WHERE reservation.business_id = assignment.business_id
            AND reservation.branch_id = assignment.branch_id
            AND reservation.booking_id = assignment.booking_id
            AND reservation.resource_id = assignment.resource_id
            AND reservation.reservation_key = 'interval'
            AND reservation.reservation_date IS NULL
            AND reservation.start_minute = booking.start_minute
            AND reservation.end_minute = booking.end_minute
            AND reservation.units = 1
        ) <> 1)
        OR (resource.capacity_mode = 'capacity' AND (
          SELECT COUNT(*) FROM "booking_resource_reservations" reservation
          WHERE reservation.business_id = assignment.business_id
            AND reservation.branch_id = assignment.branch_id
            AND reservation.booking_id = assignment.booking_id
            AND reservation.resource_id = assignment.resource_id
            AND reservation.reservation_date IS NOT NULL
            AND reservation.units = (
              SELECT COUNT(*) FROM "booking_pets" pet
              WHERE pet.business_id = booking.business_id
                AND pet.branch_id = booking.branch_id
                AND pet.booking_id = booking.id
            )
        ) <> (CAST((booking.end_minute - 1) / 1440 AS INTEGER) - CAST(booking.start_minute / 1440 AS INTEGER) + 1))
      )
  ) THEN RAISE EXCEPTION 'BE3_RESERVATION_INTEGRITY'; END IF;

RETURN NEW;
END; $$;
CREATE TRIGGER "trg_be3_booking_commit_guard" BEFORE INSERT ON "booking_write_commits" FOR EACH ROW EXECUTE FUNCTION trg_be3_booking_commit_guard_fn();

CREATE FUNCTION trg_be4_execution_source_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS (
    SELECT 1 FROM bookings b JOIN booking_pets p ON p.business_id=b.business_id AND p.branch_id=b.branch_id AND p.booking_id=b.id
    WHERE b.business_id=NEW.business_id AND b.branch_id=NEW.branch_id AND b.id=NEW.booking_id
      AND b.customer_id=NEW.customer_id AND p.pet_id=NEW.pet_id AND b.service_module=NEW.module
  ) THEN RAISE EXCEPTION 'BE4_SCOPE'; END IF;

RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_execution_source BEFORE INSERT ON service_executions FOR EACH ROW EXECUTE FUNCTION trg_be4_execution_source_fn();

CREATE FUNCTION trg_be4_assignment_scope_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.resource_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM booking_resources r JOIN service_executions e ON e.business_id=r.business_id AND e.branch_id=r.branch_id
    JOIN bookings b ON b.business_id=e.business_id AND b.branch_id=e.branch_id AND b.id=e.booking_id
    JOIN booking_resource_service_links l ON l.business_id=r.business_id AND l.branch_id=r.branch_id AND l.resource_id=r.id AND l.service_id=b.service_id
    WHERE r.business_id=NEW.business_id AND r.branch_id=NEW.branch_id AND r.id=NEW.resource_id AND e.id=NEW.execution_id
      AND r.status='active' AND r.module=e.module AND ((e.module='grooming' AND r.kind IN ('groomer','grooming-station','dryer')) OR (e.module='daycare' AND r.kind='daycare-zone'))
  ) THEN RAISE EXCEPTION 'BE4_RESOURCE'; END IF;
  IF NEW.space_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM hotel_spaces s JOIN service_executions e ON e.business_id=s.business_id AND e.branch_id=s.branch_id
    JOIN bookings b ON b.business_id=e.business_id AND b.branch_id=e.branch_id AND b.id=e.booking_id AND b.service_id=s.service_id
    WHERE s.business_id=NEW.business_id AND s.branch_id=NEW.branch_id AND s.id=NEW.space_id AND s.status='active' AND e.id=NEW.execution_id AND e.module='hotel'
  ) THEN RAISE EXCEPTION 'BE4_RESOURCE'; END IF;
  IF NEW.staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM operation_staff s JOIN operation_staff_branches a ON a.business_id=s.business_id AND a.staff_id=s.id
    JOIN service_executions e ON e.business_id=a.business_id AND e.branch_id=a.branch_id
    WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND s.id=NEW.staff_id AND e.id=NEW.execution_id
      AND s.status='active' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text((s.capabilities_json)::jsonb) AS je(value) WHERE value=e.module)
  ) THEN RAISE EXCEPTION 'BE4_STAFF'; END IF;

RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_assignment_scope BEFORE INSERT ON execution_assignments FOR EACH ROW EXECUTE FUNCTION trg_be4_assignment_scope_fn();

CREATE FUNCTION trg_be4_grooming_capacity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.resource_id IS NOT NULL AND EXISTS(SELECT 1 FROM service_executions WHERE id=NEW.execution_id AND module='grooming' AND status<>'cancelled') THEN
IF EXISTS (
    SELECT 1 FROM execution_assignments a JOIN service_executions e ON e.id=a.execution_id AND e.business_id=a.business_id AND e.branch_id=a.branch_id
    JOIN service_executions target ON target.id=NEW.execution_id
    WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND a.resource_id=NEW.resource_id
      AND e.booking_id<>target.booking_id AND e.status<>'cancelled' AND a.start_local<NEW.end_local AND NEW.start_local<a.end_local
  ) OR EXISTS (
    SELECT 1 FROM booking_resource_reservations r JOIN bookings b ON b.business_id=r.business_id AND b.branch_id=r.branch_id AND b.id=r.booking_id
    JOIN service_executions target ON target.id=NEW.execution_id
    WHERE r.business_id=NEW.business_id AND r.branch_id=NEW.branch_id AND r.resource_id=NEW.resource_id AND b.id<>target.booking_id
      AND b.status<>'cancelled' AND b.start_local<NEW.end_local AND NEW.start_local<b.end_local
  ) THEN RAISE EXCEPTION 'BE4_CAPACITY'; END IF;

END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_grooming_capacity BEFORE INSERT ON execution_assignments FOR EACH ROW EXECUTE FUNCTION trg_be4_grooming_capacity_fn();

CREATE FUNCTION trg_be4_hotel_capacity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.space_id IS NOT NULL AND NEW.start_local<NEW.end_local AND EXISTS(SELECT 1 FROM service_executions WHERE id=NEW.execution_id AND status NOT IN ('checked-out','completed','cancelled','no-show')) THEN
IF EXISTS (
    WITH RECURSIVE days(day) AS (
      SELECT NEW.start_local UNION ALL SELECT ((day)::date + 1)::text FROM days WHERE ((day)::date + 1)::text<NEW.end_local
    )
    SELECT 1 FROM days d WHERE 1+(
      SELECT count(DISTINCT a.execution_id) FROM execution_assignments a JOIN service_executions e ON e.business_id=a.business_id AND e.branch_id=a.branch_id AND e.id=a.execution_id
      WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND a.space_id=NEW.space_id AND a.execution_id<>NEW.execution_id
        AND e.status NOT IN ('checked-out','completed','cancelled','no-show') AND a.start_local<=d.day AND a.end_local>d.day
    ) > (SELECT capacity FROM hotel_spaces WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND id=NEW.space_id)
  ) THEN RAISE EXCEPTION 'BE4_CAPACITY'; END IF;

END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_hotel_capacity BEFORE INSERT ON execution_assignments FOR EACH ROW EXECUTE FUNCTION trg_be4_hotel_capacity_fn();

CREATE FUNCTION trg_be4_daycare_capacity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.resource_id IS NOT NULL AND EXISTS(SELECT 1 FROM service_executions WHERE id=NEW.execution_id AND module='daycare' AND status IN ('checked-in','active','ready-for-pickup')) THEN
IF 1+(
    SELECT count(DISTINCT a.execution_id) FROM execution_assignments a JOIN service_executions e ON e.id=a.execution_id AND e.business_id=a.business_id AND e.branch_id=a.branch_id
    WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND a.resource_id=NEW.resource_id AND a.execution_id<>NEW.execution_id
      AND e.status IN ('checked-in','active','ready-for-pickup') AND a.start_local<NEW.end_local AND NEW.start_local<a.end_local
  ) > (SELECT capacity FROM booking_resources WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND id=NEW.resource_id)
  THEN RAISE EXCEPTION 'BE4_CAPACITY'; END IF;

END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_daycare_capacity BEFORE INSERT ON execution_assignments FOR EACH ROW EXECUTE FUNCTION trg_be4_daycare_capacity_fn();

CREATE FUNCTION trg_be4_events_immutable_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE4_IMMUTABLE_EVENT'; 
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_events_immutable_update BEFORE UPDATE ON execution_events FOR EACH ROW EXECUTE FUNCTION trg_be4_events_immutable_update_fn();

CREATE FUNCTION trg_be4_events_immutable_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE4_IMMUTABLE_EVENT'; 
RETURN OLD;
END; $$;
CREATE TRIGGER trg_be4_events_immutable_delete BEFORE DELETE ON execution_events FOR EACH ROW EXECUTE FUNCTION trg_be4_events_immutable_delete_fn();

CREATE FUNCTION trg_be4_record_revisions_immutable_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE4_IMMUTABLE_EVENT'; 
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_record_revisions_immutable_update BEFORE UPDATE ON service_record_revisions FOR EACH ROW EXECUTE FUNCTION trg_be4_record_revisions_immutable_update_fn();

CREATE FUNCTION trg_be4_record_revisions_immutable_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE4_IMMUTABLE_EVENT'; 
RETURN OLD;
END; $$;
CREATE TRIGGER trg_be4_record_revisions_immutable_delete BEFORE DELETE ON service_record_revisions FOR EACH ROW EXECUTE FUNCTION trg_be4_record_revisions_immutable_delete_fn();

CREATE FUNCTION trg_be4_booking_staff_guard_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF EXISTS(
    SELECT 1 FROM bookings b JOIN booking_resource_assignments a ON a.business_id=b.business_id AND a.branch_id=b.branch_id AND a.booking_id=b.id
    JOIN booking_resources r ON r.business_id=a.business_id AND r.branch_id=a.branch_id AND r.id=a.resource_id
    WHERE b.business_id=NEW.business_id AND b.branch_id=NEW.branch_id AND b.id=NEW.booking_id AND b.status<>'cancelled' AND r.compatibility_staff_id IS NOT NULL
    AND (NOT EXISTS(SELECT 1 FROM operation_staff s JOIN operation_staff_branches l ON l.business_id=s.business_id AND l.staff_id=s.id
      WHERE s.business_id=b.business_id AND s.id=r.compatibility_staff_id AND l.branch_id=b.branch_id AND s.status='active'
        AND EXISTS(SELECT 1 FROM jsonb_array_elements_text((s.capabilities_json)::jsonb) AS je(value) WHERE value='grooming'))
      OR EXISTS(SELECT 1 FROM be4_staff_slots w WHERE w.business_id=b.business_id AND w.staff_id=r.compatibility_staff_id AND w.state<>'working' AND w.start_minute<b.end_minute AND b.start_minute<w.end_minute)
      OR (EXISTS(SELECT 1 FROM be4_staff_slots w WHERE w.business_id=b.business_id AND w.staff_id=r.compatibility_staff_id AND w.state='working'
        AND w.start_minute/1440 <= (b.end_minute-1)/1440 AND (w.end_minute-1)/1440 >= b.start_minute/1440)
        AND NOT EXISTS(SELECT 1 FROM be4_staff_slots w WHERE w.business_id=b.business_id AND w.staff_id=r.compatibility_staff_id AND w.state='working' AND w.start_minute<=b.start_minute AND w.end_minute>=b.end_minute)))
  ) THEN RAISE EXCEPTION 'BE3_STAFF_UNAVAILABLE'; END IF;

RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_booking_staff_guard BEFORE INSERT ON booking_write_commits FOR EACH ROW EXECUTE FUNCTION trg_be4_booking_staff_guard_fn();

CREATE FUNCTION trg_be4_booking_execution_conflict_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF EXISTS(SELECT 1 FROM bookings WHERE id=NEW.booking_id AND status<>'cancelled' AND service_module='grooming') THEN
IF EXISTS(
    SELECT 1 FROM execution_assignments a JOIN service_executions e ON e.business_id=a.business_id AND e.branch_id=a.branch_id AND e.id=a.execution_id
    WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND a.resource_id=NEW.resource_id AND e.booking_id<>NEW.booking_id
      AND e.status<>'cancelled' AND (extract(epoch from (a.start_local)::timestamp)::bigint)/60<NEW.end_minute AND NEW.start_minute<(extract(epoch from (a.end_local)::timestamp)::bigint)/60
  ) THEN RAISE EXCEPTION 'BE3_TIME_CONFLICT'; END IF;

END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_booking_execution_conflict BEFORE INSERT ON booking_resource_reservations FOR EACH ROW EXECUTE FUNCTION trg_be4_booking_execution_conflict_fn();

CREATE FUNCTION trg_be4_care_staff_insert_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.staff_id IS NOT NULL THEN
IF NOT EXISTS(SELECT 1 FROM operation_staff s JOIN operation_staff_branches a ON a.business_id=s.business_id AND a.staff_id=s.id
    WHERE s.business_id=NEW.business_id AND s.id=NEW.staff_id AND a.branch_id=NEW.branch_id
      AND EXISTS(SELECT 1 FROM jsonb_array_elements_text((s.capabilities_json)::jsonb) AS je(value) WHERE value='hotel-care')) THEN RAISE EXCEPTION 'BE4_STAFF'; END IF;

END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_care_staff_insert BEFORE INSERT ON execution_care_tasks FOR EACH ROW EXECUTE FUNCTION trg_be4_care_staff_insert_fn();

CREATE FUNCTION trg_be4_care_staff_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.staff_id IS NOT NULL AND NEW.staff_id IS DISTINCT FROM OLD.staff_id THEN
IF NOT EXISTS(SELECT 1 FROM operation_staff s JOIN operation_staff_branches a ON a.business_id=s.business_id AND a.staff_id=s.id
    WHERE s.business_id=NEW.business_id AND s.id=NEW.staff_id AND a.branch_id=NEW.branch_id AND s.status='active'
      AND EXISTS(SELECT 1 FROM jsonb_array_elements_text((s.capabilities_json)::jsonb) AS je(value) WHERE value='hotel-care')) THEN RAISE EXCEPTION 'BE4_STAFF'; END IF;

END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_care_staff_update BEFORE UPDATE OF staff_id ON execution_care_tasks FOR EACH ROW EXECUTE FUNCTION trg_be4_care_staff_update_fn();

CREATE FUNCTION trg_be4_record_source_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=NEW.business_id AND e.branch_id=NEW.branch_id AND e.id=NEW.execution_id
    AND e.customer_id=NEW.customer_id AND e.pet_id=NEW.pet_id AND (e.status='completed' OR (e.module<>'grooming' AND e.status='checked-out')))
  THEN RAISE EXCEPTION 'BE4_SCOPE'; END IF;

RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_record_source BEFORE INSERT ON service_records FOR EACH ROW EXECUTE FUNCTION trg_be4_record_source_fn();

CREATE FUNCTION trg_be4_booking_daycare_occupancy_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF EXISTS(SELECT 1 FROM bookings WHERE id=NEW.booking_id AND status<>'cancelled' AND service_module='daycare') THEN
IF NEW.units + (
    SELECT count(*) FROM (
      SELECT p.booking_id,p.pet_id FROM booking_resource_reservations r JOIN bookings b ON b.business_id=r.business_id AND b.branch_id=r.branch_id AND b.id=r.booking_id
      JOIN booking_pets p ON p.business_id=b.business_id AND p.branch_id=b.branch_id AND p.booking_id=b.id
      WHERE r.business_id=NEW.business_id AND r.branch_id=NEW.branch_id AND r.resource_id=NEW.resource_id AND r.reservation_date=NEW.reservation_date AND r.booking_id<>NEW.booking_id AND b.status<>'cancelled'
      UNION
      SELECT e.booking_id,e.pet_id FROM execution_assignments a JOIN service_executions e ON e.business_id=a.business_id AND e.branch_id=a.branch_id AND e.id=a.execution_id
      WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND a.resource_id=NEW.resource_id AND e.booking_id<>NEW.booking_id AND e.status IN ('checked-in','active','ready-for-pickup')
        AND a.start_local<=NEW.reservation_date AND a.end_local>NEW.reservation_date
    )
  ) > (SELECT capacity FROM booking_resources WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND id=NEW.resource_id)
  THEN RAISE EXCEPTION 'BE3_CAPACITY_CONFLICT'; END IF;

END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_booking_daycare_occupancy BEFORE INSERT ON booking_resource_reservations FOR EACH ROW EXECUTE FUNCTION trg_be4_booking_daycare_occupancy_fn();

CREATE FUNCTION trg_be4_execution_identity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.booking_id<>OLD.booking_id OR NEW.pet_id<>OLD.pet_id OR NEW.module<>OLD.module THEN
RAISE EXCEPTION 'BE4_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_execution_identity BEFORE UPDATE OF business_id,branch_id,booking_id,pet_id,module ON service_executions FOR EACH ROW EXECUTE FUNCTION trg_be4_execution_identity_fn();

CREATE FUNCTION trg_be4_record_identity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.execution_id<>OLD.execution_id OR NEW.customer_id<>OLD.customer_id OR NEW.pet_id<>OLD.pet_id THEN
RAISE EXCEPTION 'BE4_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be4_record_identity BEFORE UPDATE OF business_id,branch_id,execution_id,customer_id,pet_id ON service_records FOR EACH ROW EXECUTE FUNCTION trg_be4_record_identity_fn();

CREATE FUNCTION trg_be5_intake_insert_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS(SELECT 1 FROM access_grants g JOIN consents c ON c.id=g.consent_id AND c.business_id=g.business_id AND c.branch_id=g.branch_id
 WHERE g.business_id=NEW.business_id AND g.branch_id=NEW.branch_id AND g.id=NEW.grant_id AND (NEW.pet_id IS NULL OR NEW.pet_id=c.pet_id)
 AND (NEW.customer_id IS NULL OR EXISTS(SELECT 1 FROM customer_pet_relationships r WHERE r.business_id=NEW.business_id AND r.customer_id=NEW.customer_id AND r.pet_id=NEW.pet_id AND r.status='active'))
 AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=NEW.business_id AND e.branch_id=NEW.branch_id AND e.id=NEW.execution_id AND e.customer_id=NEW.customer_id AND e.pet_id=c.pet_id))
 ) THEN RAISE EXCEPTION 'BE5_SCOPE'; END IF; 
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be5_intake_insert BEFORE INSERT ON business_intakes FOR EACH ROW EXECUTE FUNCTION trg_be5_intake_insert_fn();

CREATE FUNCTION trg_be5_execution_intake_insert_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.intake_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM business_intakes i JOIN access_grants g ON g.id=i.grant_id AND g.business_id=i.business_id AND g.branch_id=i.branch_id JOIN consents c ON c.id=g.consent_id
 WHERE i.business_id=NEW.business_id AND i.branch_id=NEW.branch_id AND i.id=NEW.intake_id AND c.pet_id=NEW.pet_id AND i.customer_id=NEW.customer_id AND i.execution_id=NEW.id)
 THEN RAISE EXCEPTION 'BE5_SCOPE'; END IF; 
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be5_execution_intake_insert BEFORE INSERT ON service_executions FOR EACH ROW EXECUTE FUNCTION trg_be5_execution_intake_insert_fn();

CREATE FUNCTION trg_be5_intake_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS(SELECT 1 FROM access_grants g JOIN consents c ON c.id=g.consent_id AND c.business_id=g.business_id AND c.branch_id=g.branch_id
 WHERE g.business_id=NEW.business_id AND g.branch_id=NEW.branch_id AND g.id=NEW.grant_id AND (NEW.pet_id IS NULL OR NEW.pet_id=c.pet_id)
 AND (NEW.customer_id IS NULL OR EXISTS(SELECT 1 FROM customer_pet_relationships r WHERE r.business_id=NEW.business_id AND r.customer_id=NEW.customer_id AND r.pet_id=NEW.pet_id AND r.status='active'))
 AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=NEW.business_id AND e.branch_id=NEW.branch_id AND e.id=NEW.execution_id AND e.customer_id=NEW.customer_id AND e.pet_id=c.pet_id))
 ) THEN RAISE EXCEPTION 'BE5_SCOPE'; END IF; 
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be5_intake_update BEFORE UPDATE ON business_intakes FOR EACH ROW EXECUTE FUNCTION trg_be5_intake_update_fn();

CREATE FUNCTION trg_be5_execution_intake_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.intake_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM business_intakes i JOIN access_grants g ON g.id=i.grant_id AND g.business_id=i.business_id AND g.branch_id=i.branch_id JOIN consents c ON c.id=g.consent_id
 WHERE i.business_id=NEW.business_id AND i.branch_id=NEW.branch_id AND i.id=NEW.intake_id AND c.pet_id=NEW.pet_id AND i.customer_id=NEW.customer_id AND i.execution_id=NEW.id)
 THEN RAISE EXCEPTION 'BE5_SCOPE'; END IF; 
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be5_execution_intake_update BEFORE UPDATE ON service_executions FOR EACH ROW EXECUTE FUNCTION trg_be5_execution_intake_update_fn();

CREATE FUNCTION trg_be5_access_events_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE5_IMMUTABLE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be5_access_events_update BEFORE UPDATE ON access_events FOR EACH ROW EXECUTE FUNCTION trg_be5_access_events_update_fn();

CREATE FUNCTION trg_be5_access_events_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE5_IMMUTABLE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER trg_be5_access_events_delete BEFORE DELETE ON access_events FOR EACH ROW EXECUTE FUNCTION trg_be5_access_events_delete_fn();

CREATE FUNCTION trg_be5_intake_corrections_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE5_IMMUTABLE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be5_intake_corrections_update BEFORE UPDATE ON intake_corrections FOR EACH ROW EXECUTE FUNCTION trg_be5_intake_corrections_update_fn();

CREATE FUNCTION trg_be5_intake_corrections_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE5_IMMUTABLE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER trg_be5_intake_corrections_delete BEFORE DELETE ON intake_corrections FOR EACH ROW EXECUTE FUNCTION trg_be5_intake_corrections_delete_fn();

CREATE FUNCTION trg_be5_access_grant_scopes_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE5_IMMUTABLE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be5_access_grant_scopes_update BEFORE UPDATE ON access_grant_scopes FOR EACH ROW EXECUTE FUNCTION trg_be5_access_grant_scopes_update_fn();

CREATE FUNCTION trg_be5_access_grant_scopes_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE5_IMMUTABLE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER trg_be5_access_grant_scopes_delete BEFORE DELETE ON access_grant_scopes FOR EACH ROW EXECUTE FUNCTION trg_be5_access_grant_scopes_delete_fn();

CREATE FUNCTION trg_be5_grant_identity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.id<>OLD.id OR NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.consent_id<>OLD.consent_id OR NEW.token_hash<>OLD.token_hash OR NEW.purpose<>OLD.purpose OR NEW.expires_at<>OLD.expires_at OR NEW.created_at<>OLD.created_at OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) THEN
RAISE EXCEPTION 'BE5_IMMUTABLE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be5_grant_identity BEFORE UPDATE ON access_grants FOR EACH ROW EXECUTE FUNCTION trg_be5_grant_identity_fn();

CREATE FUNCTION trg_be5_consent_identity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.id<>OLD.id OR NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.pet_id<>OLD.pet_id OR NEW.authority_id<>OLD.authority_id OR (OLD.status<>'pending' AND NEW.status<>OLD.status) THEN
RAISE EXCEPTION 'BE5_IMMUTABLE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER trg_be5_consent_identity BEFORE UPDATE ON consents FOR EACH ROW EXECUTE FUNCTION trg_be5_consent_identity_fn();

CREATE FUNCTION be6_conversation_contexts_insert_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS(SELECT 1 FROM conversations c JOIN customers cu ON cu.business_id=c.business_id AND cu.id=c.customer_id
WHERE c.business_id=NEW.business_id AND c.id=NEW.conversation_id AND cu.status='active'
AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM customer_pet_relationships r JOIN business_pet_profiles p ON p.business_id=r.business_id AND p.pet_id=r.pet_id WHERE r.business_id=c.business_id AND r.customer_id=c.customer_id AND r.pet_id=NEW.pet_id AND r.status='active' AND p.status='active'))
AND (NEW.booking_id IS NULL OR EXISTS(SELECT 1 FROM bookings b WHERE b.business_id=c.business_id AND b.branch_id=NEW.branch_id AND b.id=NEW.booking_id AND b.customer_id=c.customer_id AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM booking_pets bp WHERE bp.business_id=b.business_id AND bp.booking_id=b.id AND bp.pet_id=NEW.pet_id))))
AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=c.business_id AND e.branch_id=NEW.branch_id AND e.id=NEW.execution_id AND e.customer_id=c.customer_id AND e.pet_id=NEW.pet_id AND e.booking_id=NEW.booking_id))) THEN
RAISE EXCEPTION 'BE6_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be6_conversation_contexts_insert BEFORE INSERT ON conversation_contexts FOR EACH ROW EXECUTE FUNCTION be6_conversation_contexts_insert_fn();

CREATE FUNCTION be6_conversation_contexts_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS(SELECT 1 FROM conversations c JOIN customers cu ON cu.business_id=c.business_id AND cu.id=c.customer_id
WHERE c.business_id=NEW.business_id AND c.id=NEW.conversation_id AND cu.status='active'
AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM customer_pet_relationships r JOIN business_pet_profiles p ON p.business_id=r.business_id AND p.pet_id=r.pet_id WHERE r.business_id=c.business_id AND r.customer_id=c.customer_id AND r.pet_id=NEW.pet_id AND r.status='active' AND p.status='active'))
AND (NEW.booking_id IS NULL OR EXISTS(SELECT 1 FROM bookings b WHERE b.business_id=c.business_id AND b.branch_id=NEW.branch_id AND b.id=NEW.booking_id AND b.customer_id=c.customer_id AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM booking_pets bp WHERE bp.business_id=b.business_id AND bp.booking_id=b.id AND bp.pet_id=NEW.pet_id))))
AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=c.business_id AND e.branch_id=NEW.branch_id AND e.id=NEW.execution_id AND e.customer_id=c.customer_id AND e.pet_id=NEW.pet_id AND e.booking_id=NEW.booking_id))) THEN
RAISE EXCEPTION 'BE6_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be6_conversation_contexts_update BEFORE UPDATE ON conversation_contexts FOR EACH ROW EXECUTE FUNCTION be6_conversation_contexts_update_fn();

CREATE FUNCTION be6_messages_insert_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS(SELECT 1 FROM conversations c JOIN customers cu ON cu.business_id=c.business_id AND cu.id=c.customer_id
WHERE c.business_id=NEW.business_id AND c.id=NEW.conversation_id AND cu.status='active'
AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM customer_pet_relationships r JOIN business_pet_profiles p ON p.business_id=r.business_id AND p.pet_id=r.pet_id WHERE r.business_id=c.business_id AND r.customer_id=c.customer_id AND r.pet_id=NEW.pet_id AND r.status='active' AND p.status='active'))
AND (NEW.booking_id IS NULL OR EXISTS(SELECT 1 FROM bookings b WHERE b.business_id=c.business_id AND b.branch_id=NEW.branch_id AND b.id=NEW.booking_id AND b.customer_id=c.customer_id AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM booking_pets bp WHERE bp.business_id=b.business_id AND bp.booking_id=b.id AND bp.pet_id=NEW.pet_id))))
AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=c.business_id AND e.branch_id=NEW.branch_id AND e.id=NEW.execution_id AND e.customer_id=c.customer_id AND e.pet_id=NEW.pet_id AND e.booking_id=NEW.booking_id))) THEN
RAISE EXCEPTION 'BE6_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be6_messages_insert BEFORE INSERT ON messages FOR EACH ROW EXECUTE FUNCTION be6_messages_insert_fn();

CREATE FUNCTION be6_context_identity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.conversation_id<>OLD.conversation_id THEN
RAISE EXCEPTION 'BE6_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be6_context_identity BEFORE UPDATE ON conversation_contexts FOR EACH ROW EXECUTE FUNCTION be6_context_identity_fn();

CREATE FUNCTION be6_messages_update_immutable_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE6_SCOPE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER be6_messages_update_immutable BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION be6_messages_update_immutable_fn();

CREATE FUNCTION be6_messages_delete_immutable_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE6_SCOPE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER be6_messages_delete_immutable BEFORE DELETE ON messages FOR EACH ROW EXECUTE FUNCTION be6_messages_delete_immutable_fn();

CREATE FUNCTION be6_conversations_update_immutable_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE6_SCOPE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER be6_conversations_update_immutable BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION be6_conversations_update_immutable_fn();

CREATE FUNCTION be6_conversations_delete_immutable_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE6_SCOPE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER be6_conversations_delete_immutable BEFORE DELETE ON conversations FOR EACH ROW EXECUTE FUNCTION be6_conversations_delete_immutable_fn();

CREATE FUNCTION be6_approval_insert_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS(SELECT 1 FROM messages m JOIN bookings b ON b.business_id=m.business_id AND b.branch_id=m.branch_id AND b.id=m.booking_id
WHERE m.business_id=NEW.business_id AND m.branch_id=NEW.branch_id AND m.id=NEW.message_id AND m.kind='add-service-request' AND m.direction='business' AND b.status<>'cancelled'
AND (m.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=m.business_id AND e.branch_id=m.branch_id AND e.id=m.execution_id AND e.status NOT IN ('cancelled','no-show')))) THEN
RAISE EXCEPTION 'BE6_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be6_approval_insert BEFORE INSERT ON message_approvals FOR EACH ROW EXECUTE FUNCTION be6_approval_insert_fn();

CREATE FUNCTION be6_approval_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF OLD.status<>'waiting' OR NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.message_id<>OLD.message_id OR NEW.service_name<>OLD.service_name OR NEW.additional_price<>OLD.additional_price OR NEW.additional_minutes<>OLD.additional_minutes OR NEW.note<>OLD.note OR NEW.revision<>OLD.revision+1 OR NEW.responded_at IS NULL
OR (NEW.status IN ('approved','declined') AND NOT EXISTS(SELECT 1 FROM pet_authorities a JOIN persons p ON p.id=a.person_id JOIN messages m ON m.pet_id=a.pet_id WHERE a.id=NEW.authority_id AND a.role='primary' AND a.status='active' AND p.status='active' AND m.id=NEW.message_id)) THEN
RAISE EXCEPTION 'BE6_VERSION'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be6_approval_update BEFORE UPDATE ON message_approvals FOR EACH ROW EXECUTE FUNCTION be6_approval_update_fn();

CREATE FUNCTION be6_outbox_identity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.message_id<>OLD.message_id OR NEW.retry_key<>OLD.retry_key OR (OLD.attempts>0 AND (NEW.channel_id IS DISTINCT FROM OLD.channel_id OR NEW.link_id IS DISTINCT FROM OLD.link_id OR NEW.recipient IS DISTINCT FROM OLD.recipient)) THEN
RAISE EXCEPTION 'BE6_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be6_outbox_identity BEFORE UPDATE ON message_outbox FOR EACH ROW EXECUTE FUNCTION be6_outbox_identity_fn();

CREATE FUNCTION be7_charge_source_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS(
 SELECT 1 FROM bookings b WHERE b.business_id=NEW.business_id AND b.branch_id=NEW.branch_id AND b.id=NEW.booking_id AND b.customer_id=NEW.customer_id AND b.service_module=NEW.module AND b.status<>'cancelled'
 AND (NEW.pet_id IS NULL OR EXISTS(SELECT 1 FROM booking_pets p WHERE p.business_id=b.business_id AND p.branch_id=b.branch_id AND p.booking_id=b.id AND p.pet_id=NEW.pet_id))
 AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=b.business_id AND e.branch_id=b.branch_id AND e.id=NEW.execution_id AND e.booking_id=b.id AND e.customer_id=b.customer_id AND e.pet_id=NEW.pet_id AND e.module=NEW.module))) THEN
RAISE EXCEPTION 'BE7_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_charge_source BEFORE INSERT ON charges FOR EACH ROW EXECUTE FUNCTION be7_charge_source_fn();

CREATE FUNCTION be7_charge_identity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.id<>OLD.id OR NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.booking_id<>OLD.booking_id OR NEW.customer_id<>OLD.customer_id OR NEW.pet_id IS DISTINCT FROM OLD.pet_id OR NEW.execution_id IS DISTINCT FROM OLD.execution_id OR NEW.module<>OLD.module OR NEW.service_label<>OLD.service_label OR NEW.currency<>OLD.currency OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at OR (OLD.cancelled_at IS NOT NULL AND (NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at OR NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason)) THEN
RAISE EXCEPTION 'BE7_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_charge_identity BEFORE UPDATE ON charges FOR EACH ROW EXECUTE FUNCTION be7_charge_identity_fn();

CREATE FUNCTION be7_booking_charge_identity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF EXISTS(SELECT 1 FROM charges c WHERE c.business_id=OLD.business_id AND c.branch_id=OLD.branch_id AND c.booking_id=OLD.id AND (c.customer_id<>NEW.customer_id OR c.module<>NEW.service_module)) THEN
RAISE EXCEPTION 'BE7_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_booking_charge_identity BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION be7_booking_charge_identity_fn();

CREATE FUNCTION be7_cancel_unpaid_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.cancelled_at IS NOT NULL AND (EXISTS(SELECT 1 FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.id) OR EXISTS(SELECT 1 FROM payment_attempts WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.id AND state IN ('created','pending','retry','reconciliation'))) THEN
RAISE EXCEPTION 'BE7_AMOUNT'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_cancel_unpaid BEFORE UPDATE OF cancelled_at ON charges FOR EACH ROW EXECUTE FUNCTION be7_cancel_unpaid_fn();

CREATE FUNCTION be7_item_source_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS(SELECT 1 FROM charges c WHERE c.business_id=NEW.business_id AND c.branch_id=NEW.branch_id AND c.id=NEW.charge_id AND c.cancelled_at IS NULL
 AND (NEW.execution_id IS NULL OR EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=c.business_id AND e.branch_id=c.branch_id AND e.id=NEW.execution_id AND e.booking_id=c.booking_id))
 AND ((NEW.kind='add-on' AND EXISTS(SELECT 1 FROM execution_events e WHERE e.business_id=c.business_id AND e.branch_id=c.branch_id AND e.id=NEW.source_event_id AND e.execution_id=NEW.execution_id AND e.kind='addon' AND (e.data_json::jsonb->>'additionalPrice')::numeric*100=NEW.amount_minor)) OR (NEW.kind<>'add-on' AND NEW.source_event_id IS NULL))) THEN
RAISE EXCEPTION 'BE7_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_item_source BEFORE INSERT ON charge_items FOR EACH ROW EXECUTE FUNCTION be7_item_source_fn();

CREATE FUNCTION be7_item_total_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF coalesce((SELECT sum(amount_minor) FROM charge_items WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)+NEW.amount_minor <
 coalesce((SELECT sum(amount_minor) FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)-coalesce((SELECT sum(amount_minor) FROM refund_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)+coalesce((SELECT sum(amount_minor) FROM payment_attempts WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id AND state IN ('created','pending','retry','reconciliation')),0) THEN
RAISE EXCEPTION 'BE7_AMOUNT'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_item_total BEFORE INSERT ON charge_items FOR EACH ROW EXECUTE FUNCTION be7_item_total_fn();

CREATE FUNCTION be7_payment_source_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.source='provider' AND NOT EXISTS(SELECT 1 FROM payment_attempts a JOIN charges c ON c.business_id=a.business_id AND c.branch_id=a.branch_id AND c.id=a.charge_id WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND a.id=NEW.attempt_id AND a.account_id=NEW.account_id AND a.amount_minor=NEW.amount_minor AND a.currency=NEW.currency AND a.state='succeeded' AND c.customer_id=NEW.customer_id AND a.provider_reference=NEW.provider_reference) THEN
RAISE EXCEPTION 'BE7_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_payment_source BEFORE INSERT ON payments FOR EACH ROW EXECUTE FUNCTION be7_payment_source_fn();

CREATE FUNCTION be7_payment_allocation_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS(SELECT 1 FROM payments p JOIN charges c ON c.business_id=p.business_id AND c.branch_id=p.branch_id AND c.customer_id=p.customer_id WHERE p.business_id=NEW.business_id AND p.branch_id=NEW.branch_id AND p.id=NEW.payment_id AND c.id=NEW.charge_id AND c.cancelled_at IS NULL)
 OR NEW.amount_minor+coalesce((SELECT sum(amount_minor) FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND payment_id=NEW.payment_id),0)>(SELECT amount_minor FROM payments WHERE id=NEW.payment_id)
 OR NEW.amount_minor+coalesce((SELECT sum(amount_minor) FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)-coalesce((SELECT sum(amount_minor) FROM refund_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)+coalesce((SELECT sum(amount_minor) FROM payment_attempts WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id AND state IN ('created','pending','retry','reconciliation')),0)>coalesce((SELECT sum(amount_minor) FROM charge_items WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0) THEN
RAISE EXCEPTION 'BE7_AMOUNT'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_payment_allocation BEFORE INSERT ON payment_allocations FOR EACH ROW EXECUTE FUNCTION be7_payment_allocation_fn();

CREATE FUNCTION be7_refund_amount_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.amount_minor+coalesce((SELECT sum(amount_minor) FROM payment_refunds WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND payment_id=NEW.payment_id),0)>(SELECT amount_minor FROM payments WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND id=NEW.payment_id) THEN
RAISE EXCEPTION 'BE7_AMOUNT'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_refund_amount BEFORE INSERT ON payment_refunds FOR EACH ROW EXECUTE FUNCTION be7_refund_amount_fn();

CREATE FUNCTION be7_refund_allocation_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.amount_minor+coalesce((SELECT sum(amount_minor) FROM refund_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND payment_id=NEW.payment_id AND charge_id=NEW.charge_id),0)>(SELECT amount_minor FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND payment_id=NEW.payment_id AND charge_id=NEW.charge_id)
 OR NEW.amount_minor+coalesce((SELECT sum(amount_minor) FROM refund_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND refund_id=NEW.refund_id),0)>(SELECT amount_minor FROM payment_refunds WHERE id=NEW.refund_id) THEN
RAISE EXCEPTION 'BE7_AMOUNT'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_refund_allocation BEFORE INSERT ON refund_allocations FOR EACH ROW EXECUTE FUNCTION be7_refund_allocation_fn();

CREATE FUNCTION be7_attempt_source_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NOT EXISTS(SELECT 1 FROM charges c JOIN payment_provider_accounts p ON p.business_id=c.business_id WHERE c.business_id=NEW.business_id AND c.branch_id=NEW.branch_id AND c.id=NEW.charge_id AND c.cancelled_at IS NULL AND p.id=NEW.account_id AND p.status='active') THEN
RAISE EXCEPTION 'BE7_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_attempt_source BEFORE INSERT ON payment_attempts FOR EACH ROW EXECUTE FUNCTION be7_attempt_source_fn();

CREATE FUNCTION be7_attempt_reservation_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.amount_minor+
 coalesce((SELECT sum(amount_minor) FROM payment_attempts WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id AND state IN ('created','pending','retry','reconciliation')),0)+coalesce((SELECT sum(amount_minor) FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)-coalesce((SELECT sum(amount_minor) FROM refund_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)>coalesce((SELECT sum(amount_minor) FROM charge_items WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0) THEN
RAISE EXCEPTION 'BE7_AMOUNT'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_attempt_reservation BEFORE INSERT ON payment_attempts FOR EACH ROW EXECUTE FUNCTION be7_attempt_reservation_fn();

CREATE FUNCTION be7_attempt_identity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.id<>OLD.id OR NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.charge_id<>OLD.charge_id OR NEW.account_id<>OLD.account_id OR NEW.amount_minor<>OLD.amount_minor OR NEW.currency<>OLD.currency OR NEW.idempotency_key<>OLD.idempotency_key OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at OR (OLD.provider_reference IS NOT NULL AND NEW.provider_reference IS DISTINCT FROM OLD.provider_reference) OR (OLD.state='succeeded' AND NEW.state<>'succeeded') THEN
RAISE EXCEPTION 'BE7_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_attempt_identity BEFORE UPDATE ON payment_attempts FOR EACH ROW EXECUTE FUNCTION be7_attempt_identity_fn();

CREATE FUNCTION be7_webhook_scope_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.attempt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM payment_attempts a WHERE a.business_id=NEW.business_id AND a.account_id=NEW.account_id AND a.id=NEW.attempt_id) THEN
RAISE EXCEPTION 'BE7_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_webhook_scope BEFORE INSERT ON payment_webhook_events FOR EACH ROW EXECUTE FUNCTION be7_webhook_scope_fn();

CREATE FUNCTION be7_charge_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER be7_charge_delete BEFORE DELETE ON charges FOR EACH ROW EXECUTE FUNCTION be7_charge_delete_fn();

CREATE FUNCTION be7_item_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER be7_item_update BEFORE UPDATE ON charge_items FOR EACH ROW EXECUTE FUNCTION be7_item_update_fn();

CREATE FUNCTION be7_item_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER be7_item_delete BEFORE DELETE ON charge_items FOR EACH ROW EXECUTE FUNCTION be7_item_delete_fn();

CREATE FUNCTION be7_charge_event_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER be7_charge_event_update BEFORE UPDATE ON charge_events FOR EACH ROW EXECUTE FUNCTION be7_charge_event_update_fn();

CREATE FUNCTION be7_charge_event_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER be7_charge_event_delete BEFORE DELETE ON charge_events FOR EACH ROW EXECUTE FUNCTION be7_charge_event_delete_fn();

CREATE FUNCTION be7_payment_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER be7_payment_update BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION be7_payment_update_fn();

CREATE FUNCTION be7_payment_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER be7_payment_delete BEFORE DELETE ON payments FOR EACH ROW EXECUTE FUNCTION be7_payment_delete_fn();

CREATE FUNCTION be7_allocation_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER be7_allocation_update BEFORE UPDATE ON payment_allocations FOR EACH ROW EXECUTE FUNCTION be7_allocation_update_fn();

CREATE FUNCTION be7_allocation_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER be7_allocation_delete BEFORE DELETE ON payment_allocations FOR EACH ROW EXECUTE FUNCTION be7_allocation_delete_fn();

CREATE FUNCTION be7_refund_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER be7_refund_update BEFORE UPDATE ON payment_refunds FOR EACH ROW EXECUTE FUNCTION be7_refund_update_fn();

CREATE FUNCTION be7_refund_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER be7_refund_delete BEFORE DELETE ON payment_refunds FOR EACH ROW EXECUTE FUNCTION be7_refund_delete_fn();

CREATE FUNCTION be7_refund_allocation_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER be7_refund_allocation_update BEFORE UPDATE ON refund_allocations FOR EACH ROW EXECUTE FUNCTION be7_refund_allocation_update_fn();

CREATE FUNCTION be7_refund_allocation_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER be7_refund_allocation_delete BEFORE DELETE ON refund_allocations FOR EACH ROW EXECUTE FUNCTION be7_refund_allocation_delete_fn();

CREATE FUNCTION be7_webhook_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER be7_webhook_update BEFORE UPDATE ON payment_webhook_events FOR EACH ROW EXECUTE FUNCTION be7_webhook_update_fn();

CREATE FUNCTION be7_webhook_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER be7_webhook_delete BEFORE DELETE ON payment_webhook_events FOR EACH ROW EXECUTE FUNCTION be7_webhook_delete_fn();

CREATE FUNCTION be7_attempt_event_update_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN NEW;
END; $$;
CREATE TRIGGER be7_attempt_event_update BEFORE UPDATE ON payment_attempt_events FOR EACH ROW EXECUTE FUNCTION be7_attempt_event_update_fn();

CREATE FUNCTION be7_attempt_event_delete_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
RAISE EXCEPTION 'BE7_SCOPE'; 
RETURN OLD;
END; $$;
CREATE TRIGGER be7_attempt_event_delete BEFORE DELETE ON payment_attempt_events FOR EACH ROW EXECUTE FUNCTION be7_attempt_event_delete_fn();

CREATE FUNCTION be7_provider_identity_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF NEW.id<>OLD.id OR NEW.business_id<>OLD.business_id OR NEW.provider<>OLD.provider OR NEW.external_account_id<>OLD.external_account_id OR NEW.source<>OLD.source
OR ((NEW.secret_ref<>OLD.secret_ref OR NEW.status<>OLD.status) AND NEW.revision<=OLD.revision) THEN
RAISE EXCEPTION 'BE7_SCOPE'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_provider_identity BEFORE UPDATE ON payment_provider_accounts FOR EACH ROW EXECUTE FUNCTION be7_provider_identity_fn();

CREATE FUNCTION be7_attempt_rereservation_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF OLD.state NOT IN ('created','pending','retry','reconciliation') AND NEW.state IN ('created','pending','retry','reconciliation')
AND NEW.amount_minor+coalesce((SELECT sum(amount_minor) FROM payment_attempts WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id AND id<>NEW.id AND state IN ('created','pending','retry','reconciliation')),0)
+coalesce((SELECT sum(amount_minor) FROM payment_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)
-coalesce((SELECT sum(amount_minor) FROM refund_allocations WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0)
>coalesce((SELECT sum(amount_minor) FROM charge_items WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND charge_id=NEW.charge_id),0) THEN
RAISE EXCEPTION 'BE7_AMOUNT'; 
END IF;
RETURN NEW;
END; $$;
CREATE TRIGGER be7_attempt_rereservation BEFORE UPDATE OF state ON payment_attempts FOR EACH ROW EXECUTE FUNCTION be7_attempt_rereservation_fn();
