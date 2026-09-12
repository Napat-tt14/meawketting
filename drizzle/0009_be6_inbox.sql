CREATE TABLE `business_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`provider` text NOT NULL,
	`state` text NOT NULL,
	`external_account_id` text NOT NULL,
	`secret_ref` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_channel_provider" CHECK("business_channels"."provider" in ('line','mock')),
	CONSTRAINT "ck_channel_state" CHECK("business_channels"."state" in ('active','disconnected'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_business_channel_provider` ON `business_channels` (`business_id`,`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_channel_external_account` ON `business_channels` (`provider`,`external_account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_channel_scope` ON `business_channels` (`business_id`,`id`);--> statement-breakpoint
CREATE TABLE `channel_webhook_events` (
	`channel_id` text NOT NULL,
	`event_id` text NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`event_hash` text NOT NULL,
	`provider_message_id` text NOT NULL,
	`external_subject` text NOT NULL,
	`message_id` text,
	`state` text NOT NULL,
	`pending_body` text,
	`occurred_at` text NOT NULL,
	`received_at` text NOT NULL,
	PRIMARY KEY(`channel_id`, `event_id`),
	FOREIGN KEY (`business_id`,`channel_id`) REFERENCES `business_channels`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`message_id`) REFERENCES `messages`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_channel_event_state" CHECK("channel_webhook_events"."state" in ('received','unlinked'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_channel_provider_message` ON `channel_webhook_events` (`channel_id`,`provider_message_id`);--> statement-breakpoint
CREATE INDEX `idx_channel_pending_events` ON `channel_webhook_events` (`channel_id`,`state`,`received_at`);--> statement-breakpoint
CREATE TABLE `conversation_contexts` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`pet_id` text,
	`booking_id` text,
	`execution_id` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`business_id`, `branch_id`, `conversation_id`),
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`conversation_id`) REFERENCES `conversations`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`pet_id`) REFERENCES `business_pet_profiles`(`business_id`,`pet_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`booking_id`) REFERENCES `bookings`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`execution_id`) REFERENCES `service_executions`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `conversation_reads` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`person_id` text NOT NULL,
	`through_sequence` integer NOT NULL,
	`read_at` text NOT NULL,
	PRIMARY KEY(`business_id`, `branch_id`, `conversation_id`, `person_id`),
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`conversation_id`) REFERENCES `conversation_contexts`(`business_id`,`branch_id`,`conversation_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_conversation_read_cursor" CHECK("conversation_reads"."through_sequence">=0)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`business_id`,`customer_id`) REFERENCES `customers`(`business_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_conversation_customer` ON `conversations` (`business_id`,`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_conversation_scope` ON `conversations` (`business_id`,`id`);--> statement-breakpoint
CREATE TABLE `customer_channel_links` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`external_subject` text NOT NULL,
	`status` text NOT NULL,
	`verification_source` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`business_id`,`channel_id`) REFERENCES `business_channels`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`customer_id`) REFERENCES `customers`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_channel_link_status" CHECK("customer_channel_links"."status" in ('active','inactive')),
	CONSTRAINT "ck_channel_link_source" CHECK("customer_channel_links"."verification_source" in ('dev-test','verified-provider'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_channel_customer` ON `customer_channel_links` (`channel_id`,`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_channel_subject` ON `customer_channel_links` (`channel_id`,`external_subject`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_channel_link_scope` ON `customer_channel_links` (`business_id`,`channel_id`,`id`);--> statement-breakpoint
CREATE TABLE `message_approvals` (
	`message_id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`service_name` text NOT NULL,
	`additional_price` integer NOT NULL,
	`additional_minutes` integer NOT NULL,
	`note` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`responded_at` text,
	`authority_id` text,
	`response_source` text,
	FOREIGN KEY (`authority_id`) REFERENCES `pet_authorities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`message_id`) REFERENCES `messages`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_message_approval_status" CHECK("message_approvals"."status" in ('waiting','approved','declined','cancelled','expired')),
	CONSTRAINT "ck_message_approval_amounts" CHECK("message_approvals"."additional_price" between 0 and 10000000 and "message_approvals"."additional_minutes" between 0 and 1440)
);
--> statement-breakpoint
CREATE TABLE `message_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`message_id` text NOT NULL,
	`channel_id` text,
	`link_id` text,
	`recipient` text,
	`retry_key` text NOT NULL,
	`state` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`first_attempt_at` text,
	`available_at` text NOT NULL,
	`lease_token` text,
	`lease_until` text,
	`provider_message_id` text,
	`provider_request_id` text,
	`failure_code` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`business_id`,`branch_id`,`message_id`) REFERENCES `messages`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`channel_id`,`link_id`) REFERENCES `customer_channel_links`(`business_id`,`channel_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`channel_id`) REFERENCES `business_channels`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_outbox_state" CHECK("message_outbox"."state" in ('blocked','queued','sending','retry','sent','failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_outbox_message` ON `message_outbox` (`business_id`,`branch_id`,`message_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_outbox_retry_key` ON `message_outbox` (`retry_key`);--> statement-breakpoint
CREATE INDEX `idx_outbox_due` ON `message_outbox` (`state`,`available_at`,`lease_until`);--> statement-breakpoint
CREATE TABLE `messages` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`kind` text NOT NULL,
	`direction` text NOT NULL,
	`body` text NOT NULL,
	`pet_id` text,
	`booking_id` text,
	`execution_id` text,
	`actor_person_id` text,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`conversation_id`) REFERENCES `conversation_contexts`(`business_id`,`branch_id`,`conversation_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`pet_id`) REFERENCES `business_pet_profiles`(`business_id`,`pet_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`booking_id`) REFERENCES `bookings`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`execution_id`) REFERENCES `service_executions`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_message_kind" CHECK("messages"."kind" in ('text','add-service-request')),
	CONSTRAINT "ck_message_direction" CHECK("messages"."direction" in ('business','customer')),
	CONSTRAINT "ck_message_length" CHECK(length("messages"."body") between 1 and 5000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_message_id` ON `messages` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_message_scope` ON `messages` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_order` ON `messages` (`business_id`,`conversation_id`,`branch_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `person_external_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`provider` text NOT NULL,
	`issuer` text NOT NULL,
	`subject` text NOT NULL,
	`verified_at` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_external_identity_status" CHECK("person_external_identities"."status" in ('active','inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_external_identity_subject` ON `person_external_identities` (`provider`,`issuer`,`subject`);