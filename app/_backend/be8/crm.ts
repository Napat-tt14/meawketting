import type { Database } from "../be1/repository";
import { be1Error } from "../be1/errors";
import { dateInZone } from "../shared/time";
import { ProjectionSnapshot, type ProjectionScope } from "./snapshot";
import { emptyCrm } from "./projections";
import { normalizeCustomerSearchKey, normalizePhoneKey } from "../be2/validation";
import { customerBase, petView, type CustomerRow } from "../be2/postgresRepository";
import type { BusinessServiceModule, BookingStatus, BookingTimeModel, CrmBooking, CrmPage, CrmView, CustomerCrmProfile, CustomerTimelineItem } from "./contracts";

type Facts = { id: string; visits: number; last_visit: string | null; last_label: string | null; last_branch: string | null; balance: number; conversation_count: number; latest_conversation: string | null; modules: string };
type BookingRow = { id: string; business_id: string; branch_id: string; customer_id: string; customer_name: string; service_id: string; service_label: string; service_module: BusinessServiceModule; time_model: BookingTimeModel; start_local: string; end_local: string | null; status: BookingStatus; estimate: number | null; notes: string; revision: number; created_at: string; updated_at: string; cancelled_at: string | null; pets: string; requirements: string; resources: string };
const labels: Record<BusinessServiceModule, string> = { grooming: "Grooming", hotel: "Hotel", daycare: "Daycare" };

function profile(f: Facts, upcoming: CrmBooking[], scope: ProjectionScope): CustomerCrmProfile {
  const p = emptyCrm(f.id), next = upcoming[0] ?? null, timezone = scope.branches.find((b) => b.id === f.last_branch)?.timezone ?? scope.branches[0].timezone;
  const days = f.last_visit ? Math.max(0, Math.floor((Date.parse(dateInZone(scope.now, timezone)) - Date.parse(dateInZone(f.last_visit, timezone))) / 86400000)) : null;
  const services = JSON.parse(f.modules) as BusinessServiceModule[], inactive = days !== null && days >= 45 && !next;
  Object.assign(p, { lifecycle: inactive ? "inactive" : f.visits >= 2 ? "regular" : next ? "active" : "new", visitCount: f.visits, lastVisitAt: f.last_visit, nextBooking: next, servicesUsed: services, outstandingBalance: f.balance / 100, conversationCount: f.conversation_count, latestConversationAt: f.latest_conversation, returned: f.visits >= 2, daysSinceLastVisit: days });
  if (p.returned) p.signals.push(`กลับมาใช้บริการแล้ว ${p.visitCount} ครั้ง`);
  if (p.lastVisitAt) p.signals.push(`บริการล่าสุดเป็น ${f.last_label ?? services.map((m) => labels[m]).join(" · ")}`);
  if (!next) p.signals.push("ยังไม่มีนัดหมายถัดไป");
  if (inactive) p.signals.push(`ไม่ได้มาใช้บริการ ${days} วัน`);
  if (p.outstandingBalance > 0) p.signals.push("มียอดที่ยังต้องติดตาม");
  if (!p.signals.length) p.signals.push("เริ่มสร้างความสัมพันธ์จากข้อมูลการจองและบริการ");
  if (p.outstandingBalance > 0) p.nextAction = { label: "ตรวจยอดและการชำระ", detail: "มียอดคงเหลือจากบริการของลูกค้ารายนี้", href: "/business/billing", kind: "billing" };
  else if (next) p.nextAction = { label: "เปิดนัดหมายถัดไป", detail: `${next.service.label} · ${next.start.slice(0, 10)}`, href: `/business/calendar?bookingId=${encodeURIComponent(next.bookingId)}`, kind: "prepare" };
  else if (p.visitCount) p.nextAction = { label: "เพิ่มการจองครั้งถัดไป", detail: `บริการที่เคยใช้: ${services.map((m) => labels[m]).join(" · ") || "ยังไม่ระบุ"}`, href: `/business/calendar?customerId=${encodeURIComponent(f.id)}`, kind: "booking" };
  else if (p.conversationCount) p.nextAction = { label: "เปิดบทสนทนาล่าสุด", detail: "ดูข้อความที่เกี่ยวข้องก่อนเริ่มการจอง", href: `/business/inbox?customerId=${encodeURIComponent(f.id)}`, kind: "message" };
  return p;
}

