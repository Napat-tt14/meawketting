-- SYNTHETIC TEST DATA ONLY; not a production migration.
-- Server-side upgrade of canonical BE3 plans. Booking never implies completion.
-- Browser execution state is not imported. Each source tuple is inserted once.
INSERT INTO service_executions(id,business_id,branch_id,booking_id,customer_id,pet_id,module,status,
  scheduled_start,scheduled_end,business_note,details_json,revision,write_token,created_at,updated_at)
SELECT 'execution_'||replace(gen_random_uuid()::text,'-',''),b.business_id,b.branch_id,b.id,b.customer_id,p.pet_id,b.service_module,'booked',
  b.start_local,b.end_local,CASE WHEN b.service_module='daycare' THEN b.notes ELSE '' END,
  jsonb_build_object('serviceId',b.service_id,'serviceLabel',s.label,
    'actualStartedAt',NULL,'actualCompletedAt',NULL,'actualCheckInAt',NULL,'actualCheckOutAt',NULL,'guardianCareInstruction',NULL,
    'dropOffWindow','08:00–10:00','pickupWindow','16:00–18:00','checkedInAt',NULL,'activatedAt',NULL,'readyForPickupAt',NULL,'checkedOutAt',NULL,'completedAt',NULL),
  1,'be4-booking-upgrade',b.created_at,b.updated_at
FROM bookings b JOIN booking_pets p ON p.business_id=b.business_id AND p.branch_id=b.branch_id AND p.booking_id=b.id
JOIN booking_services s ON s.business_id=b.business_id AND s.branch_id=b.branch_id AND s.id=b.service_id
WHERE b.status<>'cancelled' AND NOT EXISTS(SELECT 1 FROM service_executions e WHERE e.business_id=b.business_id AND e.booking_id=b.id AND e.pet_id=p.pet_id AND e.module=b.service_module);
--> statement-breakpoint
INSERT INTO execution_events(id,business_id,branch_id,execution_id,kind,summary,data_json,occurred_at)
SELECT 'event_'||replace(gen_random_uuid()::text,'-',''),e.business_id,e.branch_id,e.id,'history:created','สร้างงานจากการจองเดิม','{}',e.created_at
FROM service_executions e WHERE e.write_token='be4-booking-upgrade'
  AND NOT EXISTS(SELECT 1 FROM execution_events v WHERE v.business_id=e.business_id AND v.branch_id=e.branch_id AND v.execution_id=e.id);
--> statement-breakpoint
INSERT INTO execution_assignments(id,business_id,branch_id,execution_id,resource_id,start_local,end_local,assigned_at)
SELECT 'assignment_'||replace(gen_random_uuid()::text,'-',''),e.business_id,e.branch_id,e.id,a.resource_id,e.scheduled_start,
  coalesce(e.scheduled_end,((e.scheduled_start)::date+1)::text),e.created_at
FROM service_executions e JOIN booking_resource_assignments a ON a.business_id=e.business_id AND a.branch_id=e.branch_id AND a.booking_id=e.booking_id
JOIN booking_resources r ON r.business_id=a.business_id AND r.branch_id=a.branch_id AND r.id=a.resource_id AND r.status='active'
WHERE e.write_token='be4-booking-upgrade' AND e.module IN ('grooming','daycare')
  AND NOT EXISTS(SELECT 1 FROM execution_assignments x WHERE x.business_id=e.business_id AND x.branch_id=e.branch_id AND x.execution_id=e.id AND x.resource_id=a.resource_id);
--> statement-breakpoint
-- Preserve inactive planning references in Booking and immutable execution history.
-- They cannot become active execution assignments until staff reassign a valid Resource.
INSERT INTO execution_events(id,business_id,branch_id,execution_id,kind,summary,data_json,occurred_at)
SELECT 'unavailable_'||e.id||'_'||a.resource_id,e.business_id,e.branch_id,e.id,'history:assignment',
  'ทรัพยากรจากการจองเดิมไม่พร้อมใช้งาน กรุณาจัดสรรใหม่',jsonb_build_object('resourceId',a.resource_id,'reason','inactive-at-upgrade'),e.updated_at
FROM service_executions e JOIN booking_resource_assignments a ON a.business_id=e.business_id AND a.branch_id=e.branch_id AND a.booking_id=e.booking_id
JOIN booking_resources r ON r.business_id=a.business_id AND r.branch_id=a.branch_id AND r.id=a.resource_id AND r.status='inactive'
WHERE e.write_token='be4-booking-upgrade' AND e.module IN ('grooming','daycare')
  AND NOT EXISTS(SELECT 1 FROM execution_events v WHERE v.id='unavailable_'||e.id||'_'||a.resource_id);
