"use client";

import { type FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import {
  getDemoBusinessContextDetails,
  getDemoBusinessContextForBranch,
  listPrototypeBookingFixtures,
  listPrototypeBookings,
  readPrototypeCustomer,
  readPrototypeCustomerFixture,
  resolvePrototypeBookingRelationship,
  updatePrototypeCustomerTags,
} from "../../_prototype/businessState";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { ArrowLeft, CalendarDays, CircleAlert, Info, MessageCircle, Phone, Plus, Save, X } from "../../_components/icons";
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
  customerBookings,
  nextPetBooking,
  petSpeciesLabel,
} from "./customerPresentation";

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

  const relatedBookings = customerBookings(customer, bookings);
  const upcomingBookings = relatedBookings.filter(bookingOccursAfterDemoStart).slice(0, 3);
  const recentBookings = [...relatedBookings]
    .filter((booking) => booking.status !== "cancelled")
    .sort((first, second) => second.start.localeCompare(first.start) || second.updatedAt.localeCompare(first.updatedAt))
    .slice(0, 3);

  function updateTags(nextTags: readonly string[]) {
    const updated = updatePrototypeCustomerTags(customer.id, nextTags);
    if (!updated) setNotice("บันทึกป้ายกำกับในเบราว์เซอร์ไม่สำเร็จ ลองอีกครั้ง");
  }

  function addTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTag = tagInput.trim();
    if (!nextTag || customer.tags.includes(nextTag)) return;
    updateTags([...customer.tags, nextTag]);
    setTagInput("");
  }

  return (
    <div className="business-customer-detail shell">
      <Link className="business-customer-detail__back" href="/business/customers"><ArrowLeft size={18} />กลับไปรายชื่อลูกค้า</Link>
      <BusinessPageHeader
        title={<span className="business-customer-detail__title"><BusinessCustomerAvatar name={customer.name} size="large" /><span>{customer.name}</span></span>}
        context={<div className="business-customer-detail__contact">
          <span className="business-customer-detail__role">ผู้ติดต่อหลัก</span>
          {customer.phone ? <span><Phone size={16} />{customer.phone}</span> : <span>ยังไม่มีเบอร์โทร</span>}
          {customer.email ? <span>{customer.email}</span> : null}
        </div>}
        actions={<div className="business-customer-detail__actions">
          <div className="business-customer-detail__primary-actions">
            <Link className="button button--business" href={`/business/calendar?customerId=${encodeURIComponent(customer.id)}`}><CalendarDays size={18} />เพิ่มการจอง</Link>
            <a className="button button--business-ghost" href={`/business/inbox?customerId=${encodeURIComponent(customer.id)}`}><MessageCircle size={18} />ส่งข้อความ</a>
          </div>
          <div className="business-customer-detail__secondary-actions">
            <button type="button" onClick={() => setEditor("customer")}>แก้ไขข้อมูลลูกค้า</button>
            <button type="button" onClick={() => setEditor("pet")}><Plus size={16} />เพิ่มสัตว์เลี้ยง</button>
          </div>
        </div>}
      />

      {notice ? <p className="business-customers__notice" role="status"><Info size={18} />{notice}</p> : null}

      <div className="business-customer-detail__layout">
        <div className="business-customer-detail__main">
          <section className="customer-detail-section customer-detail-section--pets" aria-labelledby="customer-pets-title">
            <header>
              <div><h2 id="customer-pets-title">สัตว์เลี้ยงที่ใช้บริการ</h2><p>ดูนัดถัดไปหรือเริ่มการจองให้น้อง</p></div>
              <span>{customer.pets.length} ตัว</span>
            </header>
            {customer.pets.length > 0 ? (
              <ul className="customer-pet-list">
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
                        <Link href={`/business/calendar?customerId=${encodeURIComponent(customer.id)}&petId=${encodeURIComponent(pet.id)}`}>เพิ่มการจองให้น้อง</Link>
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
              <div className="customer-pet-empty"><strong>ยังไม่มีสัตว์เลี้ยงในรายการ</strong><button type="button" onClick={() => setEditor("pet")}><Plus size={18} />เพิ่มสัตว์เลี้ยง</button></div>
            )}
          </section>

          <section className="customer-detail-section" aria-labelledby="customer-upcoming-title">
            <header><div><h2 id="customer-upcoming-title">นัดหมายที่กำลังจะมาถึง</h2><p>แสดงสูงสุด 3 รายการถัดไป</p></div><CalendarDays size={22} /></header>
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

          <section className="customer-detail-section" aria-labelledby="customer-recent-title">
            <header><div><h2 id="customer-recent-title">การใช้บริการล่าสุด</h2><p>ประวัติ 3 รายการล่าสุดของลูกค้ารายนี้</p></div></header>
            {recentBookings.length > 0 ? (
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
            <header><div><h2 id="customer-team-title">ข้อมูลสำหรับทีมงาน</h2><p>ข้อมูลภายในร้าน ใช้เตรียมการบริการครั้งถัดไป</p></div></header>
            <div className="customer-business-notes" aria-labelledby="customer-notes-title">
              <header><h3 id="customer-notes-title">หมายเหตุของร้าน</h3><button type="button" title="แก้ไขหมายเหตุของร้าน" aria-label="แก้ไขหมายเหตุของร้าน" onClick={() => setEditor("customer")}><Save size={17} /></button></header>
              {customer.businessNote ? <p>{customer.businessNote}</p> : <p className="customer-section-empty">ยังไม่มีหมายเหตุของร้าน</p>}
            </div>
            <div className="customer-tags" aria-labelledby="customer-tags-title">
              <header><h3 id="customer-tags-title">ป้ายกำกับ</h3></header>
              <div className="customer-tags__list">
                {customer.tags.length > 0 ? customer.tags.map((tag) => <span key={tag}>{tag}<button type="button" title={`เอาป้ายกำกับ ${tag} ออก`} aria-label={`เอาป้ายกำกับ ${tag} ออก`} onClick={() => updateTags(customer.tags.filter((item) => item !== tag))}><X size={14} /></button></span>) : <p>ยังไม่มีป้ายกำกับ</p>}
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
