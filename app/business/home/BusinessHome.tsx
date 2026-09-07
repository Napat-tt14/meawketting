"use client";

import {
  BUSINESS_SERVICE_MODULES,
  BOOKING_DEMO_DATE,
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
  ChevronRight,
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
import { BusinessHomeSpotlight } from "./BusinessHomeSpotlight";
import { formatBusinessMoney } from "../billing/billingPresentation";

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
  const details = getDemoBusinessContextDetails(context, !businessStateReady);
  const demo = getBusinessHomeDemo(context);
  const enabledModules = getEnabledBusinessModules(context, !businessStateReady);
  void revision;
  const allBranchBookings = businessStateReady
    ? listPrototypeBookings(context, { includeCancelled: false })
    : listPrototypeBookingFixtures(context, { includeCancelled: false });
  const branchBookings = allBranchBookings.filter((booking) => enabledModules.includes(booking.serviceModule));
  const unreadMessageCount = getPrototypeInboxUnreadCount(context, !businessStateReady);
  const groomingSummary = getGroomingServiceJobSummary(context, BOOKING_DEMO_DATE, !businessStateReady);
  const groomingEnabled = enabledModules.includes("grooming");
  const hotelEnabled = enabledModules.includes("hotel");
  const hotelSummary = getPrototypeHotelStaySummary(context, BOOKING_DEMO_DATE, !businessStateReady);
  const daycareEnabled = enabledModules.includes("daycare");
  const daycareSummary = summarizePrototypeDaycare(context, BOOKING_DEMO_DATE, !businessStateReady);
  const revenueSummary = getPrototypeRevenueSummary(context, BOOKING_DEMO_DATE, !businessStateReady);
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
  const nextWork = branchBookings.slice(0, 3).map((booking) => ({
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
      <BusinessPageHeader title="หน้าหลัก" context={`${details.business?.name ?? "ร้าน"} · ${details.branch?.name ?? "สาขา"}`} />

      <div className="business-home-hero" data-business-animate>
        <BusinessHomeSpotlight />

        <nav className="business-quick-actions" aria-label="งานด่วน">
          <div className="business-quick-actions__heading">
            <div className="business-quick-actions__title-row">
              <span className="business-quick-actions__live-dot" aria-hidden="true" />
              <strong>งานด่วน</strong>
            </div>
            <small>เริ่มงานที่ใช้บ่อย</small>
          </div>
          <Link className="business-quick-action business-quick-action--primary" href="/business/calendar?new=1">
            <span className="business-quick-action__icon-wrap">
              <Plus size={20} />
            </span>
            <span className="business-quick-action__text">
              <strong>เพิ่มการจอง</strong>
              <small>เริ่มรายการใหม่</small>
            </span>
            <ChevronRight size={18} className="business-quick-action__arrow" aria-hidden="true" />
          </Link>
          <Link className="business-quick-action" href="/business/scan">
            <span className="business-quick-action__icon-wrap">
              <Scan size={20} />
            </span>
            <span className="business-quick-action__text">
              <strong>สแกนรับเข้า</strong>
              <small>ตรวจสิทธิ์ก่อนเปิดข้อมูล</small>
            </span>
            <ChevronRight size={18} className="business-quick-action__arrow" aria-hidden="true" />
          </Link>
          <Link className="business-quick-action" href="/business/customers?focus=search">
            <span className="business-quick-action__icon-wrap">
              <Search size={20} />
            </span>
            <span className="business-quick-action__text">
              <strong>ค้นหาลูกค้า</strong>
              <small>ชื่อ น้อง หรือเบอร์โทร</small>
            </span>
            <ChevronRight size={18} className="business-quick-action__arrow" aria-hidden="true" />
          </Link>
        </nav>
      </div>

      <div className="business-home__layout" data-business-animate>
        <div className="business-home__main">
          <section className="business-home-section business-attention" aria-labelledby="business-attention-title">
            <div className="business-home-section__heading">
              <h2 id="business-attention-title">สิ่งที่ต้องจัดการ</h2>
              <span>{attentionItems.length} รายการ</span>
            </div>
            <ul className="business-attention__list">
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
              {hotelEnabled ? <><div><dt>เข้าพักวันนี้</dt><dd>{hotelSummary.arrivals}</dd></div><div><dt>กลับวันนี้</dt><dd>{hotelSummary.departures}</dd></div></> : null}
              {daycareEnabled ? <><div><dt>Daycare รับเข้าแล้ว</dt><dd>{daycareSummary.checkedIn + daycareSummary.active}</dd></div><div><dt>Daycare พร้อมรับกลับ</dt><dd>{daycareSummary.readyForPickup}</dd></div></> : null}
            </dl>
          </section>

          <section className="business-home-section business-module-summary" aria-labelledby="business-modules-title">
            <div className="business-home-section__heading">
              <h2 id="business-modules-title">งานบริการ</h2>
            </div>
            <ul>
              {enabledModules.map((module) => {
                const summary = module === "grooming" && groomingEnabled
                  ? { value: `${groomingSummary.total} งานวันนี้`, detail: groomingSummary.readyForPickup > 0 ? `พร้อมรับกลับ ${groomingSummary.readyForPickup}` : "ดูสถานะงานจริง" }
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
              <div><dt>Payment วันนี้</dt><dd>{revenueSummary.paymentCountToday} รายการ</dd></div>
              <div><dt>ยอดค้างชำระ</dt><dd>{formatBusinessMoney(revenueSummary.unpaidBalance)}</dd></div>
            </dl>
          </section>

        </aside>
      </div>

    </div>
  );
}
