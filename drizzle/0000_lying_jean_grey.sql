CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_person_id` text NOT NULL,
	`actor_membership_id` text NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text,
	`request_id` text NOT NULL,
	`correlation_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`actor_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`actor_membership_id`) REFERENCES `business_memberships`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_audit_events_id" CHECK(length("audit_events"."id") >= 16),
	CONSTRAINT "ck_audit_events_action" CHECK(length(trim("audit_events"."action")) between 1 and 120)
);
--> statement-breakpoint
CREATE INDEX `idx_audit_events_business_time` ON `audit_events` (`business_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_events_branch_time` ON `audit_events` (`branch_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_events_correlation` ON `audit_events` (`correlation_id`);--> statement-breakpoint
CREATE TABLE `branch_enabled_modules` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`module` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by_person_id` text,
	PRIMARY KEY(`branch_id`, `module`),
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_branch_enabled_modules_module" CHECK("branch_enabled_modules"."module" in ('grooming', 'hotel', 'daycare'))
);
--> statement-breakpoint
CREATE INDEX `idx_branch_enabled_modules_business_branch` ON `branch_enabled_modules` (`business_id`,`branch_id`);--> statement-breakpoint
CREATE TABLE `branch_operating_hours` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`weekday` text NOT NULL,
	`closed` integer DEFAULT false NOT NULL,
	`opens_at` text NOT NULL,
	`closes_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by_person_id` text,
	PRIMARY KEY(`branch_id`, `weekday`),
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_branch_operating_hours_weekday" CHECK("branch_operating_hours"."weekday" in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
	CONSTRAINT "ck_branch_operating_hours_closed" CHECK("branch_operating_hours"."closed" in (0, 1)),
	CONSTRAINT "ck_branch_operating_hours_range" CHECK("branch_operating_hours"."closed" = 1 or "branch_operating_hours"."opens_at" < "branch_operating_hours"."closes_at")
);
--> statement-breakpoint
CREATE INDEX `idx_branch_operating_hours_business_branch` ON `branch_operating_hours` (`business_id`,`branch_id`);--> statement-breakpoint
CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`area` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`timezone` text DEFAULT 'Asia/Bangkok' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by_person_id` text,
	`updated_by_person_id` text,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_branches_id" CHECK(length("branches"."id") >= 8),
	CONSTRAINT "ck_branches_name" CHECK(length(trim("branches"."name")) between 1 and 160),
	CONSTRAINT "ck_status_lifecycle" CHECK("branches"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_branches_business_name_key` ON `branches` (`business_id`,`name_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_branches_business_id_id` ON `branches` (`business_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_branches_business_status` ON `branches` (`business_id`,`status`);--> statement-breakpoint
CREATE TABLE `business_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`business_id` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by_person_id` text,
	`updated_by_person_id` text,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_business_memberships_id" CHECK(length("business_memberships"."id") >= 16),
	CONSTRAINT "ck_business_memberships_role" CHECK("business_memberships"."role" in ('OWNER', 'MANAGER', 'STAFF')),
	CONSTRAINT "ck_status_lifecycle" CHECK("business_memberships"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_business_memberships_person_business` ON `business_memberships` (`person_id`,`business_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_business_memberships_id_business` ON `business_memberships` (`id`,`business_id`);--> statement-breakpoint
CREATE INDEX `idx_business_memberships_person_status` ON `business_memberships` (`person_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_business_memberships_business_status` ON `business_memberships` (`business_id`,`status`);--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`logo_url` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by_person_id` text,
	`updated_by_person_id` text,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_businesses_id" CHECK(length("businesses"."id") >= 16),
	CONSTRAINT "ck_businesses_name" CHECK(length(trim("businesses"."name")) between 1 and 160),
	CONSTRAINT "ck_status_lifecycle" CHECK("businesses"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE `membership_branch_access` (
	`membership_id` text NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by_person_id` text,
	PRIMARY KEY(`membership_id`, `branch_id`),
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`membership_id`,`business_id`) REFERENCES `business_memberships`(`id`,`business_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_membership_branch_access_business_branch` ON `membership_branch_access` (`business_id`,`branch_id`);--> statement-breakpoint
CREATE TABLE `persons` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`primary_email` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "ck_persons_id" CHECK(length("persons"."id") >= 16),
	CONSTRAINT "ck_persons_display_name" CHECK(length(trim("persons"."display_name")) between 1 and 120),
	CONSTRAINT "ck_status_lifecycle" CHECK("persons"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_persons_primary_email` ON `persons` (`primary_email`);