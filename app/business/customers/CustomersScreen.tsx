"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { crmScopeKey, loadCrmPage } from "../../_backend/be8/client";
import type { CrmPage } from "../../_backend/be8/contracts";
import { invalidateBusinessData } from "../../_backend/shared/client";
import { startBusinessRefresh } from "../../_backend/shared/refresh";
import { ensureBusinessSession } from "../../_backend/be1/client";
import { BUSINESS_FIXTURE_TEST_MODE } from "../../_prototype/fixtureRuntime";
import {
  getDemoBusinessContextDetails,
  getDemoBusinessContextForBranch,
  listPrototypeCustomerFixtures,
  listPrototypeCustomers,
  projectDurableCustomer,
  listPrototypeBookingFixtures,
  listPrototypeBookings,
  listPrototypeChargeFixtures,
  listPrototypeCharges,
  listPrototypePaymentFixtures,
  listPrototypePayments,
  listPrototypeServiceRecordFixtures,
  listPrototypeServiceRecords,
} from "../../_prototype/businessState";
import { listPrototypeConversationFixtures, listPrototypeConversations } from "../../_prototype/inboxState";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { CalendarDays, ChevronRight, Clock, CircleDashed, Info, Phone, Plus, UsersRound, UserRound, UserRoundCheck } from "../../_components/icons";
import { useBusinessContext } from "../_components/useBusinessContext";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { CustomerEditor } from "./CustomerEditor";
import { BusinessCustomerAvatar, BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import { BusinessSearchField } from "../_components/BusinessSearchField";
import { BusinessSegmentedControl } from "../_components/BusinessSegmentedControl";
import {
  bookingDateLabel,
  customerTagLabel,
  petSpeciesLabel,
} from "./customerPresentation";
import { calendarDateLabel } from "../calendar/calendarPresentation";
import { CustomerCrmOverview } from "./CrmPanel";
import {
  CUSTOMER_CRM_SEGMENTS,
  CUSTOMER_LIFECYCLE_LABELS,
  customerMatchesCrmSegment,
  deriveCustomerCrmProfile,
  deriveCustomerCrmReferenceAt,
  type CustomerCrmSegment,
} from "./crmPresentation";

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function CustomersScreen({ focusSearch = false }: { focusSearch?: boolean }) {
  const { context, isContextReady } = useBusinessContext();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CustomerCrmSegment>("all");
  const [revision, setRevision] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [crmLoadedKey, setCrmLoadedKey] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [cursorTrail, setCursorTrail] = useState<number[]>([]);
  const [page, setPage] = useState<CrmPage | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const relationshipStateReady = useIsClient();
  const { businessId, branchId } = context;
  const offset = cursorTrail.at(-1) ?? 0;
  const crmKey = JSON.stringify([crmScopeKey({ businessId, branchId }), debouncedQuery, filter, offset]);
  const crmReady = BUSINESS_FIXTURE_TEST_MODE || crmLoadedKey === crmKey;
  const currentPage = crmLoadedKey === crmKey ? page : null;
  const searching = !crmReady;
  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedQuery(query.trim()); setCursorTrail([]); }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (!isContextReady) return;
    let initial = true;
    const refresh = startBusinessRefresh(async signal => {
      const next = await loadCrmPage({ businessId, branchId }, { offset, query: debouncedQuery, segment: filter }, { force: !initial, signal });
      initial = false;
      if (!signal.aborted) { setPage(next); setCrmLoadedKey(crmKey); setNotice(v => v === "โหลดข้อมูลความสัมพันธ์ลูกค้าล่าสุดไม่สำเร็จ" ? null : v); }
    }, { businessId, targets: ["crm"], onError: () => setNotice("โหลดข้อมูลความสัมพันธ์ลูกค้าล่าสุดไม่สำเร็จ") });
    return refresh.stop;
  }, [businessId, branchId, isContextReady, crmKey, offset, debouncedQuery, filter]);

  useEffect(() => {
    const sync = () => setRevision((current) => current + 1);
    window.addEventListener("meawketting:business-state", sync);
    return () => window.removeEventListener("meawketting:business-state", sync);
  }, []);

  useEffect(() => {
    if (!focusSearch) return;
    let focusFrame = 0;
    const navigationFrame = window.requestAnimationFrame(() => {
      focusFrame = window.requestAnimationFrame(() => searchRef.current?.focus());
    });
    return () => {
      window.cancelAnimationFrame(navigationFrame);
      window.cancelAnimationFrame(focusFrame);
    };
  }, [focusSearch]);

  void revision;
  const customers = !BUSINESS_FIXTURE_TEST_MODE ? (currentPage?.customers ?? []).map(projectDurableCustomer) : relationshipStateReady
    ? listPrototypeCustomers(context)
    : listPrototypeCustomerFixtures(context);
  const bookings = relationshipStateReady
    ? listPrototypeBookings(null, { includeCancelled: true })
    : listPrototypeBookingFixtures(null, { includeCancelled: true });
  const serviceRecords = relationshipStateReady
    ? listPrototypeServiceRecords(null)
    : listPrototypeServiceRecordFixtures(null);
  const charges = relationshipStateReady ? listPrototypeCharges(null) : listPrototypeChargeFixtures(null);
  const payments = relationshipStateReady ? listPrototypePayments(null) : listPrototypePaymentFixtures(null);
  const conversations = relationshipStateReady
    ? listPrototypeConversations(context.businessId)
    : listPrototypeConversationFixtures(context.businessId);
  const crmDataset = { scope: context, bookings, serviceRecords, charges, payments, conversations };
  const referenceAt = deriveCustomerCrmReferenceAt(customers, crmDataset);
  const crmProfiles = customers.map((customer) => deriveCustomerCrmProfile(customer, crmDataset, referenceAt));
  const crmProfilesByCustomer = new Map(crmProfiles.map((profile) => [profile.customerId, profile]));
  const normalizedQuery = query.trim();
  const visibleCustomers = !BUSINESS_FIXTURE_TEST_MODE ? customers : customers.filter((customer) => (
    (!normalizedQuery || `${customer.name} ${customer.phone ?? ""} ${customer.pets.map(p => p.name).join(" ")}`.toLowerCase().includes(normalizedQuery.toLowerCase()))
    && (!crmReady || customerMatchesCrmSegment(crmProfilesByCustomer.get(customer.id)!, filter))
  ));
  return (
    <div className="business-customers shell">
      <BusinessPageHeader
        title="ลูกค้าและสัตว์เลี้ยง"
        actions={<button className="button button--business business-signature-sweep" type="button" onClick={() => { setNotice(null); setEditorOpen(true); }}><Plus size={19} /><span>เพิ่มลูกค้า</span></button>}
      />

      {crmReady ? <CustomerCrmOverview profiles={crmProfiles} summary={currentPage?.segments} /> : <p role="status">กำลังโหลดข้อมูลความสัมพันธ์ลูกค้า…</p>}

      <section className="customer-search-panel" aria-label="ค้นหาและกรองลูกค้า">
        <BusinessSearchField
          ref={searchRef}
          id="customer-search"
          label="ค้นหาลูกค้าและสัตว์เลี้ยง"
          value={query}
          onInput={(event) => {
            const nextQuery = event.currentTarget.value;
            setQuery(nextQuery);
          }}
          placeholder="ค้นหาชื่อลูกค้า ชื่อน้อง หรือเบอร์โทร"
          autoComplete="off"
        />
        {crmReady ? <div className="crm-segment-filter">
          <span>กลุ่มลูกค้า</span>
          <BusinessSegmentedControl
            className="customer-filter-group"
            value={filter}
            options={CUSTOMER_CRM_SEGMENTS.map((option) => ({
              ...option,
              count: currentPage?.segments?.[option.value] ?? crmProfiles.filter((profile) => customerMatchesCrmSegment(profile, option.value)).length,
              icon: option.value === "grooming" || option.value === "hotel" || option.value === "daycare"
                ? <BusinessServiceIcon module={option.value} size={16} />
                : option.value === "all" ? <UsersRound size={16} />
                : option.value === "new" ? <UserRound size={16} />
                : option.value === "regular" ? <UserRoundCheck size={16} />
                : option.value === "inactive" ? <Clock size={16} /> : <CircleDashed size={16} />,
            }))}
            ariaLabel="กรองกลุ่มลูกค้า"
            onChange={value => { setFilter(value); setCursorTrail([]); }}
          />
        </div> : null}
      </section>

      {notice ? <p className="business-customers__notice" role="status"><Info size={18} />{notice}</p> : null}

      <section className="customer-results" aria-label="รายชื่อลูกค้า" aria-live="polite">
        <header className="customer-results__heading">
          <h2>ลูกค้า {visibleCustomers.length} ราย</h2>
          {currentPage ? <span>จากผลลัพธ์ทั้งหมด {currentPage.total ?? customers.length} ราย</span> : query || filter !== "all" ? <span>จากทั้งหมด {customers.length} ราย</span> : null}
        </header>
        {searching ? (
          <div className="customer-empty-state customer-empty-state--search"><div><strong>กำลังค้นหา…</strong><p>ค้นหาจากข้อมูลลูกค้าและสัตว์เลี้ยงของ Business นี้</p></div></div>
        ) : customers.length === 0 ? (
          <div className="customer-empty-state">
            <div><strong>{currentPage?.total ? "ไม่มีรายการในหน้านี้" : "ยังไม่มีลูกค้าในรายการ"}</strong><p>{currentPage?.total ? "กลับหน้าก่อนหน้าหรือเปลี่ยนตัวกรองเพื่อดูรายการอื่น" : "เพิ่มลูกค้าและสัตว์เลี้ยงเพื่อใช้กับการจองและงานบริการ"}</p></div>
            <button className="button button--business business-signature-sweep" type="button" onClick={() => setEditorOpen(true)}><Plus size={18} /><span>เพิ่มลูกค้า</span></button>
          </div>
        ) : visibleCustomers.length === 0 ? (
          <div className="customer-empty-state customer-empty-state--search">
            <div><strong>ไม่พบลูกค้าที่ตรงกับการค้นหา</strong><p>ลองค้นหาชื่อลูกค้า ชื่อน้อง หรือเบอร์โทรอีกครั้ง</p></div>
            <button className="button button--business-ghost" type="button" onClick={() => { setQuery(""); setFilter("all"); }}>ล้างการค้นหา</button>
          </div>
        ) : (
          <>
            <div className="customer-list-columns" aria-hidden="true">
              <span>ลูกค้า</span>
              <span>สัตว์เลี้ยง</span>
              <span>นัดถัดไป</span>
              <span className="customer-list-columns__tags">ป้ายกำกับ</span>
              <span />
            </div>
            <ol className="customer-list">
              {visibleCustomers.map((customer) => {
                const crmProfile = crmProfilesByCustomer.get(customer.id)!;
                // CRM's next Booking contains only Pets whose service is still
                // outstanding, matching the detail page's upcoming section.
                const nextBooking = crmProfile.nextBooking;
                const nextPet = nextBooking?.pets.find((pet) => customer.pets.some((customerPet) => customerPet.id === pet.id)) ?? null;
                const nextBranch = nextBooking ? getDemoBusinessContextDetails(getDemoBusinessContextForBranch(nextBooking.businessId, nextBooking.branchId, !relationshipStateReady), !relationshipStateReady).branch?.name : null;
                const visiblePets = customer.pets.slice(0, 2);
                const hiddenPetCount = customer.pets.length - visiblePets.length;
                const visibleTags = customer.tags.slice(0, 2);
                const hiddenTagCount = customer.tags.length - visibleTags.length;
                return (
                  <li key={customer.id}>
                    <Link className="customer-list-item" href={`/business/customers/${encodeURIComponent(customer.id)}`}>
                      <span className="customer-list-item__identity">
                        <BusinessCustomerAvatar name={customer.name} />
                        <span>
                          <span className="crm-customer-name"><strong>{customer.name}</strong>{crmReady ? <small className={`crm-lifecycle-badge crm-lifecycle-badge--${crmProfile.lifecycle}`}>{CUSTOMER_LIFECYCLE_LABELS[crmProfile.lifecycle]}</small> : null}</span>
                          {customer.phone ? <small><Phone size={15} />{customer.phone}</small> : <small>ผู้ติดต่อหลัก</small>}
                        </span>
                      </span>
                      <span className="customer-list-item__pets">
                        {visiblePets.map((pet) => (
                          <span className="customer-list-item__pet" key={pet.id}>
                            <BusinessPetAvatar pet={pet} size="small" />
                            <span><strong>{pet.name}</strong><small>{petSpeciesLabel(pet.species)}</small></span>
                          </span>
                        ))}
                        {hiddenPetCount > 0 ? <small className="customer-list-item__more">+{hiddenPetCount} ตัว</small> : null}
                        {customer.pets.length === 0 ? <small className="customer-list-item__empty">ยังไม่มีสัตว์เลี้ยง</small> : null}
                      </span>
                      {crmReady ? <span className="customer-list-item__activity">
                        <small>{nextBooking ? "นัดถัดไป" : "ความสัมพันธ์"}</small>
                        {nextBooking ? <><strong><BusinessServiceIcon module={nextBooking.serviceModule} size={16} />{nextPet?.name ?? "น้อง"} · {nextBooking.service.label}</strong><span><CalendarDays size={16} />{bookingDateLabel(nextBooking)}{nextBranch ? ` · ${nextBranch}` : ""}</span><span className="crm-customer-list-signal">ใช้บริการเสร็จแล้ว {crmProfile.visitCount} ครั้ง</span></> : <><strong className="customer-list-item__empty">{crmProfile.visitCount > 0 ? `ใช้บริการเสร็จแล้ว ${crmProfile.visitCount} ครั้ง` : "ยังไม่มีประวัติบริการ"}</strong><span>{crmProfile.lastVisitAt ? `ล่าสุด ${calendarDateLabel(crmProfile.lastVisitAt.slice(0, 10), { day: "numeric", month: "short" })}` : "เพิ่มนัดหมายเพื่อเริ่มความสัมพันธ์"}</span></>}
                      </span> : null}
                      <span className="customer-list-item__tags">
                        {visibleTags.map((tag) => <span key={tag}>{customerTagLabel(tag)}</span>)}
                        {hiddenTagCount > 0 ? <small className="customer-list-item__more">+{hiddenTagCount}</small> : null}
                        {customer.tags.length === 0 ? <small className="customer-list-item__empty">—</small> : null}
                      </span>
                      <ChevronRight size={20} />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>
      {!BUSINESS_FIXTURE_TEST_MODE ? <nav aria-label="หน้ารายชื่อลูกค้า" className="customer-results__heading" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <button type="button" className="button button--business-ghost" disabled={searching || !cursorTrail.length} onClick={() => setCursorTrail(v => v.slice(0, -1))}>หน้าก่อนหน้า</button>
        <span>หน้า {cursorTrail.length + 1}</span>
        <button type="button" className="button button--business-ghost" disabled={searching || currentPage?.nextOffset == null} onClick={() => { if (currentPage?.nextOffset != null) setCursorTrail(v => [...v, currentPage.nextOffset!]); }}>หน้าถัดไป</button>
        <button type="button" className="button button--business-ghost" onClick={() => { void ensureBusinessSession(true).catch(() => setNotice("เซสชันหมดอายุหรือยังไม่มีสิทธิ์ กรุณาเข้าสู่ระบบอีกครั้ง")); }}>รีเฟรช</button>
      </nav> : null}

      {editorOpen ? (
        <CustomerEditor
          context={context}
          customer={null}
          onClose={() => setEditorOpen(false)}
          onSaved={(customer) => {
            setEditorOpen(false);
            setCursorTrail([]);
            invalidateBusinessData(businessId);
            setNotice(`เพิ่มลูกค้า ${customer.name} แล้ว`);
          }}
        />
      ) : null}
    </div>
  );
}