export async function projectCrm(db: Database, scope: ProjectionScope, options: import("./contracts").CrmListOptions & { customerId?: string; before?: { at: string; id: string } }): Promise<CrmPage> {
  const limit = options.customerId ? 1 : options.limit ?? 50;
  const query = normalizeCustomerSearchKey(options.query ?? ""), escape = (value: string) => value.replace(/[\\%_]/g, c => `\\${c}`);
  const activity = `, customer_activity AS (SELECT c.*,
    (SELECT count(DISTINCT booking_id) FROM scoped_records r WHERE r.customer_id=c.id) crm_visits,
    (SELECT completed_at FROM scoped_records r WHERE r.customer_id=c.id ORDER BY completed_at DESC,id DESC LIMIT 1) crm_last_visit,
    (SELECT branch_id FROM scoped_records r WHERE r.customer_id=c.id ORDER BY completed_at DESC,id DESC LIMIT 1) crm_last_branch,
    EXISTS(SELECT 1 FROM scoped_bookings b JOIN allowed a ON a.id=b.branch_id WHERE b.customer_id=c.id AND b.status<>'cancelled' AND substr(b.start_local,1,10)>=a.today
      AND EXISTS(SELECT 1 FROM booking_pets bp WHERE bp.business_id=b.business_id AND bp.branch_id=b.branch_id AND bp.booking_id=b.id AND NOT EXISTS(SELECT 1 FROM scoped_records r WHERE r.branch_id=b.branch_id AND r.booking_id=b.id AND r.pet_id=bp.pet_id))) crm_has_next,
    (SELECT coalesce(jsonb_agg(module), '[]'::jsonb) FROM (SELECT module FROM scoped_records r WHERE r.customer_id=c.id UNION SELECT b.service_module FROM scoped_bookings b JOIN allowed a ON a.id=b.branch_id WHERE b.customer_id=c.id AND b.status<>'cancelled' AND substr(b.start_local,1,10)<=a.today)) crm_modules
    FROM customers c WHERE c.business_id IN (SELECT business_id FROM allowed) AND c.status='active'),
    classified AS (SELECT c.*, CASE WHEN NOT crm_has_next AND
      ((SELECT today FROM allowed WHERE id=crm_last_branch)::date-(crm_last_visit::timestamptz AT TIME ZONE (SELECT timezone FROM allowed WHERE id=crm_last_branch))::date)>=45 THEN 'inactive'
      WHEN crm_visits>=2 THEN 'regular' WHEN crm_has_next THEN 'active' ELSE 'new' END crm_lifecycle FROM customer_activity c)`;
  const segment = options.segment ?? "all";
  const segmentClause = segment === "all" ? "TRUE" : segment === "new" ? "crm_lifecycle IN ('new','active')" : segment === "regular" || segment === "inactive" ? `crm_lifecycle='${segment}'` : segment === "no-next-booking" ? "NOT crm_has_next" : `jsonb_exists(crm_modules,'${segment}')`;
  const search = query ? `AND (c.display_name_key LIKE ? ESCAPE '\\' OR coalesce(c.phone_key,'') LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM customer_pet_relationships r JOIN business_pet_profiles p ON p.business_id=r.business_id AND p.pet_id=r.pet_id WHERE r.business_id=c.business_id AND r.customer_id=c.id AND r.status='active' AND p.status='active' AND p.name_key LIKE ? ESCAPE '\\'))` : "";
  const filtered = `${activity}, matching AS (SELECT c.* FROM classified c WHERE ${segmentClause} ${search})`;
  const filterValues = query ? [`%${escape(query)}%`, normalizePhoneKey(options.query ?? "") ? `%${escape(normalizePhoneKey(options.query ?? "")!)}%` : "__no_phone_match__", `%${escape(query)}%`] : [];
  // Match the existing Thai name ordering without depending on a deployed DB collation.
  const ordered = options.offset === undefined ? null : (await new ProjectionSnapshot(db, scope).read([{ values: filterValues, sql: `${filtered} SELECT id,display_name FROM matching` }]))[0] as { id: string; display_name: string }[] | null;
  ordered?.sort((a, b) => a.display_name.localeCompare(b.display_name, "th") || a.id.localeCompare(b.id));
  const selectedIds = ordered?.slice(options.offset!, options.offset! + limit + 1).map(c => c.id);
  const selected = options.customerId
    ? ", selected_customers AS (SELECT c.* FROM customers c WHERE c.business_id IN (SELECT business_id FROM allowed) AND c.id=? LIMIT 1)"
    : selectedIds ? `, selected_customers AS (SELECT c.* FROM customers c WHERE c.business_id IN (SELECT business_id FROM allowed) AND c.status='active' AND c.id IN (SELECT value FROM jsonb_array_elements_text((?)::text::jsonb)))`
    : `${filtered}, selected_customers AS (SELECT c.* FROM matching c WHERE c.id>? ORDER BY c.id LIMIT ${limit + 1})`;
  const values = options.customerId ? [options.customerId] : selectedIds ? [JSON.stringify(selectedIds)] : [...filterValues, options.afterId ?? ""];
  // Group related financial events into one read-only projection.
  // The same scoped events still form one ordered, paginated timeline.
  const timeline = `, timeline AS (
    SELECT 'booking-'||b.id id,'booking' kind,b.customer_id,b.created_at at,CASE WHEN b.status='cancelled' THEN 'นัดหมายถูกยกเลิก' ELSE 'นัดหมาย' END title,s.label||' · '||b.start_local detail,'/business/calendar?bookingId='||b.id href,b.service_module module
      FROM scoped_bookings b JOIN booking_services s ON s.business_id=b.business_id AND s.branch_id=b.branch_id AND s.id=b.service_id
    UNION ALL SELECT 'service-'||r.id,'service',r.customer_id,r.completed_at,'บริการเสร็จแล้ว',r.summary,'#customer-service-history-title',r.module FROM scoped_records r
    UNION ALL SELECT * FROM (
    SELECT 'charge-'||h.id,'payment',c.customer_id,h.occurred_at,CASE h.kind WHEN 'cancelled' THEN 'ยอดเรียกเก็บถูกยกเลิก' WHEN 'adjusted' THEN 'ปรับยอดเรียกเก็บ' ELSE 'เปิดยอดเรียกเก็บ' END,c.service_label,'/business/billing?chargeId='||c.id,c.module FROM charge_events h JOIN balances c ON c.business_id=h.business_id AND c.branch_id=h.branch_id AND c.id=h.charge_id
    UNION ALL SELECT 'payment-'||p.id,'payment',p.customer_id,p.occurred_at,'บันทึกการชำระแล้ว','รับเงิน '||(p.amount_minor/100)::text||' บาท','/business/billing',NULL FROM scoped_payments p
    UNION ALL SELECT 'refund-'||r.id,'payment',r.customer_id,r.recorded_at,'บันทึกคืนเงินแล้ว','คืนเงิน '||(r.amount_minor/100)::text||' บาท','/business/billing',NULL FROM scoped_refunds r
    )
    UNION ALL SELECT 'message-'||m.id,'message',c.customer_id,m.occurred_at,CASE WHEN m.kind='add-service-request' THEN 'ร้านส่งคำขอบริการเพิ่มเติม' WHEN m.direction='customer' THEN 'ลูกค้าส่งข้อความ' ELSE 'ร้านส่งข้อความ' END,m.body,'/business/inbox?conversation='||c.id,NULL
      FROM messages m JOIN allowed a ON a.business_id=m.business_id AND a.id=m.branch_id JOIN conversations c ON c.business_id=m.business_id AND c.id=m.conversation_id
  )`;
  const results = await new ProjectionSnapshot(db, scope).read([
    { values, sql: `${selected} SELECT c.*,
      (SELECT coalesce(jsonb_agg(label ORDER BY position,tag_key),'[]'::jsonb)::text FROM customer_tags t WHERE t.business_id=c.business_id AND t.customer_id=c.id) customer_tags,
      (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY r.created_at,p.name_key,p.pet_id),'[]'::jsonb)::text FROM customer_pet_relationships r JOIN business_pet_profiles p ON p.business_id=r.business_id AND p.pet_id=r.pet_id WHERE r.business_id=c.business_id AND r.customer_id=c.id AND r.status='active' AND p.status='active') customer_pets,
      (SELECT count(DISTINCT booking_id) FROM scoped_records r WHERE r.customer_id=c.id) visits,
      (SELECT completed_at FROM scoped_records r WHERE r.customer_id=c.id ORDER BY completed_at DESC,id DESC LIMIT 1) last_visit,
      (SELECT branch_id FROM scoped_records r WHERE r.customer_id=c.id ORDER BY completed_at DESC,id DESC LIMIT 1) last_branch,
      (SELECT ((snapshot_json)::jsonb->>'serviceLabel') FROM scoped_records r WHERE r.customer_id=c.id ORDER BY completed_at DESC,id DESC LIMIT 1) last_label,
      coalesce((SELECT sum(total_minor-paid_minor+refunded_minor) FROM balances b WHERE b.customer_id=c.id AND b.cancelled_at IS NULL),0) balance,
      (SELECT count(DISTINCT cc.conversation_id) FROM conversation_contexts cc JOIN allowed a ON a.business_id=cc.business_id AND a.id=cc.branch_id JOIN conversations cv ON cv.business_id=cc.business_id AND cv.id=cc.conversation_id WHERE cv.customer_id=c.id) conversation_count,
      (SELECT max(m.occurred_at) FROM messages m JOIN allowed a ON a.business_id=m.business_id AND a.id=m.branch_id JOIN conversations cv ON cv.business_id=m.business_id AND cv.id=m.conversation_id WHERE cv.customer_id=c.id) latest_conversation,
      (SELECT coalesce(jsonb_agg(module), '[]'::jsonb)::text FROM (SELECT module FROM scoped_records r WHERE r.customer_id=c.id UNION SELECT b.service_module FROM scoped_bookings b JOIN allowed a ON a.id=b.branch_id WHERE b.customer_id=c.id AND b.status<>'cancelled' AND substr(b.start_local,1,10)<=a.today)) modules
      FROM selected_customers c ORDER BY c.id` },
    { values, sql: `${selected}, upcoming AS (
      SELECT b.*,row_number() OVER (PARTITION BY b.customer_id ORDER BY b.start_local,b.id) position FROM scoped_bookings b JOIN allowed a ON a.id=b.branch_id WHERE b.customer_id IN (SELECT id FROM selected_customers) AND b.status<>'cancelled' AND substr(b.start_local,1,10)>=a.today
      AND EXISTS(SELECT 1 FROM booking_pets bp WHERE bp.business_id=b.business_id AND bp.branch_id=b.branch_id AND bp.booking_id=b.id AND NOT EXISTS(SELECT 1 FROM scoped_records r WHERE r.branch_id=b.branch_id AND r.booking_id=b.id AND r.pet_id=bp.pet_id)))
      SELECT b.*,c.display_name customer_name,s.label service_label,
        (SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.pet_id,'name',p.name,'species',p.species)), '[]'::jsonb)::text FROM booking_pets bp JOIN business_pet_profiles p ON p.business_id=bp.business_id AND p.pet_id=bp.pet_id WHERE bp.business_id=b.business_id AND bp.branch_id=b.branch_id AND bp.booking_id=b.id AND NOT EXISTS(SELECT 1 FROM scoped_records r WHERE r.branch_id=b.branch_id AND r.booking_id=b.id AND r.pet_id=bp.pet_id)) pets,
        (SELECT coalesce(jsonb_agg(resource_kind), '[]'::jsonb)::text FROM booking_service_resource_requirements r WHERE r.business_id=b.business_id AND r.branch_id=b.branch_id AND r.service_id=b.service_id) requirements,
        (SELECT coalesce(jsonb_agg(resource_id), '[]'::jsonb)::text FROM booking_resource_assignments r WHERE r.business_id=b.business_id AND r.branch_id=b.branch_id AND r.booking_id=b.id) resources
      FROM upcoming b JOIN customers c ON c.business_id=b.business_id AND c.id=b.customer_id JOIN booking_services s ON s.business_id=b.business_id AND s.branch_id=b.branch_id AND s.id=b.service_id WHERE b.position<=${options.customerId ? 100 : 1} ORDER BY b.start_local,b.id` },
    ...(options.customerId ? [{ values: [...values, options.before?.at ?? "9999", options.before?.at ?? "9999", options.before?.id ?? "~"], sql: `${selected}${timeline} SELECT t.* FROM timeline t WHERE t.customer_id IN (SELECT id FROM selected_customers) AND (t.at<? OR (t.at=? AND t.id<?)) ORDER BY t.at DESC,t.id DESC LIMIT 101` }] : []),
    ...(!options.customerId ? [{ values: filterValues, sql: `${filtered} SELECT (SELECT count(*) FROM matching) total,
      count(*) "all",count(*) FILTER(WHERE crm_lifecycle IN ('new','active')) "new",count(*) FILTER(WHERE crm_lifecycle='regular') regular,
      count(*) FILTER(WHERE NOT crm_has_next) "no-next-booking",count(*) FILTER(WHERE crm_lifecycle='inactive') inactive,
      count(*) FILTER(WHERE jsonb_exists(crm_modules,'grooming')) grooming,count(*) FILTER(WHERE jsonb_exists(crm_modules,'hotel')) hotel,count(*) FILTER(WHERE jsonb_exists(crm_modules,'daycare')) daycare FROM classified` }] : []),
  ]);
  const facts = results[0] as Facts[], bookings = (results[1] as BookingRow[]).map((b): CrmBooking => ({ bookingId: b.id, businessId: b.business_id, branchId: b.branch_id, customer: { id: b.customer_id, name: b.customer_name }, pets: JSON.parse(b.pets), service: { id: b.service_id, label: b.service_label }, serviceModule: b.service_module, timeModel: b.time_model, start: b.start_local, end: b.end_local, requiredResources: JSON.parse(b.requirements), assignedResources: JSON.parse(b.resources), status: b.status, estimate: b.estimate, notes: b.notes, revision: b.revision, createdAt: b.created_at, updatedAt: b.updated_at, cancelledAt: b.cancelled_at }));
  if (selectedIds) facts.sort((a, b) => selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id));
  if (options.customerId && !facts.length) throw be1Error("NOT_FOUND");
  const timelineRows = (results[2] ?? []) as (Omit<CustomerTimelineItem, "serviceModule"> & { module: BusinessServiceModule | null })[];
  const items: CrmView[] = facts.slice(0, limit).map((f) => { const upcoming = bookings.filter((b) => b.customer.id === f.id); return { profile: profile(f, upcoming, scope), upcoming, timeline: timelineRows.slice(0, 100).map((r) => ({ id: r.id, kind: r.kind, at: r.at, title: r.title, detail: r.detail, href: r.href, serviceModule: r.module })), timelineNext: timelineRows.length > 100 ? { at: timelineRows[99].at, id: timelineRows[99].id } : null }; });
  const summary = results[2]?.[0] as ({ total: number } & Record<import("./contracts").CrmSegment, number>) | undefined;
  const customerRows = facts.slice(0, limit) as (Facts & CustomerRow & { customer_tags: string; customer_pets: string })[];
  return { generatedAt: scope.now, items, nextAfterId: facts.length > limit ? facts[limit - 1].id : null, ...(ordered ? { nextOffset: facts.length > limit ? options.offset! + limit : null } : {}),
    ...(!options.customerId ? { customers: customerRows.map(c => ({ ...customerBase(c), tags: JSON.parse(c.customer_tags), pets: JSON.parse(c.customer_pets).map(petView) })), total: summary!.total, segments: summary } : {}) };
}
