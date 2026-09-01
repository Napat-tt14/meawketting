"use client";

import { type FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import {
  getDemoBusinessContextDetails,
  getDemoBusinessContextForBranch,
  getHotelRooms,
  getPrototypeHotelStayRoomId,
  HOTEL_STAY_STATUS_LABELS,
  listCompletedPrototypeGroomingServiceJobs,
  listPrototypeBookingFixtures,
  listPrototypeBookings,
  listPrototypeHotelStayFixtures,
  listPrototypeHotelStays,
  readPrototypeCustomer,
  readPrototypeCustomerFixture,
  resolvePrototypeBookingRelationship,
  updatePrototypeCustomerTags,
} from "../../_prototype/businessState";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { ArrowLeft, CalendarDays, CircleAlert, Info, MessageCircle, Pencil, Phone, Plus, X } from "../../_components/icons";
import { useBusinessContext } from "../_components/useBusinessContext";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { CustomerEditor } from "./CustomerEditor";
import { DataSourceLabel, PassportConnectionStatus } from "./CustomerBadges";
import { PetRelationshipEditor } from "./PetRelationshipEditor";
import { BusinessCustomerAvatar, BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import {
  bookingOccursAfterDemoStart,
  bookingDateLabel,
  bookingSummary,
  customerTagLabel,
  customerBookings,
  nextPetBooking,
  petSpeciesLabel,
} from "./customerPresentation";
import { calendarDateLabel } from "../calendar/calendarPresentation";

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function CustomerDetailScreen({ customerId }: { customerId: string }) {
  const { context } = useBusinessContext();
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<"customer" | "pet" | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const relationshipStateReady = useIsClient();

  useEffect(() => {
    const sync = () => setRevision((current) => current + 1);
    window.addEventListener("meawketting:business-state", sync);
    return () => window.removeEventListener("meawketting:business-state", sync);
  }, []);

  void revision;
  const candidate = relationshipStateReady ? readPrototypeCustomer(customerId) : readPrototypeCustomerFixture(customerId);
  const customer = candidate?.businessId === context.businessId ? candidate : null;
  const bookings = relationshipStateReady
    ? listPrototypeBookings(null, { includeCancelled: true })
    : listPrototypeBookingFixtures(null, { includeCancelled: true });

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

  const relatedBookings = customerBookings(customer, bookings);
  const upcomingBookings = relatedBookings.filter(bookingOccursAfterDemoStart).slice(0, 3);
  const recentBookings = [...relatedBookings]
    .filter((booking) => booking.status !== "cancelled")
    .sort((first, second) => second.start.localeCompare(first.start) || second.updatedAt.localeCompare(first.updatedAt))
    .slice(0, 3);
  const completedGroomingJobs = listCompletedPrototypeGroomingServiceJobs(customer.id, !relationshipStateReady).slice(0, 3);
  // Hotel execution stays Branch-scoped even though Customer identity is shared
  // across the Business. This avoids exposing another Branch's live operations.
  const hotelStays = relationshipStateReady
    ? listPrototypeHotelStays(context, { includeClosed: true })
    : listPrototypeHotelStayFixtures(context, { includeClosed: true });
  const currentHotelStays = hotelStays
    .filter((stay) => stay.customerId === customer.id && ["checked-in", "in-stay", "ready-for-checkout"].includes(stay.status))
    .sort((first, second) => first.scheduledCheckOut.localeCompare(second.scheduledCheckOut));
  const completedHotelStays = hotelStays
    .filter((stay) => stay.customerId === customer.id && ["checked-out", "completed"].includes(stay.status))
    .sort((first, second) => (second.actualCheckOutAt ?? second.updatedAt).localeCompare(first.actualCheckOutAt ?? first.updatedAt))
    .slice(0, 3);

  function updateTags(nextTags: readonly string[]) {
    const updated = updatePrototypeCustomerTags(resolvedCustomer.id, nextTags);
    if (!updated) setNotice("บันทึกป้ายกำกับในเบราว์เซอร์ไม่สำเร็จ ลองอีกครั้ง");
  }

  function addTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTag = tagInput.trim();
    if (!nextTag || resolvedCustomer.tags.includes(nextTag)) return;
    updateTags([...resolvedCustomer.tags, nextTag]);
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
                  const nextBooking = nextPetBooking(pet, relatedBookings);
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
                {upcomingBookings.map((booking) => {
                  const relationship = resolvePrototypeBookingRelationship(booking);
                  const branch = getDemoBusinessContextDetails(getDemoBusinessContextForBranch(booking.businessId, booking.branchId)).branch;
                  return <li key={booking.bookingId}><div className="customer-booking-list__identity"><BusinessServiceIcon module={booking.serviceModule} size={18} /><span><strong>{relationship.pets.map((pet) => pet.name).join(", ") || "น้อง"}</strong><small>{booking.service.label}</small></span></div><div className="customer-booking-list__when"><strong>{bookingDateLabel(booking)}</strong><small>{branch?.name ?? "สาขานี้"}</small></div></li>;
                })}
              </ol>
            ) : <p className="customer-section-empty">ยังไม่มีนัดหมายของลูกค้ารายนี้</p>}
          </section>

          <section className="customer-detail-section customer-detail-section--recent" aria-labelledby="customer-recent-title">
            <header><div><h2 id="customer-recent-title">การใช้บริการล่าสุด</h2></div></header>
            {completedGroomingJobs.length > 0 || completedHotelStays.length > 0 ? (
              <ol className="customer-booking-list customer-booking-list--recent">
                {completedGroomingJobs.map((job) => {
                  const pet = customer.pets.find((item) => item.id === job.petId);
                  const branch = getDemoBusinessContextDetails(getDemoBusinessContextForBranch(job.businessId, job.branchId)).branch;
                  const completedDate = job.actualCompletedAt?.slice(0, 10) ?? job.scheduledStart.slice(0, 10);
                  return <li key={job.serviceJobId}><div className="customer-booking-list__identity"><BusinessServiceIcon module="grooming" size={18} /><span><strong>อาบน้ำ / ตัดขน</strong><small>{pet?.name ?? "น้อง"} · งานเสร็จแล้ว</small></span></div><div className="customer-booking-list__when"><strong>{calendarDateLabel(completedDate, { day: "numeric", month: "short" })}</strong><small>{branch?.name ?? "สาขานี้"}</small></div></li>;
                })}
                {completedHotelStays.map((stay) => {
                  const pet = customer.pets.find((item) => item.id === stay.petId);
                  const completedDate = stay.actualCheckOutAt?.slice(0, 10) ?? stay.scheduledCheckOut;
                  return <li key={stay.hotelStayId}><div className="customer-booking-list__identity"><BusinessServiceIcon module="hotel" size={18} /><span><strong>เข้าพักโรงแรม</strong><small>{pet?.name ?? "น้อง"} · {HOTEL_STAY_STATUS_LABELS[stay.status]}</small></span></div><div className="customer-booking-list__when"><strong>{calendarDateLabel(completedDate, { day: "numeric", month: "short" })}</strong><Link href={`/business/hotel?stayId=${encodeURIComponent(stay.hotelStayId)}`}>ดูรายละเอียด</Link></div></li>;
                })}
              </ol>
            ) : recentBookings.length > 0 ? (
              <ol className="customer-booking-list customer-booking-list--recent">
                {recentBookings.map((booking) => {
                  const relationship = resolvePrototypeBookingRelationship(booking);
                  const branch = getDemoBusinessContextDetails(getDemoBusinessContextForBranch(booking.businessId, booking.branchId)).branch;
                  return <li key={booking.bookingId}><div className="customer-booking-list__identity"><BusinessServiceIcon module={booking.serviceModule} size={18} /><span><strong>{booking.service.label}</strong><small>{relationship.pets.map((pet) => pet.name).join(", ") || "น้อง"}</small></span></div><div className="customer-booking-list__when"><strong>{bookingDateLabel(booking)}</strong><small>{branch?.name ?? "สาขานี้"}</small></div></li>;
                })}
              </ol>
            ) : <p className="customer-section-empty">ยังไม่มีประวัติการใช้บริการที่แสดงได้</p>}
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
                {customer.tags.length > 0 ? customer.tags.map((tag) => <span key={tag}>{customerTagLabel(tag)}<button type="button" title={`เอาป้ายกำกับ ${customerTagLabel(tag)} ออก`} aria-label={`เอาป้ายกำกับ ${customerTagLabel(tag)} ออก`} onClick={() => updateTags(customer.tags.filter((item) => item !== tag))}><X size={14} /></button></span>) : <p>ยังไม่มีป้ายกำกับ</p>}
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
