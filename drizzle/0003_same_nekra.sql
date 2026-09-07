CREATE TABLE `booking_pets` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`booking_id` text NOT NULL,
	`pet_id` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` text NOT NULL,
	`created_by_person_id` text,
	PRIMARY KEY(`business_id`, `branch_id`, `booking_id`, `pet_id`),
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`,`booking_id`) REFERENCES `bookings`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`pet_id`) REFERENCES `business_pet_profiles`(`business_id`,`pet_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_booking_pets_position" CHECK("booking_pets"."position" between 0 and 23)
);
--> statement-breakpoint
CREATE INDEX `idx_booking_pets_business_pet_booking` ON `booking_pets` (`business_id`,`pet_id`,`booking_id`);--> statement-breakpoint
CREATE TABLE `booking_resource_assignments` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`booking_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` text NOT NULL,
	`created_by_person_id` text,
	PRIMARY KEY(`business_id`, `branch_id`, `booking_id`, `resource_id`),
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`,`booking_id`) REFERENCES `bookings`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`,`resource_id`) REFERENCES `booking_resources`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_booking_assignments_position" CHECK("booking_resource_assignments"."position" between 0 and 23)
);
--> statement-breakpoint
CREATE INDEX `idx_booking_assignments_resource_booking` ON `booking_resource_assignments` (`business_id`,`branch_id`,`resource_id`,`booking_id`);--> statement-breakpoint
CREATE TABLE `booking_resource_availability_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`state` text NOT NULL,
	`start_local` text NOT NULL,
	`end_local` text NOT NULL,
	`start_minute` integer NOT NULL,
	`end_minute` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by_person_id` text,
	`updated_by_person_id` text,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`,`resource_id`) REFERENCES `booking_resources`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_booking_resource_windows_state" CHECK("booking_resource_availability_windows"."state" in ('working', 'unavailable', 'break', 'time-off')),
	CONSTRAINT "ck_booking_resource_windows_range" CHECK("booking_resource_availability_windows"."end_minute" > "booking_resource_availability_windows"."start_minute")
);
--> statement-breakpoint
CREATE INDEX `idx_booking_resource_windows_interval` ON `booking_resource_availability_windows` (`business_id`,`branch_id`,`resource_id`,`start_minute`,`end_minute`);--> statement-breakpoint
CREATE TABLE `booking_resource_reservations` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`booking_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`reservation_key` text NOT NULL,
	`reservation_date` text,
	`start_minute` integer NOT NULL,
	`end_minute` integer NOT NULL,
	`units` integer NOT NULL,
	PRIMARY KEY(`business_id`, `branch_id`, `booking_id`, `resource_id`, `reservation_key`),
	FOREIGN KEY (`business_id`,`branch_id`,`booking_id`,`resource_id`) REFERENCES `booking_resource_assignments`(`business_id`,`branch_id`,`booking_id`,`resource_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_booking_reservations_range" CHECK("booking_resource_reservations"."end_minute" > "booking_resource_reservations"."start_minute"),
	CONSTRAINT "ck_booking_reservations_units" CHECK("booking_resource_reservations"."units" between 1 and 10000)
);
--> statement-breakpoint
CREATE INDEX `idx_booking_reservations_resource_interval` ON `booking_resource_reservations` (`business_id`,`branch_id`,`resource_id`,`start_minute`,`end_minute`);--> statement-breakpoint
CREATE INDEX `idx_booking_reservations_resource_date` ON `booking_resource_reservations` (`business_id`,`branch_id`,`resource_id`,`reservation_date`);--> statement-breakpoint
CREATE TABLE `booking_resource_service_links` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`service_id` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by_person_id` text,
	PRIMARY KEY(`business_id`, `branch_id`, `resource_id`, `service_id`),
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`,`resource_id`) REFERENCES `booking_resources`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`,`service_id`) REFERENCES `booking_services`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_booking_resource_links_service` ON `booking_resource_service_links` (`business_id`,`branch_id`,`service_id`,`resource_id`);--> statement-breakpoint
CREATE TABLE `booking_resources` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`module` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`capacity_mode` text NOT NULL,
	`capacity` integer NOT NULL,
	`compatibility_staff_id` text,
	`hotel_role` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by_person_id` text,
	`updated_by_person_id` text,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_booking_resources_id" CHECK(length("booking_resources"."id") >= 8),
	CONSTRAINT "ck_booking_resources_module" CHECK("booking_resources"."module" in ('grooming', 'hotel', 'daycare')),
	CONSTRAINT "ck_booking_resources_kind" CHECK("booking_resources"."kind" in ('groomer', 'grooming-station', 'dryer', 'hotel-room-type', 'daycare-zone')),
	CONSTRAINT "ck_booking_resources_label" CHECK(length(trim("booking_resources"."label")) between 1 and 160),
	CONSTRAINT "ck_booking_resources_capacity_mode" CHECK("booking_resources"."capacity_mode" in ('exclusive', 'capacity')),
	CONSTRAINT "ck_booking_resources_capacity" CHECK("booking_resources"."capacity" between 1 and 10000),
	CONSTRAINT "ck_booking_resources_hotel_role" CHECK("booking_resources"."hotel_role" is null or "booking_resources"."hotel_role" = 'planning-capacity'),
	CONSTRAINT "ck_status_lifecycle" CHECK("booking_resources"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_booking_resources_scope_id` ON `booking_resources` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_booking_resources_branch_status_kind` ON `booking_resources` (`business_id`,`branch_id`,`status`,`kind`);--> statement-breakpoint
CREATE TABLE `booking_service_resource_requirements` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`service_id` text NOT NULL,
	`resource_kind` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`created_by_person_id` text,
	PRIMARY KEY(`business_id`, `branch_id`, `service_id`, `resource_kind`),
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`,`service_id`) REFERENCES `booking_services`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_booking_service_requirements_kind" CHECK("booking_service_resource_requirements"."resource_kind" in ('groomer', 'grooming-station', 'dryer', 'hotel-room-type', 'daycare-zone'))
);
--> statement-breakpoint
CREATE INDEX `idx_booking_service_requirements_service_position` ON `booking_service_resource_requirements` (`business_id`,`branch_id`,`service_id`,`position`);--> statement-breakpoint
CREATE TABLE `booking_services` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`module` text NOT NULL,
	`label` text NOT NULL,
	`time_model` text NOT NULL,
	`default_duration_minutes` integer,
	`estimate` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by_person_id` text,
	`updated_by_person_id` text,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_booking_services_id" CHECK(length("booking_services"."id") >= 8),
	CONSTRAINT "ck_booking_services_module" CHECK("booking_services"."module" in ('grooming', 'hotel', 'daycare')),
	CONSTRAINT "ck_booking_services_time_model" CHECK("booking_services"."time_model" in ('appointment', 'date-range', 'day')),
	CONSTRAINT "ck_booking_services_label" CHECK(length(trim("booking_services"."label")) between 1 and 160),
	CONSTRAINT "ck_booking_services_duration" CHECK("booking_services"."default_duration_minutes" is null or "booking_services"."default_duration_minutes" between 1 and 1440),
	CONSTRAINT "ck_booking_services_estimate" CHECK("booking_services"."estimate" is null or "booking_services"."estimate" between 0 and 1000000),
	CONSTRAINT "ck_status_lifecycle" CHECK("booking_services"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_booking_services_scope_id` ON `booking_services` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_booking_services_branch_status_module` ON `booking_services` (`business_id`,`branch_id`,`status`,`module`);--> statement-breakpoint
CREATE TABLE `booking_write_commits` (
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`booking_id` text NOT NULL,
	`revision` integer NOT NULL,
	`write_token` text NOT NULL,
	`committed_at` text NOT NULL,
	PRIMARY KEY(`business_id`, `branch_id`, `booking_id`, `revision`),
	FOREIGN KEY (`business_id`,`branch_id`,`booking_id`) REFERENCES `bookings`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_booking_write_commits_token` ON `booking_write_commits` (`write_token`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`service_id` text NOT NULL,
	`service_module` text NOT NULL,
	`time_model` text NOT NULL,
	`start_local` text NOT NULL,
	`end_local` text,
	`start_minute` integer NOT NULL,
	`end_minute` integer NOT NULL,
	`start_weekday` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`estimate` integer,
	`notes` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`write_token` text NOT NULL,
	`idempotency_key` text,
	`create_request_hash` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`cancelled_at` text,
	`created_by_person_id` text,
	`updated_by_person_id` text,
	`cancelled_by_person_id` text,
	FOREIGN KEY (`created_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cancelled_by_person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`) REFERENCES `branches`(`business_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`customer_id`) REFERENCES `customers`(`business_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`,`branch_id`,`service_id`) REFERENCES `booking_services`(`business_id`,`branch_id`,`id`) ON UPDATE no action ON DELETE restrict,
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
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_bookings_scope_id` ON `bookings` (`business_id`,`branch_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_bookings_business_idempotency` ON `bookings` (`business_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_bookings_branch_range` ON `bookings` (`business_id`,`branch_id`,`start_minute`,`end_minute`,`id`);--> statement-breakpoint
CREATE INDEX `idx_bookings_business_customer_range` ON `bookings` (`business_id`,`customer_id`,`start_minute`,`id`);--> statement-breakpoint
CREATE INDEX `idx_bookings_branch_module_status_range` ON `bookings` (`business_id`,`branch_id`,`service_module`,`status`,`start_minute`);
--> statement-breakpoint
-- BE3 concurrency guard: every reservation insert runs inside the same D1
-- transactional batch as its Booking aggregate. SQLite serializes writers, so
-- the losing concurrent write observes the winner and aborts the whole batch.
CREATE TRIGGER `trg_be3_reservation_exclusive_conflict`
BEFORE INSERT ON `booking_resource_reservations`
WHEN EXISTS (
  SELECT 1
  FROM `bookings` candidate
  INNER JOIN `booking_resources` resource
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
      FROM `booking_resource_reservations` occupied
      INNER JOIN `bookings` existing
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
)
BEGIN
  SELECT RAISE(ABORT, 'BE3_TIME_CONFLICT');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_be3_reservation_capacity_conflict`
BEFORE INSERT ON `booking_resource_reservations`
WHEN EXISTS (
  SELECT 1
  FROM `bookings` candidate
  INNER JOIN `booking_resources` resource
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
        FROM `booking_resource_reservations` occupied
        INNER JOIN `bookings` existing
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
)
BEGIN
  SELECT RAISE(ABORT, 'BE3_CAPACITY_CONFLICT');
END;
--> statement-breakpoint
-- Final aggregate commit guard. This is deliberately separate from the UI's
-- availability preview: it executes after Pets, assignments, and reservations
-- have been staged but before the D1 batch can commit.
CREATE TRIGGER `trg_be3_booking_commit_guard`
BEFORE INSERT ON `booking_write_commits`
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM `bookings` booking
    WHERE booking.business_id = NEW.business_id
      AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id
      AND booking.revision = NEW.revision
      AND booking.write_token = NEW.write_token
  ) THEN RAISE(ABORT, 'BE3_RESERVATION_INTEGRITY') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM `bookings` booking
    INNER JOIN `branches` branch
      ON branch.business_id = booking.business_id AND branch.id = booking.branch_id
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND branch.status <> 'active'
  ) THEN RAISE(ABORT, 'BE3_BRANCH_INACTIVE') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM `bookings` booking
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM `branch_enabled_modules` enabled
        WHERE enabled.business_id = booking.business_id
          AND enabled.branch_id = booking.branch_id
          AND enabled.module = booking.service_module
      )
  ) THEN RAISE(ABORT, 'BE3_MODULE_DISABLED') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM `bookings` booking
    LEFT JOIN `booking_services` service
      ON service.business_id = booking.business_id
     AND service.branch_id = booking.branch_id
     AND service.id = booking.service_id
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND (service.id IS NULL OR service.status <> 'active'
        OR service.module <> booking.service_module OR service.time_model <> booking.time_model)
  ) THEN RAISE(ABORT, 'BE3_SERVICE_UNAVAILABLE') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM `bookings` booking
    LEFT JOIN `customers` customer
      ON customer.business_id = booking.business_id AND customer.id = booking.customer_id
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND (customer.id IS NULL OR customer.status <> 'active')
  ) THEN RAISE(ABORT, 'BE3_CUSTOMER_UNAVAILABLE') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM `bookings` booking
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM `booking_pets` pet
        WHERE pet.business_id = booking.business_id
          AND pet.branch_id = booking.branch_id
          AND pet.booking_id = booking.id
      )
  ) THEN RAISE(ABORT, 'BE3_PET_UNAVAILABLE') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM `booking_pets` pet
    INNER JOIN `bookings` booking
      ON booking.business_id = pet.business_id
     AND booking.branch_id = pet.branch_id
     AND booking.id = pet.booking_id
    LEFT JOIN `business_pet_profiles` profile
      ON profile.business_id = pet.business_id AND profile.pet_id = pet.pet_id
    WHERE pet.business_id = NEW.business_id AND pet.branch_id = NEW.branch_id
      AND pet.booking_id = NEW.booking_id AND booking.status <> 'cancelled'
      AND (profile.pet_id IS NULL OR profile.status <> 'active')
  ) THEN RAISE(ABORT, 'BE3_PET_UNAVAILABLE') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM `booking_pets` pet
    INNER JOIN `bookings` booking
      ON booking.business_id = pet.business_id
     AND booking.branch_id = pet.branch_id
     AND booking.id = pet.booking_id
    WHERE pet.business_id = NEW.business_id AND pet.branch_id = NEW.branch_id
      AND pet.booking_id = NEW.booking_id AND booking.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM `customer_pet_relationships` relationship
        WHERE relationship.business_id = booking.business_id
          AND relationship.customer_id = booking.customer_id
          AND relationship.pet_id = pet.pet_id
          AND relationship.status = 'active'
      )
  ) THEN RAISE(ABORT, 'BE3_RELATIONSHIP_MISSING') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM `bookings` booking
    INNER JOIN `booking_service_resource_requirements` requirement
      ON requirement.business_id = booking.business_id
     AND requirement.branch_id = booking.branch_id
     AND requirement.service_id = booking.service_id
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1
        FROM `booking_resource_assignments` assignment
        INNER JOIN `booking_resources` resource
          ON resource.business_id = assignment.business_id
         AND resource.branch_id = assignment.branch_id
         AND resource.id = assignment.resource_id
        WHERE assignment.business_id = booking.business_id
          AND assignment.branch_id = booking.branch_id
          AND assignment.booking_id = booking.id
          AND resource.kind = requirement.resource_kind
      )
  ) THEN RAISE(ABORT, 'BE3_MISSING_RESOURCE') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM `booking_resource_assignments` assignment
    INNER JOIN `bookings` booking
      ON booking.business_id = assignment.business_id
     AND booking.branch_id = assignment.branch_id
     AND booking.id = assignment.booking_id
    LEFT JOIN `booking_resources` resource
      ON resource.business_id = assignment.business_id
     AND resource.branch_id = assignment.branch_id
     AND resource.id = assignment.resource_id
    WHERE assignment.business_id = NEW.business_id AND assignment.branch_id = NEW.branch_id
      AND assignment.booking_id = NEW.booking_id AND booking.status <> 'cancelled'
      AND (resource.id IS NULL OR resource.status <> 'active' OR resource.module <> booking.service_module
        OR NOT EXISTS (
          SELECT 1 FROM `booking_resource_service_links` link
          WHERE link.business_id = booking.business_id
            AND link.branch_id = booking.branch_id
            AND link.resource_id = assignment.resource_id
            AND link.service_id = booking.service_id
        ))
  ) THEN RAISE(ABORT, 'BE3_RESOURCE_UNAVAILABLE') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM `bookings` booking
    INNER JOIN `branch_operating_hours` hours
      ON hours.business_id = booking.business_id
     AND hours.branch_id = booking.branch_id
     AND hours.weekday = booking.start_weekday
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND hours.closed = 1
  ) THEN RAISE(ABORT, 'BE3_BRANCH_CLOSED') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM `bookings` booking
    INNER JOIN `branch_operating_hours` hours
      ON hours.business_id = booking.business_id
     AND hours.branch_id = booking.branch_id
     AND hours.weekday = booking.start_weekday
    WHERE booking.business_id = NEW.business_id AND booking.branch_id = NEW.branch_id
      AND booking.id = NEW.booking_id AND booking.status <> 'cancelled'
      AND booking.time_model = 'appointment' AND hours.closed = 0
      AND (substr(booking.start_local, 12, 5) < hours.opens_at
        OR substr(booking.end_local, 12, 5) > hours.closes_at)
  ) THEN RAISE(ABORT, 'BE3_OUTSIDE_OPERATING_HOURS') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM `booking_resource_assignments` assignment
    INNER JOIN `bookings` booking
      ON booking.business_id = assignment.business_id
     AND booking.branch_id = assignment.branch_id
     AND booking.id = assignment.booking_id
    INNER JOIN `booking_resources` resource
      ON resource.business_id = assignment.business_id
     AND resource.branch_id = assignment.branch_id
     AND resource.id = assignment.resource_id
    WHERE assignment.business_id = NEW.business_id AND assignment.branch_id = NEW.branch_id
      AND assignment.booking_id = NEW.booking_id AND booking.status <> 'cancelled'
      AND resource.compatibility_staff_id IS NOT NULL
      AND (
        (EXISTS (
          SELECT 1 FROM `booking_resource_availability_windows` working
          WHERE working.business_id = assignment.business_id
            AND working.branch_id = assignment.branch_id
            AND working.resource_id = assignment.resource_id
            AND working.state = 'working'
            AND CAST(working.start_minute / 1440 AS INTEGER) <= CAST((booking.end_minute - 1) / 1440 AS INTEGER)
            AND CAST((working.end_minute - 1) / 1440 AS INTEGER) >= CAST(booking.start_minute / 1440 AS INTEGER)
        ) AND NOT EXISTS (
          SELECT 1 FROM `booking_resource_availability_windows` working
          WHERE working.business_id = assignment.business_id
            AND working.branch_id = assignment.branch_id
            AND working.resource_id = assignment.resource_id
            AND working.state = 'working'
            AND booking.start_minute >= working.start_minute
            AND booking.end_minute <= working.end_minute
        ))
        OR EXISTS (
          SELECT 1 FROM `booking_resource_availability_windows` blocked
          WHERE blocked.business_id = assignment.business_id
            AND blocked.branch_id = assignment.branch_id
            AND blocked.resource_id = assignment.resource_id
            AND blocked.state <> 'working'
            AND blocked.start_minute < booking.end_minute
            AND blocked.end_minute > booking.start_minute
        )
      )
  ) THEN RAISE(ABORT, 'BE3_STAFF_UNAVAILABLE') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM `booking_resource_assignments` assignment
    INNER JOIN `bookings` booking
      ON booking.business_id = assignment.business_id
     AND booking.branch_id = assignment.branch_id
     AND booking.id = assignment.booking_id
    INNER JOIN `booking_resources` resource
      ON resource.business_id = assignment.business_id
     AND resource.branch_id = assignment.branch_id
     AND resource.id = assignment.resource_id
    WHERE assignment.business_id = NEW.business_id AND assignment.branch_id = NEW.branch_id
      AND assignment.booking_id = NEW.booking_id
      AND (
        (resource.capacity_mode = 'exclusive' AND (
          SELECT COUNT(*) FROM `booking_resource_reservations` reservation
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
          SELECT COUNT(*) FROM `booking_resource_reservations` reservation
          WHERE reservation.business_id = assignment.business_id
            AND reservation.branch_id = assignment.branch_id
            AND reservation.booking_id = assignment.booking_id
            AND reservation.resource_id = assignment.resource_id
            AND reservation.reservation_date IS NOT NULL
            AND reservation.units = (
              SELECT COUNT(*) FROM `booking_pets` pet
              WHERE pet.business_id = booking.business_id
                AND pet.branch_id = booking.branch_id
                AND pet.booking_id = booking.id
            )
        ) <> (CAST((booking.end_minute - 1) / 1440 AS INTEGER) - CAST(booking.start_minute / 1440 AS INTEGER) + 1))
      )
  ) THEN RAISE(ABORT, 'BE3_RESERVATION_INTEGRITY') END;
END;
