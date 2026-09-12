CREATE TABLE `access_events` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`grant_id` text NOT NULL,
	`kind` text NOT NULL,
	`actor_person_id` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`actor_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`grant_id`) REFERENCES `access_grants`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_access_event_json" CHECK(json_valid("access_events"."metadata_json") and length("access_events"."metadata_json")<=2000)
);
--> statement-breakpoint
CREATE INDEX `idx_access_events_grant` ON `access_events` (`business_id`,`branch_id`,`grant_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `access_grant_scopes` (
	`grant_id` text NOT NULL,
	`scope` text NOT NULL,
	PRIMARY KEY(`grant_id`, `scope`),
	FOREIGN KEY (`grant_id`) REFERENCES `access_grants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_access_grant_scope" CHECK("access_grant_scopes"."scope" in ('basicIdentity','photo','passportReference'))
);
--> statement-breakpoint
CREATE TABLE `access_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`consent_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`business_id`,`branch_id`,`consent_id`) REFERENCES `consents`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_access_grant_token" CHECK(length("access_grants"."token_hash")=64),
	CONSTRAINT "ck_access_grant_expiry" CHECK("access_grants"."expires_at">"access_grants"."created_at"),
	CONSTRAINT "ck_access_grant_purpose" CHECK(length("access_grants"."purpose") between 1 and 500)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_access_grant_token` ON `access_grants` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_access_grant_consent` ON `access_grants` (`consent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_access_grant_scope` ON `access_grants` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_access_grant_expiry` ON `access_grants` (`business_id`,`branch_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `business_intakes` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`grant_id` text NOT NULL,
	`target_key` text NOT NULL,
	`customer_id` text,
	`pet_id` text,
	`execution_id` text,
	`belongings_json` text DEFAULT '[]' NOT NULL,
	`business_note` text DEFAULT '' NOT NULL,
	`task_state` text DEFAULT 'allowed-data' NOT NULL,
	`checked_in_at` text,
	`created_by` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`grant_id`) REFERENCES `access_grants`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`execution_id`) REFERENCES `service_executions`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`customer_id`) REFERENCES `customers`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`pet_id`) REFERENCES `business_pet_profiles`(`business_id`,`pet_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_intake_belongings" CHECK(json_valid("business_intakes"."belongings_json") and length("business_intakes"."belongings_json")<=2000),
	CONSTRAINT "ck_intake_note" CHECK(length("business_intakes"."business_note")<=4000),
	CONSTRAINT "ck_intake_task" CHECK("business_intakes"."task_state" in ('allowed-data','intake','review','complete'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_intake_source` ON `business_intakes` (`business_id`,`branch_id`,`grant_id`,`target_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_intake_scope` ON `business_intakes` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_intake_branch` ON `business_intakes` (`business_id`,`branch_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `consents` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`authority_id` text NOT NULL,
	`pet_id` text NOT NULL,
	`status` text NOT NULL,
	`decided_at` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`authority_id`,`pet_id`) REFERENCES `pet_authorities`(`id`,`pet_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_consent_status" CHECK("consents"."status" in ('pending','approved','denied'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_consent_scope` ON `consents` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE TABLE `intake_corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`intake_id` text NOT NULL,
	`topic` text NOT NULL,
	`current_value` text NOT NULL,
	`suggested_value` text NOT NULL,
	`note` text NOT NULL,
	`actor_person_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`intake_id`) REFERENCES `business_intakes`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_intake_correction_topic" CHECK("intake_corrections"."topic" in ('name','species','passport-reference'))
);
--> statement-breakpoint
CREATE INDEX `idx_intake_corrections_source` ON `intake_corrections` (`business_id`,`branch_id`,`intake_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `passport_profiles` (
	`pet_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`reference` text NOT NULL,
	`photo_object_key` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_passport_species" CHECK("passport_profiles"."species" in ('cat','dog')),
	CONSTRAINT "ck_passport_name" CHECK(length("passport_profiles"."name") between 1 and 160)
);
--> statement-breakpoint
CREATE TABLE `pet_authorities` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`pet_id` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`source` text NOT NULL,
	`provider_reference` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_pet_authority_role" CHECK("pet_authorities"."role" in ('primary','co-guardian')),
	CONSTRAINT "ck_pet_authority_status" CHECK("pet_authorities"."status" in ('active','inactive')),
	CONSTRAINT "ck_pet_authority_source" CHECK("pet_authorities"."source" in ('dev-test','verified-provider'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_pet_authority_person` ON `pet_authorities` (`person_id`,`pet_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_pet_authority_pet` ON `pet_authorities` (`id`,`pet_id`);