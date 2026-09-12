PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_backend_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`allowed` integer NOT NULL,
	`version_ok` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "ck_backend_authorization" CHECK("__new_backend_guards"."allowed" = 1),
	CONSTRAINT "ck_backend_version" CHECK("__new_backend_guards"."version_ok" = 1)
);
--> statement-breakpoint
INSERT INTO `__new_backend_guards`("id", "allowed", "version_ok") SELECT "id", "allowed", 1 FROM `backend_guards`;--> statement-breakpoint
DROP TABLE `backend_guards`;--> statement-breakpoint
ALTER TABLE `__new_backend_guards` RENAME TO `backend_guards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
CREATE TRIGGER trg_be4_execution_source BEFORE INSERT ON service_executions BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM bookings b JOIN booking_pets p ON p.business_id=b.business_id AND p.branch_id=b.branch_id AND p.booking_id=b.id
    WHERE b.business_id=NEW.business_id AND b.branch_id=NEW.branch_id AND b.id=NEW.booking_id
      AND b.customer_id=NEW.customer_id AND p.pet_id=NEW.pet_id AND b.service_module=NEW.module
  ) THEN RAISE(ABORT,'BE4_SCOPE') END;
END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_assignment_scope BEFORE INSERT ON execution_assignments BEGIN
  SELECT CASE WHEN NEW.resource_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM booking_resources r JOIN service_executions e ON e.business_id=r.business_id AND e.branch_id=r.branch_id
    JOIN bookings b ON b.business_id=e.business_id AND b.branch_id=e.branch_id AND b.id=e.booking_id
    JOIN booking_resource_service_links l ON l.business_id=r.business_id AND l.branch_id=r.branch_id AND l.resource_id=r.id AND l.service_id=b.service_id
    WHERE r.business_id=NEW.business_id AND r.branch_id=NEW.branch_id AND r.id=NEW.resource_id AND e.id=NEW.execution_id
      AND r.status='active' AND r.module=e.module AND ((e.module='grooming' AND r.kind IN ('groomer','grooming-station','dryer')) OR (e.module='daycare' AND r.kind='daycare-zone'))
  ) THEN RAISE(ABORT,'BE4_RESOURCE') END;
  SELECT CASE WHEN NEW.space_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM hotel_spaces s JOIN service_executions e ON e.business_id=s.business_id AND e.branch_id=s.branch_id
    JOIN bookings b ON b.business_id=e.business_id AND b.branch_id=e.branch_id AND b.id=e.booking_id AND b.service_id=s.service_id
    WHERE s.business_id=NEW.business_id AND s.branch_id=NEW.branch_id AND s.id=NEW.space_id AND s.status='active' AND e.id=NEW.execution_id AND e.module='hotel'
  ) THEN RAISE(ABORT,'BE4_RESOURCE') END;
  SELECT CASE WHEN NEW.staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM operation_staff s JOIN operation_staff_branches a ON a.business_id=s.business_id AND a.staff_id=s.id
    JOIN service_executions e ON e.business_id=a.business_id AND e.branch_id=a.branch_id
    WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND s.id=NEW.staff_id AND e.id=NEW.execution_id
      AND s.status='active' AND EXISTS(SELECT 1 FROM json_each(s.capabilities_json) WHERE value=e.module)
  ) THEN RAISE(ABORT,'BE4_STAFF') END;
END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_grooming_capacity BEFORE INSERT ON execution_assignments
WHEN NEW.resource_id IS NOT NULL AND EXISTS(SELECT 1 FROM service_executions WHERE id=NEW.execution_id AND module='grooming' AND status<>'cancelled') BEGIN
  -- The approved BE4 rule groups sibling Jobs by Booking, not by Pet.
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM execution_assignments a JOIN service_executions e ON e.id=a.execution_id AND e.business_id=a.business_id AND e.branch_id=a.branch_id
    JOIN service_executions target ON target.id=NEW.execution_id
    WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND a.resource_id=NEW.resource_id
      AND e.booking_id<>target.booking_id AND e.status<>'cancelled' AND a.start_local<NEW.end_local AND NEW.start_local<a.end_local
  ) OR EXISTS (
    SELECT 1 FROM booking_resource_reservations r JOIN bookings b ON b.business_id=r.business_id AND b.branch_id=r.branch_id AND b.id=r.booking_id
    JOIN service_executions target ON target.id=NEW.execution_id
    WHERE r.business_id=NEW.business_id AND r.branch_id=NEW.branch_id AND r.resource_id=NEW.resource_id AND b.id<>target.booking_id
      AND b.status<>'cancelled' AND b.start_local<NEW.end_local AND NEW.start_local<b.end_local
  ) THEN RAISE(ABORT,'BE4_CAPACITY') END;
END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_hotel_capacity BEFORE INSERT ON execution_assignments
WHEN NEW.space_id IS NOT NULL AND NEW.start_local<NEW.end_local AND EXISTS(SELECT 1 FROM service_executions WHERE id=NEW.execution_id AND status NOT IN ('checked-out','completed','cancelled','no-show')) BEGIN
  SELECT CASE WHEN EXISTS (
    WITH RECURSIVE days(day) AS (
      SELECT NEW.start_local UNION ALL SELECT date(day,'+1 day') FROM days WHERE date(day,'+1 day')<NEW.end_local
    )
    SELECT 1 FROM days d WHERE 1+(
      SELECT count(DISTINCT a.execution_id) FROM execution_assignments a JOIN service_executions e ON e.business_id=a.business_id AND e.branch_id=a.branch_id AND e.id=a.execution_id
      WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND a.space_id=NEW.space_id AND a.execution_id<>NEW.execution_id
        AND e.status NOT IN ('checked-out','completed','cancelled','no-show') AND a.start_local<=d.day AND a.end_local>d.day
    ) > (SELECT capacity FROM hotel_spaces WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND id=NEW.space_id)
  ) THEN RAISE(ABORT,'BE4_CAPACITY') END;
END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_daycare_capacity BEFORE INSERT ON execution_assignments
WHEN NEW.resource_id IS NOT NULL AND EXISTS(SELECT 1 FROM service_executions WHERE id=NEW.execution_id AND module='daycare' AND status IN ('checked-in','active','ready-for-pickup')) BEGIN
  SELECT CASE WHEN 1+(
    SELECT count(DISTINCT a.execution_id) FROM execution_assignments a JOIN service_executions e ON e.id=a.execution_id AND e.business_id=a.business_id AND e.branch_id=a.branch_id
    WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND a.resource_id=NEW.resource_id AND a.execution_id<>NEW.execution_id
      AND e.status IN ('checked-in','active','ready-for-pickup') AND a.start_local<NEW.end_local AND NEW.start_local<a.end_local
  ) > (SELECT capacity FROM booking_resources WHERE business_id=NEW.business_id AND branch_id=NEW.branch_id AND id=NEW.resource_id)
  THEN RAISE(ABORT,'BE4_CAPACITY') END;
END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_events_immutable_update BEFORE UPDATE ON execution_events BEGIN SELECT RAISE(ABORT,'BE4_IMMUTABLE_EVENT'); END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_events_immutable_delete BEFORE DELETE ON execution_events BEGIN SELECT RAISE(ABORT,'BE4_IMMUTABLE_EVENT'); END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_record_revisions_immutable_update BEFORE UPDATE ON service_record_revisions BEGIN SELECT RAISE(ABORT,'BE4_IMMUTABLE_EVENT'); END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_record_revisions_immutable_delete BEFORE DELETE ON service_record_revisions BEGIN SELECT RAISE(ABORT,'BE4_IMMUTABLE_EVENT'); END;
--> statement-breakpoint
-- Upgrade existing BE3 staff compatibility data server-side. These are
-- operational profiles, with no Person/Membership/Guardian inference.
INSERT OR IGNORE INTO operation_staff(id,business_id,name,avatar_seed,display_role,capabilities_json,status,revision,created_at,updated_at)
SELECT compatibility_staff_id,business_id,min(label),compatibility_staff_id,'staff','["grooming"]',
  CASE WHEN max(status='active') THEN 'active' ELSE 'inactive' END,1,min(created_at),max(updated_at)
FROM booking_resources WHERE compatibility_staff_id IS NOT NULL GROUP BY business_id,compatibility_staff_id;
--> statement-breakpoint
INSERT OR IGNORE INTO operation_staff_branches(business_id,branch_id,staff_id)
SELECT business_id,branch_id,compatibility_staff_id FROM booking_resources WHERE compatibility_staff_id IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note)
SELECT w.id,w.business_id,r.compatibility_staff_id,w.state,w.start_local,w.end_local,NULL
FROM booking_resource_availability_windows w JOIN booking_resources r ON r.business_id=w.business_id AND r.branch_id=w.branch_id AND r.id=w.resource_id
WHERE r.compatibility_staff_id IS NOT NULL;
--> statement-breakpoint
DELETE FROM booking_resource_availability_windows WHERE EXISTS(
  SELECT 1 FROM booking_resources r WHERE r.business_id=booking_resource_availability_windows.business_id
    AND r.branch_id=booking_resource_availability_windows.branch_id AND r.id=booking_resource_availability_windows.resource_id AND r.compatibility_staff_id IS NOT NULL);
--> statement-breakpoint
CREATE VIEW be4_staff_slots AS
SELECT business_id,staff_id,state,CAST(strftime('%s',start_local) AS INTEGER)/60 AS start_minute,
  CAST(strftime('%s',end_local) AS INTEGER)/60 + CASE WHEN length(end_local)=10 AND end_local=start_local THEN 1440 ELSE 0 END AS end_minute
FROM operation_staff_windows;
--> statement-breakpoint
CREATE TRIGGER trg_be4_booking_staff_guard BEFORE INSERT ON booking_write_commits BEGIN
  SELECT CASE WHEN EXISTS(
    SELECT 1 FROM bookings b JOIN booking_resource_assignments a ON a.business_id=b.business_id AND a.branch_id=b.branch_id AND a.booking_id=b.id
    JOIN booking_resources r ON r.business_id=a.business_id AND r.branch_id=a.branch_id AND r.id=a.resource_id
    WHERE b.business_id=NEW.business_id AND b.branch_id=NEW.branch_id AND b.id=NEW.booking_id AND b.status<>'cancelled' AND r.compatibility_staff_id IS NOT NULL
    AND (NOT EXISTS(SELECT 1 FROM operation_staff s JOIN operation_staff_branches l ON l.business_id=s.business_id AND l.staff_id=s.id
      WHERE s.business_id=b.business_id AND s.id=r.compatibility_staff_id AND l.branch_id=b.branch_id AND s.status='active'
        AND EXISTS(SELECT 1 FROM json_each(s.capabilities_json) WHERE value='grooming'))
      OR EXISTS(SELECT 1 FROM be4_staff_slots w WHERE w.business_id=b.business_id AND w.staff_id=r.compatibility_staff_id AND w.state<>'working' AND w.start_minute<b.end_minute AND b.start_minute<w.end_minute)
      OR (EXISTS(SELECT 1 FROM be4_staff_slots w WHERE w.business_id=b.business_id AND w.staff_id=r.compatibility_staff_id AND w.state='working'
        AND w.start_minute/1440 <= (b.end_minute-1)/1440 AND (w.end_minute-1)/1440 >= b.start_minute/1440)
        AND NOT EXISTS(SELECT 1 FROM be4_staff_slots w WHERE w.business_id=b.business_id AND w.staff_id=r.compatibility_staff_id AND w.state='working' AND w.start_minute<=b.start_minute AND w.end_minute>=b.end_minute)))
  ) THEN RAISE(ABORT,'BE3_STAFF_UNAVAILABLE') END;
END;
--> statement-breakpoint
-- Planning checks actual Grooming assignments too, including reassignment
-- after arrival. Siblings in the same Booking share their reserved interval.
CREATE TRIGGER trg_be4_booking_execution_conflict BEFORE INSERT ON booking_resource_reservations
WHEN EXISTS(SELECT 1 FROM bookings WHERE id=NEW.booking_id AND status<>'cancelled' AND service_module='grooming') BEGIN
  SELECT CASE WHEN EXISTS(
    SELECT 1 FROM execution_assignments a JOIN service_executions e ON e.business_id=a.business_id AND e.branch_id=a.branch_id AND e.id=a.execution_id
    WHERE a.business_id=NEW.business_id AND a.branch_id=NEW.branch_id AND a.resource_id=NEW.resource_id AND e.booking_id<>NEW.booking_id
      AND e.status<>'cancelled' AND CAST(strftime('%s',a.start_local) AS INTEGER)/60<NEW.end_minute AND NEW.start_minute<CAST(strftime('%s',a.end_local) AS INTEGER)/60
  ) THEN RAISE(ABORT,'BE3_TIME_CONFLICT') END;
END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_care_staff_insert BEFORE INSERT ON execution_care_tasks WHEN NEW.staff_id IS NOT NULL BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM operation_staff s JOIN operation_staff_branches a ON a.business_id=s.business_id AND a.staff_id=s.id
    WHERE s.business_id=NEW.business_id AND s.id=NEW.staff_id AND a.branch_id=NEW.branch_id
      AND EXISTS(SELECT 1 FROM json_each(s.capabilities_json) WHERE value='hotel-care')) THEN RAISE(ABORT,'BE4_STAFF') END;
END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_care_staff_update BEFORE UPDATE OF staff_id ON execution_care_tasks WHEN NEW.staff_id IS NOT NULL AND NEW.staff_id IS NOT OLD.staff_id BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM operation_staff s JOIN operation_staff_branches a ON a.business_id=s.business_id AND a.staff_id=s.id
    WHERE s.business_id=NEW.business_id AND s.id=NEW.staff_id AND a.branch_id=NEW.branch_id AND s.status='active'
      AND EXISTS(SELECT 1 FROM json_each(s.capabilities_json) WHERE value='hotel-care')) THEN RAISE(ABORT,'BE4_STAFF') END;
END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_record_source BEFORE INSERT ON service_records BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=NEW.business_id AND e.branch_id=NEW.branch_id AND e.id=NEW.execution_id
    AND e.customer_id=NEW.customer_id AND e.pet_id=NEW.pet_id AND (e.status='completed' OR (e.module<>'grooming' AND e.status='checked-out')))
  THEN RAISE(ABORT,'BE4_SCOPE') END;
END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_booking_daycare_occupancy BEFORE INSERT ON booking_resource_reservations
WHEN EXISTS(SELECT 1 FROM bookings WHERE id=NEW.booking_id AND status<>'cancelled' AND service_module='daycare') BEGIN
  SELECT CASE WHEN NEW.units + (
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
  THEN RAISE(ABORT,'BE3_CAPACITY_CONFLICT') END;
END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_execution_identity BEFORE UPDATE OF business_id,branch_id,booking_id,pet_id,module ON service_executions
WHEN NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.booking_id<>OLD.booking_id OR NEW.pet_id<>OLD.pet_id OR NEW.module<>OLD.module
BEGIN SELECT RAISE(ABORT,'BE4_SCOPE'); END;
--> statement-breakpoint
CREATE TRIGGER trg_be4_record_identity BEFORE UPDATE OF business_id,branch_id,execution_id,customer_id,pet_id ON service_records
WHEN NEW.business_id<>OLD.business_id OR NEW.branch_id<>OLD.branch_id OR NEW.execution_id<>OLD.execution_id OR NEW.customer_id<>OLD.customer_id OR NEW.pet_id<>OLD.pet_id
BEGIN SELECT RAISE(ABORT,'BE4_SCOPE'); END;
