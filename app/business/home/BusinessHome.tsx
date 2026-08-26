"use client";

import {
  BUSINESS_SERVICE_MODULES,
  BOOKING_DEMO_DATE,
  getBusinessHomeDemo,
  getDemoBusinessContextDetails,
  getEnabledBusinessModules,
  listPrototypeBookingFixtures,
  listPrototypeBookings,
  resolvePrototypeBookingRelationship,
} from "../../_prototype/businessState";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { getPrototypeInboxUnreadCount } from "../../_prototype/inboxState";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  MessageCircle,
  Plus,
  Scan,
  Search,
  ShieldCheck,
} from "../../_components/icons";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import { useBusinessContext, useBusinessStateReady } from "../_components/useBusinessContext";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { BusinessHomeSpotlight } from "./BusinessHomeSpotlight";

const todayItems = [
  { key: "waitingIntake", label: "รอรับเข้า" },
  { key: "bookingsToday", label: "การจองวันนี้" },
  { key: "readyForPickup", label: "พร้อมรับกลับ" },
  { key: "newMessages", label: "ข้อความใหม่" },
] as const;

function bookingIsOnDemoDay(booking: ReturnType<typeof listPrototypeBookings>[number]) {
  if (booking.timeModel === "date-range") return booking.start <= BOOKING_DEMO_DATE && (booking.end ? BOOKING_DEMO_DATE < booking.end : false);
  return booking.start.slice(0, 10) === BOOKING_DEMO_DATE;
}

function bookingWorkLabel(booking: ReturnType<typeof listPrototypeBookings>[number]) {
  if (booking.timeModel === "appointment") return booking.start.slice(11, 16);
  return booking.timeModel === "day" ? "เต็มวัน" : "ทั้งวัน";
}

function bookingPetName(booking: ReturnType<typeof listPrototypeBookings>[number]) {
  const relationship = resolvePrototypeBookingRelationship(booking);
  if (relationship.pets.length <= 1) return relationship.pets[0]?.name ?? "น้อง";
  return `${relationship.pets[0]?.name ?? "น้อง"} +${relationship.pets.length - 1}`;
}

export function BusinessHome() {
  const { context, revision } = useBusinessContext();
  const businessStateReady = useBusinessStateReady();
  const details = getDemoBusinessContextDetails(context);
  const demo = getBusinessHomeDemo(context);
  const enabledModules = getEnabledBusinessModules(context);
  void revision;
  const branchBookings = businessStateReady
    ? listPrototypeBookings(context, { includeCancelled: false })
    : listPrototypeBookingFixtures(context, { includeCancelled: false });
  const unreadMessageCount = getPrototypeInboxUnreadCount(context, !businessStateReady);
  const attentionItems = [
    ...demo.attention,
    ...(unreadMessageCount > 0 ? [{
      id: "messages",
      tone: "info" as const,
      title: `มีข้อความใหม่ ${unreadMessageCount} รายการ`,
      detail: "เปิดดูบทสนทนาและบริบทการจอง",
    }] : []),
  ];
  const nextWork = branchBookings.slice(0, 3).map((booking) => ({
    time: bookingWorkLabel(booking),
    petName: bookingPetName(booking),
    task: booking.service.label,
    module: booking.serviceModule,
  }));
  const todaySummary = {
    waitingIntake: demo.today.waitingIntake,
    bookingsToday: branchBookings.filter(bookingIsOnDemoDay).length,
    readyForPickup: demo.today.readyForPickup,
    newMessages: unreadMessageCount,
  };
  const revenue = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(demo.revenueToday);
  return (
    <div className="business-home shell" key={context.key}>
      <BusinessPageHeader title="หน้าหลัก" context={`${details.business?.name ?? "ร้าน"} · ${details.branch?.name ?? "สาขา"}`} />

      <div className="business-home-hero">
        <BusinessHomeSpotlight />

        <nav className="business-quick-actions" aria-label="งานด่วน">
          <div className="business-quick-actions__heading"><strong>งานด่วน</strong><small>เริ่มงานที่ใช้บ่อย</small></div>
          <Link className="business-quick-action business-quick-action--primary" href="/business/calendar?new=1"><Plus size={20} /><span><strong>เพิ่มการจอง</strong><small>เริ่มรายการใหม่</small></span></Link>
          <Link className="business-quick-action" href="/business/scan"><Scan size={20} /><span><strong>สแกนรับเข้า</strong><small>ตรวจสิทธิ์ก่อนเปิดข้อมูล</small></span></Link>
          <Link className="business-quick-action" href="/business/customers?focus=search"><Search size={20} /><span><strong>ค้นหาลูกค้า</strong><small>ชื่อ น้อง หรือเบอร์โทร</small></span></Link>
        </nav>
      </div>

      <div className="business-home__layout">
        <div className="business-home__main">
          <section className="business-home-section business-attention" aria-labelledby="business-attention-title">
            <div className="business-home-section__heading">
              <h2 id="business-attention-title">สิ่งที่ต้องจัดการ</h2>
              <span>{attentionItems.length} รายการ</span>
            </div>
            <ul className="business-attention__list">
              {attentionItems.map((item) => (
                <li key={item.id} className={`business-attention__item business-attention__item--${item.tone}`}>
                  {item.id === "messages" ? (
                    <a href="/business/inbox">
                      <span className="business-attention__cue"><MessageCircle size={20} /></span>
                      <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                    </a>
                  ) : (
                    <>
                      <span className="business-attention__cue">
                        {item.tone === "waiting" ? <Clock size={20} /> : <CheckCircle size={20} />}
                      </span>
                      <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="business-home-section business-next-work" aria-labelledby="business-next-title">
            <div className="business-home-section__heading">
              <h2 id="business-next-title">งานถัดไป</h2>
            </div>
            <ol className="business-next-work__list">
              {nextWork.map((item) => {
                return (
                  <li key={`${item.time}-${item.petName}`}>
                    <time>{item.time}</time>
                    <span className="business-next-work__line" aria-hidden="true" />
                    <BusinessServiceIcon module={item.module} size={19} className="business-next-work__icon" />
                    <span className="business-next-work__copy"><strong>{item.petName}</strong><small>{item.task}</small></span>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="business-home__summary" aria-label="สรุปวันนี้และงานบริการ">
          <section className="business-home-section business-today" aria-labelledby="business-today-title">
            <div className="business-home-section__heading">
              <h2 id="business-today-title">วันนี้</h2>
            </div>
            <dl>
              {todayItems.map((item) => (
                <div key={item.key}><dt>{item.label}</dt><dd>{todaySummary[item.key]}</dd></div>
              ))}
            </dl>
          </section>

          <section className="business-home-section business-module-summary" aria-labelledby="business-modules-title">
            <div className="business-home-section__heading">
              <h2 id="business-modules-title">งานบริการ</h2>
            </div>
            <ul>
              {enabledModules.map((module) => {
                const summary = demo.moduleSummaries[module];
                if (!summary) return null;
                return (
                  <li key={module}>
                    <BusinessServiceIcon module={module} size={20} />
                    <div><strong>{BUSINESS_SERVICE_MODULES[module].label}</strong><b>{summary.value}</b></div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="business-home-section business-revenue" aria-labelledby="business-revenue-title">
            <span><ShieldCheck size={20} /></span>
            <div><p id="business-revenue-title">รายรับวันนี้</p><strong>{revenue}</strong><small>ยังไม่เชื่อมระบบการเงินจริง</small></div>
            <CalendarDays size={18} />
          </section>
        </aside>
      </div>

    </div>
  );
}
