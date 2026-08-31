"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getDemoBusinessContextDetails,
  getDemoBusinessContextForBranch,
  listPrototypeCustomerFixtures,
  listPrototypeCustomers,
  listPrototypeBookingFixtures,
  listPrototypeBookings,
} from "../../_prototype/businessState";
import { BusinessDocumentLink as Link } from "../_components/BusinessDocumentLink";
import { CalendarDays, ChevronRight, Info, Phone, Plus } from "../../_components/icons";
import { useBusinessContext } from "../_components/useBusinessContext";
import { BusinessPageHeader } from "../_components/BusinessPageHeader";
import { CustomerEditor } from "./CustomerEditor";
import { BusinessCustomerAvatar, BusinessPetAvatar } from "../_components/BusinessIdentityAvatar";
import { BusinessServiceIcon } from "../_components/BusinessServiceVisual";
import { BusinessSearchField } from "../_components/BusinessSearchField";
import { BusinessSegmentedControl } from "../_components/BusinessSegmentedControl";
import {
  CUSTOMER_LIST_FILTERS,
  type CustomerListFilter,
  bookingDateLabel,
  customerTagLabel,
  customerMatchesFilter,
  matchesCustomerSearch,
  nextCustomerBooking,
  petSpeciesLabel,
} from "./customerPresentation";

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function CustomersScreen({ focusSearch = false }: { focusSearch?: boolean }) {
  const { context } = useBusinessContext();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CustomerListFilter>("all");
  const [revision, setRevision] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const relationshipStateReady = useIsClient();

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
  const customers = relationshipStateReady
    ? listPrototypeCustomers(context)
    : listPrototypeCustomerFixtures(context);
  const bookings = relationshipStateReady
    ? listPrototypeBookings(null, { includeCancelled: true })
    : listPrototypeBookingFixtures(null, { includeCancelled: true });
  const visibleCustomers = customers.filter((customer) => (
    matchesCustomerSearch(customer, query) && customerMatchesFilter(customer, filter, bookings)
  ));
  return (
    <div className="business-customers shell">
      <BusinessPageHeader
        title="ลูกค้าและสัตว์เลี้ยง"
        actions={<button className="button button--business business-signature-sweep" type="button" onClick={() => { setNotice(null); setEditorOpen(true); }}><Plus size={19} /><span>เพิ่มลูกค้า</span></button>}
      />

      <section className="customer-search-panel" aria-label="ค้นหาและกรองลูกค้า">
        <BusinessSearchField
          ref={searchRef}
          id="customer-search"
          label="ค้นหาลูกค้าและสัตว์เลี้ยง"
          value={query}
          onInput={(event) => setQuery(event.currentTarget.value)}
          placeholder="ค้นหาชื่อลูกค้า ชื่อน้อง หรือเบอร์โทร"
          autoComplete="off"
        />
        <BusinessSegmentedControl
          className="customer-filter-group"
          value={filter}
          options={CUSTOMER_LIST_FILTERS.map((option) => ({
            ...option,
            label: `${option.label} ${customers.filter((customer) => customerMatchesFilter(customer, option.value, bookings)).length}`,
          }))}
          ariaLabel="กรองรายชื่อลูกค้า"
          onChange={setFilter}
        />
      </section>

      {notice ? <p className="business-customers__notice" role="status"><Info size={18} />{notice}</p> : null}

      <section className="customer-results" aria-label="รายชื่อลูกค้า" aria-live="polite">
        <header className="customer-results__heading">
          <h2>ลูกค้า {visibleCustomers.length} ราย</h2>
          {query || filter !== "all" ? <span>จากทั้งหมด {customers.length} ราย</span> : null}
        </header>
        {customers.length === 0 ? (
          <div className="customer-empty-state">
            <div><strong>ยังไม่มีลูกค้าในรายการ</strong><p>เพิ่มลูกค้าและสัตว์เลี้ยงเพื่อใช้กับการจองและงานบริการ</p></div>
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
                const nextBooking = nextCustomerBooking(customer, bookings);
                const nextPet = nextBooking?.pets.find((pet) => customer.pets.some((customerPet) => customerPet.id === pet.id)) ?? null;
                const nextBranch = nextBooking ? getDemoBusinessContextDetails(getDemoBusinessContextForBranch(nextBooking.businessId, nextBooking.branchId)).branch?.name : null;
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
                          <strong>{customer.name}</strong>
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
                      <span className="customer-list-item__activity">
                        <small>นัดถัดไป</small>
                        {nextBooking ? <><strong><BusinessServiceIcon module={nextBooking.serviceModule} size={16} />{nextPet?.name ?? "น้อง"} · {nextBooking.service.label}</strong><span><CalendarDays size={16} />{bookingDateLabel(nextBooking)}{nextBranch ? ` · ${nextBranch}` : ""}</span></> : <strong className="customer-list-item__empty">ยังไม่มีนัดหมาย</strong>}
                      </span>
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

      {editorOpen ? (
        <CustomerEditor
          context={context}
          customer={null}
          onClose={() => setEditorOpen(false)}
          onSaved={(customer) => {
            setEditorOpen(false);
            setNotice(`เพิ่มลูกค้า ${customer.name} แล้ว`);
          }}
        />
      ) : null}
    </div>
  );
}
