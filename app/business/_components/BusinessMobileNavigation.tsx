"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDemoBusinessContextDetails, getEnabledBusinessModules } from "../../_prototype/businessState";
import { getPrototypeInboxUnreadCount } from "../../_prototype/inboxState";
import { CalendarDays, House, List, MessageCircle, Scan, UsersRound, X } from "../../_components/icons";
import { BusinessDocumentLink as Link } from "./BusinessDocumentLink";
import {
  BUSINESS_CALENDAR_DESTINATION,
  BUSINESS_CUSTOMERS_DESTINATION,
  BUSINESS_MANAGEMENT_DESTINATIONS,
  BUSINESS_MESSAGES_DESTINATION,
} from "./businessNavigationModel";
import { PlannedBusinessDestination, PlannedBusinessModule } from "./BusinessNavigation";
import { useBusinessContext, useBusinessStateReady } from "./useBusinessContext";

export function BusinessMobileNavigation() {
  const pathname = usePathname();
  const { context, revision } = useBusinessContext();
  const stateReady = useBusinessStateReady();
  const details = getDemoBusinessContextDetails(context);
  const enabledModules = getEnabledBusinessModules(context);
  const unreadCount = getPrototypeInboxUnreadCount(context, !stateReady);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus());
    function handleKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeys);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeys);
    };
  }, [close, open]);

  void revision;

  return (
    <>
      <nav className="business-mobile-navigation" aria-label="เมนูหลักสำหรับธุรกิจบนมือถือ">
        <Link className={`business-mobile-navigation__item${pathname === "/business/home" ? " is-active" : ""}`} href="/business/home" aria-current={pathname === "/business/home" ? "page" : undefined}>
          <House size={20} /><span>หน้าหลัก</span>
        </Link>
        <Link
          className={`business-mobile-navigation__item${pathname === BUSINESS_CALENDAR_DESTINATION.href ? " is-active" : ""}`}
          href={BUSINESS_CALENDAR_DESTINATION.href}
          aria-current={pathname === BUSINESS_CALENDAR_DESTINATION.href ? "page" : undefined}
        >
          <CalendarDays size={20} /><span>{BUSINESS_CALENDAR_DESTINATION.label}</span>
        </Link>
        <Link className={`business-mobile-navigation__item business-mobile-navigation__item--scan${pathname === "/business/scan" || pathname.startsWith("/business/intake/") ? " is-active" : ""}`} href="/business/scan" aria-current={pathname === "/business/scan" ? "page" : undefined}>
          <Scan size={20} /><span>สแกน</span>
        </Link>
        <a
          className={`business-mobile-navigation__item${pathname.startsWith(BUSINESS_MESSAGES_DESTINATION.href) ? " is-active" : ""}`}
          href={BUSINESS_MESSAGES_DESTINATION.href}
          aria-current={pathname.startsWith(BUSINESS_MESSAGES_DESTINATION.href) ? "page" : undefined}
        >
          <MessageCircle size={20} /><span>{BUSINESS_MESSAGES_DESTINATION.label}</span>
          {unreadCount > 0 ? <span className="business-mobile-unread-badge" aria-label={`ข้อความใหม่ ${unreadCount} ข้อความ`}>{unreadCount}</span> : null}
        </a>
        <button ref={triggerRef} className={`business-mobile-navigation__item${open ? " is-active" : ""}`} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          <List size={20} /><span>เพิ่มเติม</span>
        </button>
      </nav>

      {open ? (
        <>
          <button className="business-more-sheet__backdrop" type="button" aria-label="ปิดเมนูเพิ่มเติม" onClick={close} />
          <section ref={panelRef} className="business-more-sheet" role="dialog" aria-modal="true" aria-label="เมนูธุรกิจเพิ่มเติม">
            <header>
              <div><small>{details.business?.name}</small><strong>{details.branch?.name}</strong></div>
              <button type="button" aria-label="ปิดเมนูเพิ่มเติม" onClick={close}><X size={20} /></button>
            </header>
            <div className="business-more-sheet__content">
              <p className="business-more-sheet__label">เมนูเพิ่มเติม</p>
              <Link
                className={`business-nav-item business-nav-item--sheet${pathname === BUSINESS_CUSTOMERS_DESTINATION.href || pathname.startsWith("/business/customers/") ? " is-active" : ""}`}
                href={BUSINESS_CUSTOMERS_DESTINATION.href}
                aria-current={pathname === BUSINESS_CUSTOMERS_DESTINATION.href || pathname.startsWith("/business/customers/") ? "page" : undefined}
                onClick={close}
              >
                <UsersRound size={19} />
                <span>{BUSINESS_CUSTOMERS_DESTINATION.label}</span>
              </Link>
              <div className="business-more-sheet__group">
                <p>งานบริการ · ยังไม่เปิดใช้</p>
                {enabledModules.map((module) => <PlannedBusinessModule key={module} module={module} className="business-nav-item--sheet" />)}
              </div>
              <div className="business-more-sheet__group business-more-sheet__group--management">
                <p>ยังไม่เปิดใช้</p>
                {BUSINESS_MANAGEMENT_DESTINATIONS.map((item) => (
                  <PlannedBusinessDestination key={item.key} destinationKey={item.key} label={item.label} className="business-nav-item--sheet" />
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
