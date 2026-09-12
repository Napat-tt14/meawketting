"use client";

import { type FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { getDurableCustomer, updateDurableCustomerTags } from "../../_backend/be2/client";
import {
  getDemoBusinessContextDetails,
  getDemoBusinessContextForBranch,
  getHotelRooms,
  getPrototypeHotelStayRoomId,
  HOTEL_STAY_STATUS_LABELS,
  listPrototypeChargeBalances,
  listPrototypeChargeFixtures,
  listPrototypeCharges,
  listPrototypePaymentFixtures,
  listPrototypePayments,
  getPrototypeServiceRecordPaymentReference,
  listPrototypeServiceRecordFixtures,
  listPrototypeServiceRecords,
  listPrototypeBookingFixtures,
  listPrototypeBookings,
  listPrototypeHotelStayFixtures,
  listPrototypeHotelStays,
  listPrototypeCustomerFixtures,
  listPrototypeCustomers,
  readPrototypeCustomer,
  readPrototypeCustomerFixture,
  resolvePrototypeBookingRelationship,
  type DemoBusinessContext,
  type PrototypeChargeStatus,
  type PrototypeCustomer,
  type PrototypeServiceRecord,
  type PrototypeServiceRecordPaymentStatus,
} from "../../_prototype/businessState";
import { listPrototypeConversationFixtures, listPrototypeConversations } from "../../_prototype/inboxState";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { ArrowLeft, CalendarDays, CheckCircle, CircleAlert, CircleDashed, CircleOff, Clock, FileImage, Info, MessageCircle, Pencil, Phone, Plus, Wallet, X } from "../../_components/icons";
import { useBusinessContext } from "../_components/useBusinessContext";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { CustomerEditor } from "./CustomerEditor";
import { DataSourceLabel, PassportConnectionStatus } from "./CustomerBadges";
import { PetRelationshipEditor } from "./PetRelationshipEditor";
import { BusinessCustomerAvatar, BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import {
  bookingDateLabel,
  bookingSummary,
  customerTagLabel,
  petSpeciesLabel,
} from "./customerPresentation";
import { calendarDateLabel } from "../calendar/calendarPresentation";
import { chargeStatusLabel, formatBusinessMoney, paymentMethodLabel } from "../billing/billingPresentation";
import { CustomerCrmPanel } from "./CrmPanel";
import { deriveCustomerCrmProfile, deriveCustomerCrmReferenceAt, deriveCustomerTimeline, deriveCustomerUpcomingBookings } from "./crmPresentation";
import { ensureDurableCrm } from "../../_backend/be8/client";

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function CustomerChargeStatus({ status }: { status: PrototypeChargeStatus }) {
  const Icon = status === "paid" ? CheckCircle : status === "partial" ? CircleDashed : status === "cancelled" ? CircleOff : Clock;
  return <span className={`customer-financial-status customer-financial-status--${status}`}><Icon size={16} />{chargeStatusLabel(status)}</span>;
}

function serviceRecordDateLabel(value: string) {
  const date = calendarDateLabel(value.slice(0, 10), { day: "numeric", month: "short" });
  const time = value.slice(11, 16);
  return time ? `${date} · ${time}` : date;
}

function serviceRecordPaymentLabel(status: PrototypeServiceRecordPaymentStatus) {
  return status === "no-charge" ? "ยังไม่มี Charge" : chargeStatusLabel(status);
}

function ServiceRecordHistoryItem({
  record,
  context,
  fixtureOnly,
  customer,
}: {
  record: PrototypeServiceRecord;
  context: DemoBusinessContext;
  fixtureOnly: boolean;
  customer: PrototypeCustomer;
}) {
  const pet = customer.pets.find((item) => item.id === record.petId);
  const branch = getDemoBusinessContextDetails(getDemoBusinessContextForBranch(record.businessId, record.branchId, fixtureOnly), fixtureOnly).branch;
  const paymentReference = getPrototypeServiceRecordPaymentReference(record, context, fixtureOnly);
  return (
    <li className="customer-service-history__item">
      <details className="customer-service-record">
        <summary>
          <span className="customer-service-record__identity">
            {pet ? <BusinessPetAvatar pet={pet} size="medium" /> : <BusinessServiceIcon module={record.serviceModule} size={18} />}
            <span><strong>{pet?.name ?? "น้อง"}</strong><small>{record.serviceLabel}</small></span>
          </span>
          <span className="customer-service-record__meta">
            <time>{serviceRecordDateLabel(record.completedAt)}</time>
            <small>{branch?.name ?? "สาขานี้"}</small>
            <span className={`customer-service-record__payment customer-service-record__payment--${paymentReference.status}`}><Wallet size={14} />{serviceRecordPaymentLabel(paymentReference.status)}</span>
          </span>
        </summary>
        <div className="customer-service-record__body">
          <p className="customer-service-record__headline">{record.summary}</p>
          <dl className="customer-service-record__facts">
            <div><dt>บริการ</dt><dd>{record.serviceLabel}</dd></div>
            <div><dt>เสร็จเมื่อ</dt><dd>{serviceRecordDateLabel(record.completedAt)}</dd></div>
            <div><dt>สาขา</dt><dd>{branch?.name ?? "สาขานี้"}</dd></div>
          </dl>
          {record.details.length > 0 ? <dl className="customer-service-record__details">{record.details.map((detail) => <div key={detail.id}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl> : null}
          <section className="customer-service-record__activities" aria-label={`รายการบริการของ ${pet?.name ?? "น้อง"}`}>
            <h3>รายการที่ทำ</h3>
            <ol>{record.activities.map((activity) => <li key={activity.id}><CheckCircle size={16} /><span><strong>{activity.label}</strong>{activity.detail ? <small>{activity.detail}</small> : null}</span>{activity.occurredAt ? <time>{serviceRecordDateLabel(activity.occurredAt)}</time> : null}</li>)}</ol>
          </section>
          {record.staffResourceLabels.length > 0 ? <p className="customer-service-record__staff"><strong>ทีม / ผู้เกี่ยวข้อง</strong>{record.staffResourceLabels.join(" · ")}</p> : null}
          {record.businessNote ? <p className="customer-service-record__note"><strong>หมายเหตุของร้าน</strong>{record.businessNote}</p> : null}
          {record.photos.length > 0 ? <section className="customer-service-record__photos" aria-label="รูปที่อนุญาตใน Service Record"><h3><FileImage size={16} />รูปที่อนุญาต</h3><ul>{record.photos.map((photo) => <li key={photo.id}><FileImage size={15} /><span>{photo.label}<small>{photo.phase === "before" ? "ก่อนบริการ" : "หลังบริการ"}</small></span></li>)}</ul></section> : null}
          {record.corrections.length > 0 ? <details className="customer-service-record__audit"><summary>มีประวัติการแก้ไข {record.corrections.length} รายการ</summary><ol>{record.corrections.slice().reverse().map((correction) => <li key={correction.id}><time>{serviceRecordDateLabel(correction.at)}</time><span><strong>{correction.field === "summary" ? "สรุปบริการ" : "หมายเหตุของร้าน"}</strong><small>{correction.previousValue} → {correction.nextValue}</small><em>{correction.reason} · {correction.correctedBy}</em></span></li>)}</ol></details> : null}
          <p className="customer-service-record__boundary">Service Record เป็นบันทึกบริการของร้านเท่านั้น · ไม่ใช่ Pet Passport หรือข้อมูลสุขภาพ</p>
        </div>
      </details>
    </li>
  );
}

export function CustomerDetailScreen({ customerId }: { customerId: string }) {
  const { context, isContextReady } = useBusinessContext();
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<"customer" | "pet" | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const relationshipStateReady = useIsClient();
  const { businessId, branchId } = context;
  useEffect(() => {
    if (!isContextReady) return;
    let stopped = false;
    const load = async () => { try { await ensureDurableCrm({ businessId, branchId }, customerId); if (!stopped) setNotice((v) => v === "โหลด CRM ล่าสุดไม่สำเร็จ" ? null : v); } catch { if (!stopped) setNotice("โหลด CRM ล่าสุดไม่สำเร็จ"); } };
    void load(); const timer = window.setInterval(() => void load(), 5000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [businessId, branchId, customerId, isContextReady]);

  useEffect(() => {
    const sync = () => setRevision((current) => current + 1);
    window.addEventListener("meawketting:business-state", sync);
    return () => window.removeEventListener("meawketting:business-state", sync);
  }, []);

  useEffect(() => {
    void getDurableCustomer(context.businessId, customerId).catch(() => {
      setNotice("ไม่สามารถโหลดข้อมูลลูกค้าจาก Business นี้ได้");
    });
  }, [context.businessId, customerId]);

  void revision;
  const candidate = relationshipStateReady ? readPrototypeCustomer(customerId) : readPrototypeCustomerFixture(customerId);
  const customer = candidate?.businessId === context.businessId ? candidate : null;
  const bookings = relationshipStateReady
    ? listPrototypeBookings(null, { includeCancelled: true })
    : listPrototypeBookingFixtures(null, { includeCancelled: true });
  const crmServiceRecords = relationshipStateReady
    ? listPrototypeServiceRecords(null)
    : listPrototypeServiceRecordFixtures(null);
  const crmCharges = relationshipStateReady ? listPrototypeCharges(null) : listPrototypeChargeFixtures(null);
  const crmPayments = relationshipStateReady ? listPrototypePayments(null) : listPrototypePaymentFixtures(null);
  const crmConversations = relationshipStateReady
    ? listPrototypeConversations(context.businessId)
    : listPrototypeConversationFixtures(context.businessId);

  if (!customer) {
    return (
      <div className="business-customer-detail shell business-customer-detail--missing">
        <Link className="business-customer-detail__back" href="/business/customers"><ArrowLeft size={18} />กลับไปรายชื่อลูกค้า</Link>
        <header><h1>ไม่พบลูกค้า</h1></header>
        <section className="customer-detail-missing" role="alert"><CircleAlert size={28} /><div><strong>ไม่พบข้อมูลลูกค้าในร้านหรือบริบทนี้</strong><p>เราไม่แสดงข้อมูลความสัมพันธ์ของร้านอื่นจากลิงก์นี้</p></div></section>
      </div>
    );
  }
  const resolvedCustomer = customer;
  const crmDataset = {
    scope: context,
    bookings,
    serviceRecords: crmServiceRecords,
    charges: crmCharges,
    payments: crmPayments,
    conversations: crmConversations,
  };
  const crmCustomers = relationshipStateReady
    ? listPrototypeCustomers(context)
    : listPrototypeCustomerFixtures(context);
  const referenceAt = deriveCustomerCrmReferenceAt(crmCustomers, crmDataset);
  const crmProfile = deriveCustomerCrmProfile(
    customer,
    crmDataset,
    referenceAt,
  );
  const customerTimeline = deriveCustomerTimeline(customer, crmDataset);

  const upcomingBookings = deriveCustomerUpcomingBookings(customer, crmDataset, referenceAt);
  // Hotel execution stays Branch-scoped even though Customer identity is shared
  // across the Business. This avoids exposing another Branch's live operations.
  const hotelStays = relationshipStateReady
    ? listPrototypeHotelStays(context, { includeClosed: true })
    : listPrototypeHotelStayFixtures(context, { includeClosed: true });
  const currentHotelStays = hotelStays
    .filter((stay) => stay.customerId === customer.id && ["checked-in", "in-stay", "ready-for-checkout"].includes(stay.status))
    .sort((first, second) => first.scheduledCheckOut.localeCompare(second.scheduledCheckOut));
  const serviceRecords = relationshipStateReady
    ? listPrototypeServiceRecords(context)
    : listPrototypeServiceRecordFixtures(context);
  const recentServiceRecords = serviceRecords
    .filter((record) => record.customerId === customer.id)
    .slice(0, 4);
  const financialBalances = listPrototypeChargeBalances(context, !relationshipStateReady)
    .filter((balance) => balance.charge.customerId === customer.id)
    .slice(0, 4);
  const financialPayments = (relationshipStateReady ? listPrototypePayments(context) : listPrototypePaymentFixtures(context))
    .filter((payment) => payment.customerId === customer.id)
    .slice(0, 3);
  const unpaidFinancialBalance = financialBalances
    .filter((balance) => balance.status === "unpaid" || balance.status === "partial")
    .reduce((total, balance) => total + balance.remaining, 0);

  async function updateTags(nextTags: readonly string[]) {
    try {
      await updateDurableCustomerTags({
        businessId: resolvedCustomer.businessId,
        customerId: resolvedCustomer.id,
        tags: [...nextTags],
      });
    } catch {
      setNotice("บันทึกป้ายกำกับไม่สำเร็จ ลองอีกครั้ง");
    }
  }

  function addTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTag = tagInput.trim();
    if (!nextTag || resolvedCustomer.tags.includes(nextTag)) return;
    void updateTags([...resolvedCustomer.tags, nextTag]);
    setTagInput("");
  }

  return (
    <div className="business-customer-detail shell">
      <Link className="business-customer-detail__back" href="/business/customers"><ArrowLeft size={18} />กลับไปรายชื่อลูกค้า</Link>
      <BusinessPageHeader
        className="business-customer-detail__profile"
        title={<span className="business-customer-detail__title">
          <BusinessCustomerAvatar name={customer.name} size="large" />
          <span className="business-customer-detail__name">
            <span>{customer.name}</span>
            <button className="customer-detail-icon-action customer-detail-icon-action--edit" type="button" title="แก้ไขข้อมูลลูกค้า" aria-label={`แก้ไขข้อมูลลูกค้า ${customer.name}`} onClick={() => setEditor("customer")}>
              <Pencil size={18} />
            </button>
          </span>
        </span>}
        context={<div className="business-customer-detail__contact">
          <span className="business-customer-detail__role">ผู้ติดต่อหลัก</span>
          {customer.phone ? <span><Phone size={16} />{customer.phone}</span> : <span>ยังไม่มีเบอร์โทร</span>}
          {customer.email ? <span>{customer.email}</span> : null}
        </div>}
        actions={<nav className="business-customer-detail__actions" aria-label="การทำงานกับลูกค้า">
          <Link className="customer-detail-icon-action customer-detail-icon-action--primary" href={`/business/calendar?customerId=${encodeURIComponent(customer.id)}`} title="เพิ่มการจอง" aria-label={`เพิ่มการจองให้ ${customer.name}`}><CalendarDays size={20} /></Link>
          <a className="customer-detail-icon-action" href={`/business/inbox?customerId=${encodeURIComponent(customer.id)}`} title="ส่งข้อความ" aria-label={`ส่งข้อความถึง ${customer.name}`}><MessageCircle size={20} /></a>
        </nav>}
      />

      {notice ? <p className="business-customers__notice" role="status"><Info size={18} />{notice}</p> : null}

      <div className="business-customer-detail__layout">
        <div className="business-customer-detail__main">
          <CustomerCrmPanel profile={crmProfile} timeline={customerTimeline} />

          <section className="customer-detail-section customer-detail-section--pets" aria-labelledby="customer-pets-title">
            <header>
              <div><h2 id="customer-pets-title">สัตว์เลี้ยง</h2><p>เลือกดูข้อมูลและเพิ่มการจองแยกตามตัว</p></div>
              <div className="customer-pets-heading-actions">
                <span>{customer.pets.length} ตัว</span>
                <button className="customer-detail-icon-action" type="button" title="เพิ่มสัตว์เลี้ยง" aria-label={`เพิ่มสัตว์เลี้ยงให้ ${customer.name}`} onClick={() => setEditor("pet")}><Plus size={20} /></button>
              </div>
            </header>
            {customer.pets.length > 0 ? (
              <ul className="customer-pet-list" aria-label="สัตว์เลี้ยงของลูกค้ารายนี้">
                {customer.pets.map((pet) => {
                  const nextBooking = upcomingBookings.find((booking) => booking.pets.some((bookingPet) => bookingPet.id === pet.id)) ?? null;
                  return (
                    <li className="customer-pet-row" key={pet.id}>
                      <div className="customer-pet-row__identity">
                        <BusinessPetAvatar pet={pet} size="large" />
                        <div><strong>{pet.name}</strong><span>{petSpeciesLabel(pet.species)}</span></div>
                      </div>
                      <div className="customer-pet-row__booking">
                        <div className="customer-pet-row__next-booking">
                          <small>นัดถัดไป</small>
                          {nextBooking ? <span><BusinessServiceIcon module={nextBooking.serviceModule} size={16} /><strong>{bookingSummary(nextBooking)}</strong></span> : <span className="customer-section-empty">ยังไม่มีนัดหมาย</span>}
                        </div>
                        <Link href={`/business/calendar?customerId=${encodeURIComponent(customer.id)}&petId=${encodeURIComponent(pet.id)}`}>เพิ่มการจอง</Link>
                      </div>
                      <details className="customer-pet-row__details">
                        <summary>ข้อมูลเพิ่มเติมของ {pet.name}</summary>
                        <div className="customer-pet-row__detail-grid">
                          <div><small>แหล่งข้อมูล</small><DataSourceLabel pet={pet} /></div>
                          <div><small>สถานะ Pet Passport</small><PassportConnectionStatus pet={pet} /></div>
                          {pet.businessNote ? <p className="customer-pet-row__note"><Info size={16} /><span><strong>หมายเหตุของร้าน</strong>{pet.businessNote}</span></p> : null}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="customer-pet-empty"><strong>ยังไม่มีสัตว์เลี้ยงในรายการ</strong><span>กดปุ่ม + ด้านบนเพื่อเพิ่มสัตว์เลี้ยง</span></div>
            )}
          </section>

          {currentHotelStays.length > 0 ? (
            <section className="customer-detail-section customer-detail-section--hotel" aria-labelledby="customer-hotel-title">
              <header><div><h2 id="customer-hotel-title">กำลังเข้าพัก</h2><p>ข้อมูลปฏิบัติการของสาขาปัจจุบัน</p></div><BusinessServiceIcon module="hotel" size={21} /></header>
              <ol className="customer-booking-list customer-booking-list--hotel">
                {currentHotelStays.map((stay) => {
                  const pet = customer.pets.find((item) => item.id === stay.petId);
                  const roomId = getPrototypeHotelStayRoomId(stay);
                  const room = roomId ? getHotelRooms(context).find((item) => item.id === roomId) ?? null : null;
                  return (
                    <li key={stay.hotelStayId}>
                      <div className="customer-booking-list__identity"><BusinessServiceIcon module="hotel" size={18} /><span><strong>{pet?.name ?? "น้อง"}</strong><small>{HOTEL_STAY_STATUS_LABELS[stay.status]} · {room?.label ?? "ยังไม่ระบุห้อง"}</small></span></div>
                      <div className="customer-booking-list__when"><strong>{calendarDateLabel(stay.scheduledCheckIn, { day: "numeric", month: "short" })} – {calendarDateLabel(stay.scheduledCheckOut, { day: "numeric", month: "short" })}</strong><Link href={`/business/hotel?stayId=${encodeURIComponent(stay.hotelStayId)}`}>เปิดรายการเข้าพัก</Link></div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

          <section className="customer-detail-section customer-detail-section--upcoming" aria-labelledby="customer-upcoming-title">
            <header><div><h2 id="customer-upcoming-title">นัดหมายที่กำลังจะมาถึง</h2></div><CalendarDays size={22} /></header>
            {upcomingBookings.length > 0 ? (
              <ol className="customer-booking-list">
                {upcomingBookings.slice(0, 3).map((booking) => {
                  const relationship = resolvePrototypeBookingRelationship(booking);
                  const branch = getDemoBusinessContextDetails(getDemoBusinessContextForBranch(booking.businessId, booking.branchId, !relationshipStateReady), !relationshipStateReady).branch;
                  return <li key={booking.bookingId}><div className="customer-booking-list__identity"><BusinessServiceIcon module={booking.serviceModule} size={18} /><span><strong>{relationship.pets.map((pet) => pet.name).join(", ") || "น้อง"}</strong><small>{booking.service.label}</small></span></div><div className="customer-booking-list__when"><strong>{bookingDateLabel(booking)}</strong><small>{branch?.name ?? "สาขานี้"}</small></div></li>;
                })}
              </ol>
            ) : <p className="customer-section-empty">ยังไม่มีนัดหมายของลูกค้ารายนี้</p>}
          </section>

          <section className="customer-detail-section customer-detail-section--service-history" aria-labelledby="customer-service-history-title">
            <header><div><h2 id="customer-service-history-title">ประวัติบริการ</h2><p>บันทึกจาก Grooming, Hotel และ Daycare ที่เสร็จแล้ว · เปิดรายละเอียดในรายการนี้</p></div><Clock size={22} /></header>
            {recentServiceRecords.length > 0 ? <ol className="customer-service-history">{recentServiceRecords.map((record) => <ServiceRecordHistoryItem key={record.serviceRecordId} record={record} context={context} fixtureOnly={!relationshipStateReady} customer={customer} />)}</ol> : <p className="customer-section-empty">ยังไม่มีประวัติบริการที่เสร็จสมบูรณ์ของลูกค้ารายนี้ในสาขานี้</p>}
          </section>

          <section className="customer-detail-section customer-detail-section--billing" aria-labelledby="customer-billing-title">
            <header><div><h2 id="customer-billing-title">ยอดและการชำระ</h2><p>ข้อมูลการเงินของสาขาปัจจุบัน</p></div><Wallet size={22} /></header>
            <div className="customer-financial-summary"><span><small>ยอดค้างชำระ</small><strong>{formatBusinessMoney(unpaidFinancialBalance)}</strong></span><Link href="/business/billing">เปิดการเงิน</Link></div>
            {financialBalances.length > 0 ? <ol className="customer-financial-list">{financialBalances.map((balance) => <li key={balance.charge.chargeId}><div><BusinessServiceIcon module={balance.charge.serviceModule} size={18} /><span><strong>{balance.charge.serviceLabel}</strong><small>{balance.charge.petId ? customer.pets.find((pet) => pet.id === balance.charge.petId)?.name ?? "น้อง" : "หลายตัวตามการจอง"} · คงเหลือ {formatBusinessMoney(balance.remaining)}</small></span></div><span><CustomerChargeStatus status={balance.status} /><Link href={`/business/billing?chargeId=${encodeURIComponent(balance.charge.chargeId)}`}>ตรวจยอด</Link></span></li>)}</ol> : <p className="customer-section-empty">ยังไม่มี Charge ของลูกค้ารายนี้ในสาขานี้</p>}
            <div className="customer-payment-history"><h3>การรับชำระล่าสุด</h3>{financialPayments.length > 0 ? <ol>{financialPayments.map((payment) => <li key={payment.paymentId}><span><strong>{paymentMethodLabel(payment.method)}</strong><small>{payment.note || "ไม่มีหมายเหตุ"}</small></span><b>{formatBusinessMoney(payment.amount)}</b></li>)}</ol> : <p>ยังไม่มีรายการรับชำระในสาขานี้</p>}</div>
          </section>
        </div>

        <aside className="business-customer-detail__aside">
          <section className="customer-detail-section customer-team-card" aria-labelledby="customer-team-title">
            <header><div><h2 id="customer-team-title">ข้อมูลสำหรับทีมงาน</h2></div></header>
            <div className="customer-business-notes" aria-labelledby="customer-notes-title">
              <header><h3 id="customer-notes-title">หมายเหตุของร้าน</h3><button type="button" title="แก้ไขหมายเหตุของร้าน" aria-label="แก้ไขหมายเหตุของร้าน" onClick={() => setEditor("customer")}><Pencil size={17} /></button></header>
              {customer.businessNote ? <p>{customer.businessNote}</p> : <p className="customer-section-empty">ยังไม่มีหมายเหตุของร้าน</p>}
            </div>
            <div className="customer-tags" aria-labelledby="customer-tags-title">
              <header><h3 id="customer-tags-title">ป้ายกำกับ</h3></header>
              <div className="customer-tags__list">
                {customer.tags.length > 0 ? customer.tags.map((tag) => <span key={tag}>{customerTagLabel(tag)}<button type="button" title={`เอาป้ายกำกับ ${customerTagLabel(tag)} ออก`} aria-label={`เอาป้ายกำกับ ${customerTagLabel(tag)} ออก`} onClick={() => void updateTags(customer.tags.filter((item) => item !== tag))}><X size={14} /></button></span>) : <p>ยังไม่มีป้ายกำกับ</p>}
              </div>
              <form className="customer-tags__form" onSubmit={addTag}>
                <label className="sr-only" htmlFor="customer-tag-input">เพิ่มป้ายกำกับ</label>
                <input id="customer-tag-input" value={tagInput} maxLength={32} placeholder="เพิ่มป้ายกำกับ" onInput={(event) => setTagInput(event.currentTarget.value)} />
                <button type="submit" title="เพิ่มป้ายกำกับ" aria-label="เพิ่มป้ายกำกับ" disabled={!tagInput.trim()}><Plus size={18} /></button>
              </form>
            </div>
          </section>

          <details className="customer-authority-note">
            <summary>Passport และสิทธิ์เข้าถึง</summary>
            <div>
              <p><strong>ข้อมูลจาก Pet Passport</strong><span>เปิดดูได้เฉพาะเมื่อมีสิทธิ์ที่ยังใช้งานอยู่</span></p>
              <p><strong>ข้อมูลของร้าน</strong><span>หมายเหตุและป้ายกำกับอยู่ในความสัมพันธ์ของร้าน</span></p>
              <p><strong>สิทธิ์ที่ร้านมีตอนนี้</strong><span>ดูแยกตามน้องในรายละเอียดด้านบน</span></p>
              <small>ผู้ติดต่อหลักไม่เท่ากับ Guardian การเชื่อมต่อไม่ใช่สิทธิ์ถาวร และร้านแก้ข้อมูลต้นฉบับไม่ได้</small>
            </div>
          </details>
        </aside>
      </div>

      {editor === "customer" ? <CustomerEditor context={context} customer={customer} onClose={() => setEditor(null)} onSaved={(updated) => { setEditor(null); setNotice(`บันทึกข้อมูลของ ${updated.name} แล้ว`); }} /> : null}
      {editor === "pet" ? <PetRelationshipEditor customer={customer} onClose={() => setEditor(null)} onSaved={(updated) => { setEditor(null); setNotice(`เพิ่มสัตว์เลี้ยงให้ ${updated.name} แล้ว`); }} /> : null}
    </div>
  );
}
