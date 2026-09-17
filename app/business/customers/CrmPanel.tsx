"use client";

import { useId, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Chart,
  CheckCircle,
  Clock,
  MessageCircle,
  PawPrint,
  UserRoundCheck,
  Wallet,
} from "../../_components/icons";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import { calendarDateLabel } from "../calendar/calendarPresentation";
import { formatBusinessMoney } from "../billing/billingPresentation";
import {
  CUSTOMER_LIFECYCLE_LABELS,
  type CustomerCrmProfile,
  type CustomerTimelineItem,
  type CustomerTimelineKind,
} from "./crmPresentation";

const TIMELINE_FILTERS: readonly { value: "all" | CustomerTimelineKind; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "booking", label: "นัดหมาย" },
  { value: "service", label: "บริการ" },
  { value: "payment", label: "การชำระ" },
  { value: "message", label: "ข้อความ" },
] as const;

const SERVICE_LABELS = {
  grooming: "อาบน้ำตัดขน",
  hotel: "ฝากค้างคืน",
  daycare: "รับเลี้ยงรายวัน",
} as const;

function crmDateLabel(value: string | null, includeTime = false) {
  if (!value) return "ยังไม่มี";
  const date = calendarDateLabel(value.slice(0, 10), { day: "numeric", month: "short", year: "numeric" });
  const time = value.includes("T") ? value.slice(11, 16) : "";
  return includeTime && time ? `${date} · ${time}` : date;
}

function TimelineIcon({ kind }: { kind: CustomerTimelineKind }) {
  if (kind === "booking") return <CalendarDays size={17} />;
  if (kind === "service") return <CheckCircle size={17} />;
  if (kind === "payment") return <Wallet size={17} />;
  return <MessageCircle size={17} />;
}

export function CustomerCrmOverview({ profiles }: { profiles: readonly CustomerCrmProfile[] }) {
  const regularCount = profiles.filter((profile) => profile.lifecycle === "regular").length;
  const noNextBookingCount = profiles.filter((profile) => !profile.nextBooking).length;
  const inactiveCount = profiles.filter((profile) => profile.lifecycle === "inactive").length;

  return (
    <section className="crm-overview" aria-labelledby="crm-overview-title">
      <div className="crm-overview__copy">
        <span className="crm-overview__icon" aria-hidden="true"><Chart size={20} /></span>
        <div>
          <h2 id="crm-overview-title">ภาพรวมความสัมพันธ์ลูกค้า</h2>
          <p>สรุปจากการจอง บริการ การชำระ และบทสนทนาที่มีอยู่</p>
        </div>
      </div>
      <dl className="crm-overview__metrics">
        <div><dt>ลูกค้าทั้งหมด</dt><dd>{profiles.length}</dd></div>
        <div><dt>กลับมาใช้บริการ</dt><dd>{regularCount}</dd></div>
        <div><dt>ไม่มีนัดถัดไป</dt><dd>{noNextBookingCount}</dd></div>
        <div><dt>ไม่ได้มาสักพัก</dt><dd>{inactiveCount}</dd></div>
      </dl>
    </section>
  );
}

