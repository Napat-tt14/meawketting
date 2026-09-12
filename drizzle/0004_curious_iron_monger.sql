CREATE TABLE `backend_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`allowed` integer NOT NULL,
	CONSTRAINT "ck_backend_authorization" CHECK("backend_guards"."allowed" = 1)
);
--> statement-breakpoint
CREATE TABLE `backend_mutations` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`command` text NOT NULL,
	`request_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`target_id` text NOT NULL,
	`actor_person_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`business_id`, `command`, `request_key`),
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_backend_mutations_target` ON `backend_mutations` (`business_id`,`target_id`);--> statement-breakpoint
CREATE TABLE `execution_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`execution_id` text NOT NULL,
	`resource_id` text,
	`space_id` text,
	`staff_id` text,
	`start_local` text NOT NULL,
	`end_local` text NOT NULL,
	`assigned_at` text NOT NULL,
	`assigned_by` text,
	`reason` text,
	FOREIGN KEY (`assigned_by`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`execution_id`) REFERENCES `service_executions`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`resource_id`) REFERENCES `booking_resources`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`space_id`) REFERENCES `hotel_spaces`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`staff_id`) REFERENCES `operation_staff`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_execution_assignment_target" CHECK(("execution_assignments"."resource_id" is not null) + ("execution_assignments"."space_id" is not null) + ("execution_assignments"."staff_id" is not null) = 1),
	CONSTRAINT "ck_execution_assignment_range" CHECK("execution_assignments"."end_local" >= "execution_assignments"."start_local")
);
--> statement-breakpoint
CREATE INDEX `idx_execution_assignments_source` ON `execution_assignments` (`business_id`,`branch_id`,`execution_id`);--> statement-breakpoint
CREATE INDEX `idx_execution_assignments_resource` ON `execution_assignments` (`business_id`,`branch_id`,`resource_id`,`start_local`,`end_local`);--> statement-breakpoint
CREATE INDEX `idx_execution_assignments_space` ON `execution_assignments` (`business_id`,`branch_id`,`space_id`,`start_local`,`end_local`);--> statement-breakpoint
CREATE TABLE `execution_care_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`execution_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`scheduled_date` text NOT NULL,
	`scheduled_time` text NOT NULL,
	`staff_id` text,
	`completed_at` text,
	`completed_by` text,
	`instructions` text,
	`authorized_intake_id` text,
	FOREIGN KEY (`completed_by`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`execution_id`) REFERENCES `service_executions`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`staff_id`) REFERENCES `operation_staff`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_execution_care_kind" CHECK("execution_care_tasks"."kind" in ('meal','water','medication','activity','cleaning','check','note','other'))
);
--> statement-breakpoint
CREATE INDEX `idx_execution_care_due` ON `execution_care_tasks` (`business_id`,`branch_id`,`execution_id`,`scheduled_date`,`completed_at`);--> statement-breakpoint
CREATE TABLE `execution_events` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`execution_id` text NOT NULL,
	`kind` text NOT NULL,
	`summary` text NOT NULL,
	`data_json` text DEFAULT '{}' NOT NULL,
	`actor_person_id` text,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`actor_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`execution_id`) REFERENCES `service_executions`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_execution_events_json" CHECK(json_valid("execution_events"."data_json") and length("execution_events"."data_json") <= 16000)
);
--> statement-breakpoint
CREATE INDEX `idx_execution_events_source` ON `execution_events` (`business_id`,`branch_id`,`execution_id`,`occurred_at`,`id`);--> statement-breakpoint
CREATE TABLE `hotel_spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`service_id` text NOT NULL,
	`label` text NOT NULL,
	`kind` text NOT NULL,
	`capacity` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`business_id`,`branch_id`,`service_id`) REFERENCES `booking_services`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_hotel_spaces_kind" CHECK("hotel_spaces"."kind" in ('room','zone')),
	CONSTRAINT "ck_hotel_spaces_capacity" CHECK("hotel_spaces"."capacity" between 1 and 10000),
	CONSTRAINT "ck_status_lifecycle" CHECK("hotel_spaces"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_hotel_spaces_scope` ON `hotel_spaces` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_hotel_spaces_branch` ON `hotel_spaces` (`business_id`,`branch_id`,`status`);--> statement-breakpoint
CREATE TABLE `operation_staff` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`person_id` text,
	`name` text NOT NULL,
	`avatar_seed` text NOT NULL,
	`display_role` text NOT NULL,
	`capabilities_json` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_operation_staff_role" CHECK("operation_staff"."display_role" in ('owner','manager','staff')),
	CONSTRAINT "ck_operation_staff_capabilities" CHECK(json_valid("operation_staff"."capabilities_json")),
	CONSTRAINT "ck_status_lifecycle" CHECK("operation_staff"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_operation_staff_scope` ON `operation_staff` (`business_id`,`id`);--> statement-breakpoint
