CREATE TABLE `business_pet_profiles` (
	`business_id` text NOT NULL,
	`pet_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`species` text NOT NULL,
	`profile_source` text DEFAULT 'business-local' NOT NULL,
	`business_notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by_person_id` text,
	`updated_by_person_id` text,
	PRIMARY KEY(`business_id`, `pet_id`),
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_business_pet_profiles_name" CHECK(length(trim("business_pet_profiles"."name")) between 1 and 120),
	CONSTRAINT "ck_business_pet_profiles_name_key" CHECK(length(trim("business_pet_profiles"."name_key")) between 1 and 120),
	CONSTRAINT "ck_business_pet_profiles_species" CHECK("business_pet_profiles"."species" in ('cat', 'dog')),
	CONSTRAINT "ck_business_pet_profiles_source" CHECK("business_pet_profiles"."profile_source" in ('business-local', 'customer-reported')),
	CONSTRAINT "ck_business_pet_profiles_notes" CHECK(length("business_pet_profiles"."business_notes") <= 4000),
	CONSTRAINT "ck_status_lifecycle" CHECK("business_pet_profiles"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE INDEX `idx_business_pet_profiles_business_status_name` ON `business_pet_profiles` (`business_id`,`status`,`name_key`,`pet_id`);--> statement-breakpoint
CREATE INDEX `idx_business_pet_profiles_business_name_species` ON `business_pet_profiles` (`business_id`,`name_key`,`species`,`pet_id`);--> statement-breakpoint
CREATE TABLE `customer_pet_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`pet_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by_person_id` text,
	`updated_by_person_id` text,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`customer_id`) REFERENCES `customers`(`business_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`pet_id`) REFERENCES `business_pet_profiles`(`business_id`,`pet_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_customer_pet_relationships_id" CHECK(length("customer_pet_relationships"."id") >= 16),
	CONSTRAINT "ck_status_lifecycle" CHECK("customer_pet_relationships"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_customer_pet_relationships_scope` ON `customer_pet_relationships` (`business_id`,`customer_id`,`pet_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_customer_pet_relationships_business_id` ON `customer_pet_relationships` (`business_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_customer_pet_relationships_customer_status` ON `customer_pet_relationships` (`business_id`,`customer_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_customer_pet_relationships_pet_status` ON `customer_pet_relationships` (`business_id`,`pet_id`,`status`);--> statement-breakpoint
CREATE TABLE `customer_tags` (
	`business_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`tag_key` text NOT NULL,
	`label` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by_person_id` text,
	`updated_by_person_id` text,
	PRIMARY KEY(`business_id`, `customer_id`, `tag_key`),
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`customer_id`) REFERENCES `customers`(`business_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_customer_tags_tag_key" CHECK(length(trim("customer_tags"."tag_key")) between 1 and 32),
	CONSTRAINT "ck_customer_tags_label" CHECK(length(trim("customer_tags"."label")) between 1 and 32),
	CONSTRAINT "ck_customer_tags_position" CHECK("customer_tags"."position" between 0 and 7)
);
--> statement-breakpoint
CREATE INDEX `idx_customer_tags_business_customer_position` ON `customer_tags` (`business_id`,`customer_id`,`position`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`display_name` text NOT NULL,
	`display_name_key` text NOT NULL,
	`phone` text,
	`phone_key` text,
	`email` text,
	`business_notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by_person_id` text,
	`updated_by_person_id` text,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_customers_id" CHECK(length("customers"."id") >= 16),
	CONSTRAINT "ck_customers_display_name" CHECK(length(trim("customers"."display_name")) between 1 and 120),
	CONSTRAINT "ck_customers_display_name_key" CHECK(length(trim("customers"."display_name_key")) between 1 and 120),
	CONSTRAINT "ck_customers_phone" CHECK("customers"."phone" is null or length("customers"."phone") between 1 and 40),
	CONSTRAINT "ck_customers_phone_key" CHECK("customers"."phone_key" is null or length("customers"."phone_key") between 1 and 40),
	CONSTRAINT "ck_customers_email" CHECK("customers"."email" is null or length("customers"."email") between 3 and 254),
	CONSTRAINT "ck_customers_business_notes" CHECK(length("customers"."business_notes") <= 4000),
	CONSTRAINT "ck_status_lifecycle" CHECK("customers"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_customers_business_id_id` ON `customers` (`business_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_customers_business_status_name` ON `customers` (`business_id`,`status`,`display_name_key`,`id`);--> statement-breakpoint
CREATE INDEX `idx_customers_business_phone_key` ON `customers` (`business_id`,`phone_key`);--> statement-breakpoint
CREATE TABLE `pets` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`created_by_person_id` text,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_pets_id" CHECK(length("pets"."id") >= 8)
);