export function CustomerCrmPanel({
  profile,
  timeline,
}: {
  profile: CustomerCrmProfile;
  timeline: readonly CustomerTimelineItem[];
}) {
  const headingId = useId();
  const [timelineFilter, setTimelineFilter] = useState<"all" | CustomerTimelineKind>("all");
  const filteredTimeline = timeline.filter((item) => timelineFilter === "all" || item.kind === timelineFilter);
  const nextBooking = profile.nextBooking;

  return (
    <section className="customer-detail-section customer-crm-panel" aria-labelledby={headingId}>
      <header className="customer-crm-panel__header">
        <div>
          <span className={`crm-lifecycle-badge crm-lifecycle-badge--${profile.lifecycle}`}>
            <UserRoundCheck size={15} />
            {CUSTOMER_LIFECYCLE_LABELS[profile.lifecycle]}
          </span>
          <h2 id={headingId}>สรุปลูกค้า</h2>
        </div>
        <PawPrint size={22} aria-hidden="true" />
      </header>

      <dl className="customer-crm-panel__facts">
        <div>
          <dt><Clock size={16} />มาครั้งล่าสุด</dt>
          <dd>{crmDateLabel(profile.lastVisitAt)}</dd>
        </div>
        <div>
          <dt><CalendarDays size={16} />นัดถัดไป</dt>
          <dd>{nextBooking ? crmDateLabel(nextBooking.start) : "ยังไม่มีนัด"}</dd>
        </div>
        <div>
          <dt><CheckCircle size={16} />จำนวนครั้ง</dt>
          <dd>{profile.visitCount} ครั้ง</dd>
        </div>
        <div>
          <dt><Wallet size={16} />ยอดคงเหลือ</dt>
          <dd>{formatBusinessMoney(profile.outstandingBalance)}</dd>
        </div>
      </dl>

      <div className="customer-crm-panel__services" aria-label="บริการที่ลูกค้าเคยใช้">
        <strong>บริการที่ใช้</strong>
        {profile.servicesUsed.length > 0 ? (
          <ul>
            {profile.servicesUsed.map((serviceModule) => (
              <li key={serviceModule} className={`customer-crm-panel__service customer-crm-panel__service--${serviceModule}`}>
                <BusinessServiceIcon module={serviceModule} size={16} />
                {SERVICE_LABELS[serviceModule]}
              </li>
            ))}
          </ul>
        ) : <span>ยังไม่มีบริการที่เสร็จแล้ว</span>}
      </div>

      <div className="customer-crm-panel__focus">
        <div className={`customer-crm-next-action customer-crm-next-action--${profile.nextAction.kind}`}>
          <span>แนะนำให้ทำต่อ</span>
          <strong>{profile.nextAction.label}</strong>
          <Link href={profile.nextAction.href}>ไปทำรายการ<ArrowUpRight size={16} /></Link>
        </div>
      </div>

      <details className="customer-detail-disclosure">
        <summary>รายละเอียดการใช้บริการ</summary>
        <ul>{profile.signals.map((signal) => <li key={signal}>{signal}</li>)}</ul>
        <p>{profile.nextAction.detail}</p>
      </details>
      <details className="customer-detail-disclosure">
        <summary>กิจกรรมย้อนหลัง <span>{timeline.length} รายการ</span></summary>
      <div className="customer-crm-timeline">
        <header>
          <div>
            <h3>ไทม์ไลน์ลูกค้า</h3>
            <p>นัดหมาย บริการ การชำระ และข้อความของลูกค้า</p>
          </div>
          <div className="customer-crm-timeline__filters" role="toolbar" aria-label="กรองไทม์ไลน์ลูกค้า">
            {TIMELINE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={timelineFilter === filter.value}
                onClick={() => setTimelineFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </header>
        {filteredTimeline.length > 0 ? (
          <ol className="customer-crm-timeline__list">
            {filteredTimeline.slice(0, 12).map((item) => (
              <li key={item.id} className={`customer-crm-timeline__item customer-crm-timeline__item--${item.kind}`}>
                <span className="customer-crm-timeline__marker"><TimelineIcon kind={item.kind} /></span>
                <div>
                  <span className="customer-crm-timeline__meta">
                    <strong>{item.title}</strong>
                    <time dateTime={item.at}>{crmDateLabel(item.at, true)}</time>
                  </span>
                  <p>{item.detail}</p>
                </div>
                <Link href={item.href} aria-label={`เปิด ${item.title}`}><ArrowUpRight size={17} /></Link>
              </li>
            ))}
          </ol>
        ) : <p className="customer-crm-timeline__empty">ยังไม่มีรายการในหมวดนี้</p>}
      </div>

      </details>
    </section>
  );
}
