CREATE TABLE `outbox_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`outbox_id` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`outcome` text DEFAULT 'sending' NOT NULL,
	`failure_code` text,
	`provider_request_id` text,
	FOREIGN KEY (`outbox_id`) REFERENCES `message_outbox`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_outbox_attempt_outcome" CHECK("outbox_attempts"."outcome" in ('sending','accepted','retry','failed','not-connected'))
);
--> statement-breakpoint
CREATE INDEX `idx_outbox_attempt_history` ON `outbox_attempts` (`outbox_id`,`started_at`);