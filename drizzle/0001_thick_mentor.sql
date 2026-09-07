PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_membership_branch_access` (
	`membership_id` text NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by_person_id` text,
	`updated_by_person_id` text,
	PRIMARY KEY(`membership_id`, `branch_id`),
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`membership_id`,`business_id`) REFERENCES `business_memberships`(`id`,`business_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_status_lifecycle" CHECK("__new_membership_branch_access"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
INSERT INTO `__new_membership_branch_access`("membership_id", "business_id", "branch_id", "status", "created_at", "updated_at", "created_by_person_id", "updated_by_person_id") SELECT "membership_id", "business_id", "branch_id", 'active', "created_at", "created_at", "created_by_person_id", "created_by_person_id" FROM `membership_branch_access`;--> statement-breakpoint
DROP TABLE `membership_branch_access`;--> statement-breakpoint
ALTER TABLE `__new_membership_branch_access` RENAME TO `membership_branch_access`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_membership_branch_access_membership_status` ON `membership_branch_access` (`membership_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_membership_branch_access_business_branch` ON `membership_branch_access` (`business_id`,`branch_id`);
