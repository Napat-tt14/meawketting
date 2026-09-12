"use client";

import { businessToday } from "../../_backend/shared/businessClock";
import { useEffect } from "react";
import { ensureDurableReport } from "../../_backend/be8/client";

import {
  BUSINESS_SERVICE_MODULES,
  getBusinessHomeDemo,
  getDemoBusinessContextDetails,
  getEnabledBusinessModules,
  getGroomingServiceJobSummary,
  getPrototypeHotelStaySummary,
  summarizePrototypeDaycare,
  getPrototypeRevenueSummary,
  listPrototypeBookingFixtures,
  listPrototypeBookings,
  resolvePrototypeBookingRelationship,
} from "../../_prototype/businessState";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { getPrototypeInboxUnreadCount } from "../../_prototype/inboxState";
import {
  CheckCircle,
  Clock,
  MessageCircle,
  Plus,
  Scan,
  Search,
  Wallet,
} from "../../_components/icons";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import { useBusinessContext, useBusinessStateReady } from "../_components/useBusinessContext";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { DashboardOverview } from "./DashboardOverview";
import { BusinessHomeSpotlight } from "./BusinessHomeSpotlight";
import { formatBusinessMoney } from "../billing/billingPresentation";

function bookingIsOnDemoDay(booking: ReturnType<typeof listPrototypeBookings>[number]) {
  if (booking.timeModel === "date-range") return booking.start <= businessToday(booking) && (booking.end ? businessToday(booking) < booking.end : false);
  return booking.start.slice(0, 10) === businessToday(booking);
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
  const { context, revision, isContextReady } = useBusinessContext();
  const { businessId, branchId } = context;
  useEffect(() => {
    if (!isContextReady) return;
    const load = () => ensureDurableReport({ businessId, branchId }).catch(() => undefined);
    void load(); const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [businessId, branchId, isContextReady]);
  const businessStateReady = useBusinessStateReady();
  const details = getDemoBusinessContextDetails(context, !businessStateReady);
  const demo = getBusinessHomeDemo(context);
  const enabledModules = getEnabledBusinessModules(context, !businessStateReady);
  void revision;
  const allBranchBookings = businessStateReady
    ? listPrototypeBookings(context, { includeCancelled: false })
    : listPrototypeBookingFixtures(context, { includeCancelled: false });
  const branchBookings = allBranchBookings.filter((booking) => enabledModules.includes(booking.serviceModule));
  const unreadMessageCount = getPrototypeInboxUnreadCount(context, !businessStateReady);
  const groomingSummary = getGroomingServiceJobSummary(context, businessToday(context), !businessStateReady);
  const groomingEnabled = enabledModules.includes("grooming");
  const hotelEnabled = enabledModules.includes("hotel");
  const hotelSummary = getPrototypeHotelStaySummary(context, businessToday(context), !businessStateReady);
  const daycareEnabled = enabledModules.includes("daycare");
  const daycareSummary = summarizePrototypeDaycare(context, businessToday(context), !businessStateReady);
  const revenueSummary = getPrototypeRevenueSummary(context, businessToday(context), !businessStateReady);
  const attentionItems = [
    ...demo.attention.filter((item) => !(groomingEnabled && item.id === "pickup")),
    ...(groomingEnabled && groomingSummary.readyForPickup > 0 ? [{
      id: "grooming-pickup",
      tone: "ready" as const,
      title: `มีน้องพร้อมรับกลับ ${groomingSummary.readyForPickup} ตัว`,
      detail: "เปิดงานอาบน้ำ / ตัดขนเพื่อตรวจสถานะก่อนส่งมอบ",
    }] : []),
    ...(hotelEnabled && hotelSummary.attention > 0 ? [{
      id: "hotel-attention",
      tone: "waiting" as const,
      title: `โรงแรมมีงานต้องจัดการ ${hotelSummary.attention} รายการ`,
      detail: hotelSummary.unassignedArrivals > 0
        ? `มีน้องเข้าพักวันนี้ ${hotelSummary.unassignedArrivals} ตัวที่ยังไม่ระบุห้อง`
        : `งานดูแลค้าง ${hotelSummary.careDue} งาน · ออกวันนี้ ${hotelSummary.departures} ตัว`,
    }] : []),
    ...(daycareEnabled && (daycareSummary.booked > 0 || daycareSummary.readyForPickup > 0) ? [{
      id: "daycare-attention",
      tone: daycareSummary.readyForPickup > 0 ? "ready" as const : "waiting" as const,
      title: daycareSummary.readyForPickup > 0 ? `Daycare พร้อมรับกลับ ${daycareSummary.readyForPickup} ตัว` : `Daycare รอรับเข้า ${daycareSummary.booked} ตัว`,
      detail: `${daycareSummary.occupied}/${daycareSummary.capacity} ที่กำลังใช้งาน · บันทึกการดูแล ${daycareSummary.careEvents} รายการ`,
    }] : []),
    ...(unreadMessageCount > 0 ? [{
      id: "messages",
      tone: "info" as const,
      title: `มีข้อความใหม่ ${unreadMessageCount} รายการ`,
      detail: "เปิดดูบทสนทนาและบริบทการจอง",
    }] : []),
  ];
  const nextWork = branchBookings.filter(bookingIsOnDemoDay).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5).map((booking) => ({
    id: booking.id,
    time: bookingWorkLabel(booking),
    petName: bookingPetName(booking),
    task: booking.service.label,
    module: booking.serviceModule,
  }));
  const todaySummary = {
    waitingIntake: demo.today.waitingIntake,
    bookingsToday: branchBookings.filter(bookingIsOnDemoDay).length,
    readyForPickup: (groomingEnabled ? groomingSummary.readyForPickup : demo.today.readyForPickup ?? 0)
      + (hotelEnabled ? hotelSummary.readyForPickup : 0)
      + (daycareEnabled ? daycareSummary.readyForPickup : 0),
    newMessages: unreadMessageCount,
  };
  return (
    <div className="business-home shell" key={context.key}>
      <BusinessPageHeader title="ภาพรวมวันนี้" context={`${details.business?.name ?? "ร้าน"} · ${details.branch?.name ?? "สาขา"}`} />

      <DashboardOverview today={businessToday(context)} bookings={branchBookings} summary={todaySummary} />
      <nav className="dashboard-actions" aria-label="งานด่วน">
        <Link className="dashboard-actions__primary" href="/business/calendar?new=1"><Plus size={18} />เพิ่มการจอง</Link>
        <Link href="/business/scan"><Scan size={18} />สแกนรับเข้า</Link>
        <Link href="/business/customers?focus=search"><Search size={18} />ค้นหาลูกค้า</Link>
      </nav>
      <BusinessHomeSpotlight />
      <div className="business-home__layout" data-business-animate>
        <div className="business-home__main">
          <section className="business-home-section business-attention" aria-labelledby="business-attention-title">
            <div className="business-home-section__heading">
              <h2 id="business-attention-title">สิ่งที่ต้องจัดการ</h2>
              <span>{attentionItems.length} รายการ</span>
            </div>
            <ul className="business-attention__list">
              {attentionItems.length === 0 ? <li className="dashboard-empty">ไม่มีรายการที่ต้องจัดการในขณะนี้</li> : null}
              {attentionItems.map((item) => (
                <li key={item.id} className={`business-attention__item business-attention__item--${item.tone}`}>
                  {item.id === "messages" || item.id === "hotel-attention" || item.id === "daycare-attention" ? (
                    <a href={item.id === "messages" ? "/business/inbox" : item.id === "daycare-attention" ? "/business/daycare?filter=attention" : "/business/hotel?filter=attention"}>
                      <span className="business-attention__cue">{item.id === "messages" ? <MessageCircle size={20} /> : <BusinessServiceIcon module={item.id === "daycare-attention" ? "daycare" : "hotel"} size={20} />}</span>
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
              <h2 id="business-next-title">ตารางงานวันนี้</h2>
            </div>
            <ol className="business-next-work__list">
              {nextWork.length === 0 ? <li className="dashboard-empty">ยังไม่มีการจองสำหรับวันนี้</li> : null}
              {nextWork.map((item) => {
                return (
                  <li key={item.id}>
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
          <section className="business-home-section business-module-summary" aria-labelledby="business-modules-title">
            <div className="business-home-section__heading">
              <h2 id="business-modules-title">งานบริการ</h2>
            </div>
            <ul>
              {enabledModules.map((module) => {
                const summary = module === "grooming" && groomingEnabled
                  ? { value: `${groomingSummary.total} งานวันนี้`, detail: groomingSummary.readyForPickup > 0 ? `พร้อมรับกลับ ${groomingSummary.readyForPickup}` : "ยังไม่มีงานพร้อมรับกลับ" }
                  : module === "hotel" && hotelEnabled
                    ? {
                      value: `${hotelSummary.occupied} / ${hotelSummary.capacity} ตัวกำลังพัก`,
                      detail: `ว่าง ${hotelSummary.available} · จองไว้ ${hotelSummary.reserved} · ต้องดู ${hotelSummary.attention}`,
                    }
                  : module === "daycare" && daycareEnabled
                    ? {
                      value: `${daycareSummary.occupied} / ${daycareSummary.capacity} ตัวกำลังดูแล`,
                      detail: `ว่าง ${daycareSummary.available} · รอรับเข้า ${daycareSummary.booked} · พร้อมรับกลับ ${daycareSummary.readyForPickup}`,
                    }
                  : demo.moduleSummaries[module];
                if (!summary) return null;
                return (
                  <li key={module}>
                    <BusinessServiceIcon module={module} size={20} />
                    <div><strong>{BUSINESS_SERVICE_MODULES[module].label}</strong><b>{summary.value}</b><small>{summary.detail}</small></div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="business-home-section business-home-revenue" aria-labelledby="business-home-revenue-title">
            <div className="business-home-section__heading">
              <h2 id="business-home-revenue-title">รายรับวันนี้</h2>
              <Link href="/business/billing">เปิดการเงิน</Link>
            </div>
            <dl>
              <div><dt><Wallet size={16} />รับชำระแล้ว</dt><dd>{formatBusinessMoney(revenueSummary.revenueToday)}</dd></div>
              <div><dt>รับชำระวันนี้</dt><dd>{revenueSummary.paymentCountToday} รายการ</dd></div>
              <div><dt>ยอดค้างชำระสะสม</dt><dd>{formatBusinessMoney(revenueSummary.unpaidBalance)}</dd></div>
            </dl>
          </section>

        </aside>
      </div>

    </div>
  );
}
