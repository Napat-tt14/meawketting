-- DEV/TEST ONLY. Deterministic operational staff and Hotel spaces; no login or Passport authority.
INSERT INTO operation_staff(id,business_id,name,avatar_seed,display_role,capabilities_json,status,revision,created_at,updated_at) VALUES('team-pim','business-whisker-rest','พิมพ์ชนก','pim','staff','["grooming"]','active',1,'2026-08-17T03:00:00.000Z','2026-08-17T03:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_branches(business_id,branch_id,staff_id) VALUES('business-whisker-rest','whisker-ari','team-pim') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note) VALUES('team-pim-working','business-whisker-rest','team-pim','working','2026-08-18T08:00','2026-08-18T18:00',NULL) ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note) VALUES('team-pim-break','business-whisker-rest','team-pim','break','2026-08-18T12:00','2026-08-18T13:00','พักกลางวัน') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff(id,business_id,name,avatar_seed,display_role,capabilities_json,status,revision,created_at,updated_at) VALUES('team-joy','business-whisker-rest','จอย','joy','staff','["grooming"]','inactive',1,'2026-08-17T03:00:00.000Z','2026-08-17T03:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_branches(business_id,branch_id,staff_id) VALUES('business-whisker-rest','whisker-ari','team-joy') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note) VALUES('team-joy-working','business-whisker-rest','team-joy','working','2026-08-18T08:00','2026-08-18T18:00','หยุดใช้งานใน prototype') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff(id,business_id,name,avatar_seed,display_role,capabilities_json,status,revision,created_at,updated_at) VALUES('team-nok','business-whisker-rest','นก','nok','staff','["grooming"]','active',1,'2026-08-17T03:00:00.000Z','2026-08-17T03:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_branches(business_id,branch_id,staff_id) VALUES('business-whisker-rest','whisker-thonglor','team-nok') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note) VALUES('team-nok-working','business-whisker-rest','team-nok','working','2026-08-18T08:00','2026-08-18T17:00',NULL) ON CONFLICT DO NOTHING;
INSERT INTO operation_staff(id,business_id,name,avatar_seed,display_role,capabilities_json,status,revision,created_at,updated_at) VALUES('team-nam','business-whisker-rest','น้ำ','nam','manager','["front-desk","hotel-care"]','active',1,'2026-08-17T03:00:00.000Z','2026-08-17T03:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_branches(business_id,branch_id,staff_id) VALUES('business-whisker-rest','whisker-ari','team-nam') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_branches(business_id,branch_id,staff_id) VALUES('business-whisker-rest','whisker-thonglor','team-nam') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note) VALUES('team-nam-working','business-whisker-rest','team-nam','working','2026-08-18T08:00','2026-08-18T18:00',NULL) ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note) VALUES('team-nam-time-off','business-whisker-rest','team-nam','time-off','2026-08-18T15:00','2026-08-18T18:00','ออกก่อนเวลา') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff(id,business_id,name,avatar_seed,display_role,capabilities_json,status,revision,created_at,updated_at) VALUES('team-aom','business-whisker-rest','อ้อม','aom','staff','["hotel-care","front-desk"]','active',1,'2026-08-17T03:00:00.000Z','2026-08-17T03:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_branches(business_id,branch_id,staff_id) VALUES('business-whisker-rest','whisker-ari','team-aom') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note) VALUES('team-aom-working','business-whisker-rest','team-aom','working','2026-08-18T08:00','2026-08-18T18:00',NULL) ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note) VALUES('team-aom-break','business-whisker-rest','team-aom','break','2026-08-18T12:00','2026-08-18T12:30','พัก') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff(id,business_id,name,avatar_seed,display_role,capabilities_json,status,revision,created_at,updated_at) VALUES('team-mint','business-paw-partner','มิ้นท์','mint','staff','["daycare","hotel-care","front-desk"]','active',1,'2026-08-17T03:00:00.000Z','2026-08-17T03:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_branches(business_id,branch_id,staff_id) VALUES('business-paw-partner','partner-onnut','team-mint') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note) VALUES('team-mint-working','business-paw-partner','team-mint','working','2026-08-18T08:00','2026-08-18T18:00',NULL) ON CONFLICT DO NOTHING;
INSERT INTO operation_staff(id,business_id,name,avatar_seed,display_role,capabilities_json,status,revision,created_at,updated_at) VALUES('team-fern','business-paw-partner','เฟิร์น','fern','owner','["front-desk","hotel-care"]','active',1,'2026-08-17T03:00:00.000Z','2026-08-17T03:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_branches(business_id,branch_id,staff_id) VALUES('business-paw-partner','partner-onnut','team-fern') ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note) VALUES('team-fern-working','business-paw-partner','team-fern','working','2026-08-18T08:00','2026-08-18T18:00',NULL) ON CONFLICT DO NOTHING;
INSERT INTO operation_staff_windows(id,business_id,staff_id,state,start_local,end_local,note) VALUES('team-fern-unavailable','business-paw-partner','team-fern','unavailable','2026-08-18T08:00','2026-08-18T18:00','ไม่พร้อมรับงานวันนี้') ON CONFLICT DO NOTHING;
INSERT INTO hotel_spaces(id,business_id,branch_id,service_id,label,kind,capacity,status) VALUES('ari-hotel-room-a01','business-whisker-rest','whisker-ari','ari-hotel-stay','ห้อง A01','room',1,'active') ON CONFLICT DO NOTHING;
INSERT INTO hotel_spaces(id,business_id,branch_id,service_id,label,kind,capacity,status) VALUES('ari-hotel-room-a02','business-whisker-rest','whisker-ari','ari-hotel-stay','ห้อง A02','room',1,'active') ON CONFLICT DO NOTHING;
INSERT INTO hotel_spaces(id,business_id,branch_id,service_id,label,kind,capacity,status) VALUES('ari-hotel-room-b03','business-whisker-rest','whisker-ari','ari-hotel-stay','ห้อง B03','room',1,'active') ON CONFLICT DO NOTHING;
INSERT INTO hotel_spaces(id,business_id,branch_id,service_id,label,kind,capacity,status) VALUES('ari-hotel-zone-quiet','business-whisker-rest','whisker-ari','ari-hotel-stay','โซนสงบ C01','zone',1,'active') ON CONFLICT DO NOTHING;
INSERT INTO hotel_spaces(id,business_id,branch_id,service_id,label,kind,capacity,status) VALUES('onnut-hotel-room-r01','business-paw-partner','partner-onnut','onnut-hotel-stay','ห้อง R01','room',1,'active') ON CONFLICT DO NOTHING;
INSERT INTO hotel_spaces(id,business_id,branch_id,service_id,label,kind,capacity,status) VALUES('onnut-hotel-zone-quiet','business-paw-partner','partner-onnut','onnut-hotel-stay','โซนสงบ R02','zone',1,'active') ON CONFLICT DO NOTHING;
DELETE FROM booking_resource_availability_windows WHERE resource_id IN (SELECT id FROM booking_resources WHERE compatibility_staff_id IS NOT NULL);
-- Server-side upgrade of canonical BE3 plans. Booking never implies completion.
-- Browser execution state is not imported. Each source tuple is inserted once.
INSERT INTO service_executions(id,business_id,branch_id,booking_id,customer_id,pet_id,module,status,
  scheduled_start,scheduled_end,business_note,details_json,revision,write_token,created_at,updated_at)
SELECT 'execution-seed-'||b.id||'-'||p.pet_id,b.business_id,b.branch_id,b.id,b.customer_id,p.pet_id,b.service_module,'booked',
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
SELECT 'event-seed-'||e.id,e.business_id,e.branch_id,e.id,'history:created','สร้างงานจากการจองเดิม','{}',e.created_at
FROM service_executions e WHERE e.write_token='be4-booking-upgrade'
  AND NOT EXISTS(SELECT 1 FROM execution_events v WHERE v.business_id=e.business_id AND v.branch_id=e.branch_id AND v.execution_id=e.id);
--> statement-breakpoint
INSERT INTO execution_assignments(id,business_id,branch_id,execution_id,resource_id,start_local,end_local,assigned_at)
SELECT 'assignment-seed-'||e.id||'-'||a.resource_id,e.business_id,e.branch_id,e.id,a.resource_id,e.scheduled_start,
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

