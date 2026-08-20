"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { BusinessServiceModule } from "../../_prototype/businessState";
import {
  BUSINESS_SERVICE_MODULES,
  BOOKING_DEMO_DATE,
  getBusinessHomeDemo,
  getDemoBusinessContextDetails,
  getEnabledBusinessModules,
  listPrototypeBookingFixtures,
  listPrototypeBookings,
} from "../../_prototype/businessState";
import {
  ArrowRight,
  BedDouble,
  CheckCircle,
  Clock,
  Info,
  MessageCircle,
  PawPrint,
  Scan,
  Scissors,
  ShieldCheck,
} from "../../_components/icons";
import { useBusinessContext } from "../_components/useBusinessContext";

const moduleIcons = {
  grooming: Scissors,
  hotel: BedDouble,
  daycare: PawPrint,
} satisfies Record<BusinessServiceModule, typeof PawPrint>;

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
  if (booking.pets.length <= 1) return booking.pets[0]?.name ?? "น้องตัวอย่าง";
  return `${booking.pets[0]?.name ?? "น้อง"} +${booking.pets.length - 1}`;
}

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function BusinessHome() {
  const { context, revision } = useBusinessContext();
  const bookingStateReady = useIsClient();
  const details = getDemoBusinessContextDetails(context);
  const demo = getBusinessHomeDemo(context);
  const enabledModules = getEnabledBusinessModules(context);
  void revision;
  const branchBookings = bookingStateReady
    ? listPrototypeBookings(context, { includeCancelled: false })
    : listPrototypeBookingFixtures(context, { includeCancelled: false });
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
    newMessages: demo.today.newMessages,
  };
  const revenue = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(demo.revenueToday);

  return (
    <div className="business-home shell" key={context.key}>
      <header className="business-home__heading">
        <div>
          <span className="business-demo-label"><Info size={16} /> ข้อมูลตัวอย่าง</span>
          <p>สวัสดี</p>
          <h1>{details.business?.name ?? "ร้านตัวอย่าง"}</h1>
          <strong>{details.branch?.name ?? "สาขาตัวอย่าง"}</strong>
        </div>
        <Link className="button button--business business-home__scan" href="/business/scan">
          <Scan size={19} weight="bold" />
          สแกนรับเข้า
        </Link>
      </header>

      <div className="business-home__layout">
        <div className="business-home__main">
          <section className="business-home-section business-attention" aria-labelledby="business-attention-title">
            <div className="business-home-section__heading">
              <div>
                <p className="business-section-kicker">ต้องดูก่อน</p>
                <h2 id="business-attention-title">สิ่งที่ต้องจัดการ</h2>
              </div>
              <span>{demo.attention.length} รายการ</span>
            </div>
            <ul className="business-attention__list">
              {demo.attention.map((item) => (
                <li key={item.id} className={`business-attention__item business-attention__item--${item.tone}`}>
                  <span className="business-attention__cue">
                    {item.tone === "waiting" ? <Clock size={20} /> : item.tone === "ready" ? <CheckCircle size={20} /> : <MessageCircle size={20} />}
                  </span>
                  <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                  <span className="business-planned-tag">Demo</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="business-home-section business-next-work" aria-labelledby="business-next-title">
            <div className="business-home-section__heading">
              <div>
                <p className="business-section-kicker">ตามลำดับเวลา</p>
                <h2 id="business-next-title">งานถัดไป</h2>
              </div>
              <span>ข้อมูลตัวอย่าง</span>
            </div>
            <ol className="business-next-work__list">
              {nextWork.map((item) => {
                const Icon = moduleIcons[item.module];
                return (
                  <li key={`${item.time}-${item.petName}`}>
                    <time>{item.time}</time>
                    <span className="business-next-work__line" aria-hidden="true" />
                    <span className="business-next-work__icon"><Icon size={19} /></span>
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
              <div><p className="business-section-kicker">ภาพรวมสั้น ๆ</p><h2 id="business-today-title">วันนี้</h2></div>
            </div>
            <dl>
              {todayItems.map((item) => (
                <div key={item.key}><dt>{item.label}</dt><dd>{todaySummary[item.key]}</dd></div>
              ))}
            </dl>
          </section>

          <section className="business-home-section business-module-summary" aria-labelledby="business-modules-title">
            <div className="business-home-section__heading">
              <div><p className="business-section-kicker">เฉพาะบริการของสาขานี้</p><h2 id="business-modules-title">งานบริการ</h2></div>
            </div>
            <ul>
              {enabledModules.map((module) => {
                const Icon = moduleIcons[module];
                const summary = demo.moduleSummaries[module];
                if (!summary) return null;
                return (
                  <li key={module}>
                    <span><Icon size={20} /></span>
                    <div><strong>{BUSINESS_SERVICE_MODULES[module].label}</strong><b>{summary.value}</b><small>{summary.detail}</small></div>
                    <span className="business-planned-tag">Demo</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="business-home-section business-revenue" aria-labelledby="business-revenue-title">
            <span><ShieldCheck size={20} /></span>
            <div><p id="business-revenue-title">รายรับวันนี้</p><strong>{revenue}</strong><small>DEMO / MOCK · ยังไม่มีระบบการเงินจริง</small></div>
          </section>
        </aside>
      </div>

      <p className="business-home__boundary">Home นี้เป็นข้อมูลตัวอย่างเพื่อทดสอบบริบทหลายบริการ งานถัดไปและจำนวนการจองวันนี้ใช้ข้อมูลจากปฏิทิน ส่วนข้อความ งานบริการ และการเงินยังไม่เปิดใช้งาน</p>
      <Link className="business-home__quiet-scan" href="/business/scan">ไปที่สแกนรับเข้า <ArrowRight size={18} /></Link>
    </div>
  );
}
