CREATE TABLE `charge_events` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`charge_id` text NOT NULL,
	`kind` text NOT NULL,
	`summary` text NOT NULL,
	`actor_person_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`actor_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`charge_id`) REFERENCES `charges`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_charge_event_kind" CHECK("charge_events"."kind" in ('created','adjusted','cancelled'))
);
--> statement-breakpoint
CREATE INDEX `idx_charge_events` ON `charge_events` (`business_id`,`branch_id`,`charge_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `charge_items` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`charge_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`reason` text,
	`source_event_id` text,
	`execution_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`business_id`,`branch_id`,`charge_id`) REFERENCES `charges`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`execution_id`) REFERENCES `service_executions`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`source_event_id`) REFERENCES `execution_events`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_charge_item_kind" CHECK("charge_items"."kind" in ('base-service','add-on','manual-adjustment','discount')),
	CONSTRAINT "ck_charge_item_amount" CHECK(typeof("charge_items"."amount_minor")='integer' and abs("charge_items"."amount_minor")<=1000000000 and "charge_items"."amount_minor"%100=0 and (("charge_items"."kind"='discount' and "charge_items"."amount_minor"<0) or ("charge_items"."kind"<>'discount' and "charge_items"."amount_minor">=0))),
	CONSTRAINT "ck_charge_item_label" CHECK(length(trim("charge_items"."label")) between 1 and 160),
	CONSTRAINT "ck_charge_item_reason" CHECK("charge_items"."kind" not in ('discount','manual-adjustment') or length(trim("charge_items"."reason")) between 1 and 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_charge_source_event` ON `charge_items` (`charge_id`,`source_event_id`);--> statement-breakpoint
CREATE INDEX `idx_charge_items` ON `charge_items` (`business_id`,`branch_id`,`charge_id`);--> statement-breakpoint
CREATE TABLE `charges` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`booking_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`pet_id` text,
	`execution_id` text,
	`module` text NOT NULL,
	`service_label` text NOT NULL,
	`currency` text DEFAULT 'THB' NOT NULL,
	`cancelled_at` text,
	`cancellation_reason` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`booking_id`) REFERENCES `bookings`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`customer_id`) REFERENCES `customers`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`pet_id`) REFERENCES `business_pet_profiles`(`business_id`,`pet_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`execution_id`) REFERENCES `service_executions`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_charge_currency" CHECK("charges"."currency"='THB'),
	CONSTRAINT "ck_charge_module" CHECK("charges"."module" in ('grooming','hotel','daycare')),
	CONSTRAINT "ck_charge_revision" CHECK("charges"."revision">0),
	CONSTRAINT "ck_charge_cancellation" CHECK(("charges"."cancelled_at" is null and "charges"."cancellation_reason" is null) or ("charges"."cancelled_at" is not null and length(trim("charges"."cancellation_reason")) between 1 and 1000))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_charge_booking` ON `charges` (`business_id`,`branch_id`,`booking_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_charge_scope` ON `charges` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_charge_customer` ON `charges` (`business_id`,`branch_id`,`customer_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `payment_allocations` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`charge_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	PRIMARY KEY(`business_id`, `branch_id`, `payment_id`, `charge_id`),
	FOREIGN KEY (`business_id`,`branch_id`,`payment_id`) REFERENCES `payments`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`charge_id`) REFERENCES `charges`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_payment_allocation_amount" CHECK(typeof("payment_allocations"."amount_minor")='integer' and "payment_allocations"."amount_minor">0 and "payment_allocations"."amount_minor"%100=0)
);
--> statement-breakpoint
CREATE INDEX `idx_payment_allocation_charge` ON `payment_allocations` (`business_id`,`branch_id`,`charge_id`);--> statement-breakpoint
CREATE TABLE `payment_attempt_events` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`attempt_id` text NOT NULL,
	`kind` text NOT NULL,
	`failure_code` text,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`business_id`,`branch_id`,`attempt_id`) REFERENCES `payment_attempts`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_payment_attempt_history` ON `payment_attempt_events` (`business_id`,`branch_id`,`attempt_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `payment_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`charge_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text DEFAULT 'THB' NOT NULL,
	`idempotency_key` text NOT NULL,
	`state` text DEFAULT 'created' NOT NULL,
	`provider_reference` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`lease_until` text,
	`next_attempt_at` text NOT NULL,
	`failure_code` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`charge_id`) REFERENCES `charges`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`account_id`) REFERENCES `payment_provider_accounts`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_payment_attempt_amount" CHECK(typeof("payment_attempts"."amount_minor")='integer' and "payment_attempts"."amount_minor" between 100 and 1000000000 and "payment_attempts"."amount_minor"%100=0 and "payment_attempts"."currency"='THB'),
	CONSTRAINT "ck_payment_attempt_state" CHECK("payment_attempts"."state" in ('created','pending','retry','failed','succeeded','reconciliation'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_attempt_scope` ON `payment_attempts` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_attempt_key` ON `payment_attempts` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_attempt_provider_ref` ON `payment_attempts` (`account_id`,`provider_reference`);--> statement-breakpoint
CREATE INDEX `idx_payment_attempt_due` ON `payment_attempts` (`state`,`next_attempt_at`,`lease_until`);--> statement-breakpoint
CREATE INDEX `idx_payment_attempt_charge` ON `payment_attempts` (`business_id`,`branch_id`,`charge_id`,`state`);--> statement-breakpoint
CREATE TABLE `payment_provider_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_account_id` text NOT NULL,
	`secret_ref` text NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_payment_account_source" CHECK("payment_provider_accounts"."source" in ('dev-test','verified-provider')),
	CONSTRAINT "ck_payment_account_status" CHECK("payment_provider_accounts"."status" in ('active','inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_account_scope` ON `payment_provider_accounts` (`business_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_external_account` ON `payment_provider_accounts` (`provider`,`external_account_id`);--> statement-breakpoint
CREATE TABLE `payment_refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`reason` text NOT NULL,
	`recorded_by` text NOT NULL,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`recorded_by`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`payment_id`) REFERENCES `payments`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_refund_amount" CHECK(typeof("payment_refunds"."amount_minor")='integer' and "payment_refunds"."amount_minor">0 and "payment_refunds"."amount_minor"%100=0),
	CONSTRAINT "ck_refund_reason" CHECK(length(trim("payment_refunds"."reason")) between 1 and 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_refund_scope` ON `payment_refunds` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_refund_payment_scope` ON `payment_refunds` (`business_id`,`branch_id`,`payment_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_refund_payment` ON `payment_refunds` (`business_id`,`branch_id`,`payment_id`);--> statement-breakpoint
CREATE INDEX `idx_refund_branch_date` ON `payment_refunds` (`business_id`,`branch_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `payment_webhook_events` (
	`account_id` text NOT NULL,
	`event_id` text NOT NULL,
	`business_id` text NOT NULL,
	`event_hash` text NOT NULL,
	`attempt_id` text,
	`state` text NOT NULL,
	`normalized_event_json` text NOT NULL,
	`failure_code` text,
	`received_at` text NOT NULL,
	PRIMARY KEY(`account_id`, `event_id`),
	FOREIGN KEY (`attempt_id`) REFERENCES `payment_attempts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`account_id`) REFERENCES `payment_provider_accounts`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_payment_webhook_state" CHECK("payment_webhook_events"."state" in ('applied','ignored','reconciliation')),
	CONSTRAINT "ck_payment_webhook_json" CHECK(json_valid("payment_webhook_events"."normalized_event_json") and length("payment_webhook_events"."normalized_event_json")<=4000)
);
--> statement-breakpoint
CREATE INDEX `idx_payment_webhook_review` ON `payment_webhook_events` (`business_id`,`state`,`received_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text DEFAULT 'THB' NOT NULL,
	`method` text NOT NULL,
	`source` text NOT NULL,
	`attempt_id` text,
	`account_id` text,
	`provider_reference` text,
	`note` text DEFAULT '' NOT NULL,
	`recorded_by` text NOT NULL,
	`recorded_at` text NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`recorded_by`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`customer_id`) REFERENCES `customers`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`attempt_id`) REFERENCES `payment_attempts`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`account_id`) REFERENCES `payment_provider_accounts`(`business_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_payment_amount" CHECK(typeof("payments"."amount_minor")='integer' and "payments"."amount_minor" between 100 and 1000000000 and "payments"."amount_minor"%100=0 and "payments"."currency"='THB'),
	CONSTRAINT "ck_payment_method" CHECK("payments"."method" in ('cash','bank-transfer','other')),
	CONSTRAINT "ck_payment_source" CHECK(("payments"."source"='manual' and "payments"."attempt_id" is null and "payments"."account_id" is null and "payments"."provider_reference" is null) or ("payments"."source"='provider' and "payments"."attempt_id" is not null and "payments"."account_id" is not null and "payments"."provider_reference" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_scope` ON `payments` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_attempt` ON `payments` (`attempt_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_payment_provider_ref` ON `payments` (`account_id`,`provider_reference`);--> statement-breakpoint
CREATE INDEX `idx_payment_branch_date` ON `payments` (`business_id`,`branch_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_payment_customer` ON `payments` (`business_id`,`customer_id`,`branch_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `refund_allocations` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`refund_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`charge_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	PRIMARY KEY(`business_id`, `branch_id`, `refund_id`, `charge_id`),
	FOREIGN KEY (`business_id`,`branch_id`,`payment_id`,`refund_id`) REFERENCES `payment_refunds`(`business_id`,`branch_id`,`payment_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`,`branch_id`,`payment_id`,`charge_id`) REFERENCES `payment_allocations`(`business_id`,`branch_id`,`payment_id`,`charge_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_refund_allocation_amount" CHECK(typeof("refund_allocations"."amount_minor")='integer' and "refund_allocations"."amount_minor">0 and "refund_allocations"."amount_minor"%100=0)
);
--> statement-breakpoint
CREATE INDEX `idx_refund_allocation_charge` ON `refund_allocations` (`business_id`,`branch_id`,`charge_id`);