CREATE TABLE `operation_staff_branches` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`staff_id` text NOT NULL,
	PRIMARY KEY(`business_id`, `branch_id`, `staff_id`),
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`staff_id`) REFERENCES `operation_staff`(`business_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `operation_staff_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`state` text NOT NULL,
	`start_local` text NOT NULL,
	`end_local` text NOT NULL,
	`note` text,
	FOREIGN KEY (`business_id`,`staff_id`) REFERENCES `operation_staff`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_operation_staff_window_state" CHECK("operation_staff_windows"."state" in ('working','unavailable','break','time-off')),
	CONSTRAINT "ck_operation_staff_window_range" CHECK("operation_staff_windows"."start_local" < "operation_staff_windows"."end_local" or ("operation_staff_windows"."start_local" = "operation_staff_windows"."end_local" and length("operation_staff_windows"."start_local") = 10))
);
--> statement-breakpoint
CREATE INDEX `idx_operation_staff_windows` ON `operation_staff_windows` (`business_id`,`staff_id`,`start_local`,`end_local`);--> statement-breakpoint
CREATE TABLE `service_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`booking_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`pet_id` text NOT NULL,
	`module` text NOT NULL,
	`status` text NOT NULL,
	`intake_id` text,
	`scheduled_start` text NOT NULL,
	`scheduled_end` text,
	`business_note` text DEFAULT '' NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`write_token` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`cancelled_at` text,
	FOREIGN KEY (`business_id`,`branch_id`,`booking_id`) REFERENCES `bookings`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`customer_id`) REFERENCES `customers`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`pet_id`) REFERENCES `business_pet_profiles`(`business_id`,`pet_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_executions_module" CHECK("service_executions"."module" in ('grooming','hotel','daycare')),
	CONSTRAINT "ck_executions_revision" CHECK("service_executions"."revision" >= 1),
	CONSTRAINT "ck_executions_details" CHECK(json_valid("service_executions"."details_json") and length("service_executions"."details_json") <= 16000),
	CONSTRAINT "ck_executions_note" CHECK(length("service_executions"."business_note") <= 4000),
	CONSTRAINT "ck_executions_status" CHECK(("service_executions"."module" = 'grooming' and "service_executions"."status" in ('booked','checked-in','waiting','in-service','ready-for-pickup','completed','cancelled')) or ("service_executions"."module" = 'hotel' and "service_executions"."status" in ('booked','expected-today','checked-in','in-stay','ready-for-checkout','checked-out','completed','cancelled','no-show')) or ("service_executions"."module" = 'daycare' and "service_executions"."status" in ('booked','checked-in','active','ready-for-pickup','checked-out','completed','cancelled')))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_service_executions_source` ON `service_executions` (`business_id`,`booking_id`,`pet_id`,`module`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_service_executions_scope` ON `service_executions` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_executions_branch_module_range` ON `service_executions` (`business_id`,`branch_id`,`module`,`scheduled_start`,`id`);--> statement-breakpoint
CREATE INDEX `idx_executions_customer` ON `service_executions` (`business_id`,`customer_id`,`branch_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `service_record_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`record_id` text NOT NULL,
	`kind` text NOT NULL,
	`data_json` text NOT NULL,
	`actor_person_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`actor_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`record_id`) REFERENCES `service_records`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_service_record_revision_kind" CHECK("service_record_revisions"."kind" in ('correction','source-recompleted')),
	CONSTRAINT "ck_service_record_revision_json" CHECK(json_valid("service_record_revisions"."data_json"))
);
--> statement-breakpoint
CREATE INDEX `idx_service_record_revisions` ON `service_record_revisions` (`business_id`,`branch_id`,`record_id`,`occurred_at`,`id`);--> statement-breakpoint
CREATE TABLE `service_records` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`execution_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`pet_id` text NOT NULL,
	`completed_at` text NOT NULL,
	`summary` text NOT NULL,
	`business_note` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`source_revision` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`business_id`,`branch_id`,`execution_id`) REFERENCES `service_executions`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`customer_id`) REFERENCES `customers`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`pet_id`) REFERENCES `business_pet_profiles`(`business_id`,`pet_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_service_record_snapshot" CHECK(json_valid("service_records"."snapshot_json"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_service_records_source` ON `service_records` (`business_id`,`branch_id`,`execution_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_service_records_scope` ON `service_records` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_service_records_history` ON `service_records` (`business_id`,`branch_id`,`customer_id`,`completed_at`,`id`);
