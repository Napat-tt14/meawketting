"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDemoBusinessContextDetails, getEnabledBusinessModules } from "../../_prototype/businessState";
import { getPrototypeInboxUnreadCount } from "../../_prototype/inboxState";
import { BedDouble, CalendarDays, Chart, House, List, MessageCircle, PawPrint, Scan, Scissors, Settings, UserRoundCheck, UsersRound, Wallet, X } from "../../_components/icons";
import { BusinessDocumentLink as Link } from "./BusinessDocumentLink";
import {
  BUSINESS_CALENDAR_DESTINATION,
  BUSINESS_BILLING_DESTINATION,
  BUSINESS_CUSTOMERS_DESTINATION,
  BUSINESS_DAYCARE_DESTINATION,
  BUSINESS_GROOMING_DESTINATION,
  BUSINESS_HOTEL_DESTINATION,
  BUSINESS_MESSAGES_DESTINATION,
  BUSINESS_REPORTS_DESTINATION,
  BUSINESS_SETTINGS_DESTINATION,
  BUSINESS_TEAM_DESTINATION,
} from "./businessNavigationModel";
import { useBusinessContext, useBusinessStateReady } from "./useBusinessContext";

export function BusinessMobileNavigation() {
  const pathname = usePathname();
  const { context, revision } = useBusinessContext();
  const stateReady = useBusinessStateReady();
  const details = getDemoBusinessContextDetails(context, !stateReady);
  const enabledModules = getEnabledBusinessModules(context, !stateReady);
  const unreadCount = getPrototypeInboxUnreadCount(context, !stateReady);
  const [open, setOpen] = useState(false);
  const moreActive = [BUSINESS_CUSTOMERS_DESTINATION, BUSINESS_BILLING_DESTINATION, BUSINESS_REPORTS_DESTINATION, BUSINESS_TEAM_DESTINATION, BUSINESS_SETTINGS_DESTINATION, BUSINESS_GROOMING_DESTINATION, BUSINESS_HOTEL_DESTINATION, BUSINESS_DAYCARE_DESTINATION]
    .some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
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
        <Link className={`business-mobile-navigation__item business-mobile-navigation__item--scan${pathname === "/business/scan" || pathname.startsWith("/business/intake/") ? " is-active" : ""}`} href="/business/scan" aria-current={pathname === "/business/scan" || pathname.startsWith("/business/intake/") ? "page" : undefined}>
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
        <button ref={triggerRef} className={`business-mobile-navigation__item${open || moreActive ? " is-active" : ""}`} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          <List size={20} /><span>เพิ่มเติม</span>
        </button>
      </nav>

      {open ? (
        <>
          <button className="business-more-sheet__backdrop" type="button" tabIndex={-1} aria-label="ปิดเมนูเพิ่มเติม" onClick={close} />
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
              <Link
                className={`business-nav-item business-nav-item--sheet${pathname === BUSINESS_BILLING_DESTINATION.href ? " is-active" : ""}`}
                href={BUSINESS_BILLING_DESTINATION.href}
                aria-current={pathname === BUSINESS_BILLING_DESTINATION.href ? "page" : undefined}
                onClick={close}
              >
                <Wallet size={19} />
                <span>{BUSINESS_BILLING_DESTINATION.label}</span>
              </Link>
              <Link
                className={`business-nav-item business-nav-item--sheet${pathname === BUSINESS_REPORTS_DESTINATION.href ? " is-active" : ""}`}
                href={BUSINESS_REPORTS_DESTINATION.href}
                aria-current={pathname === BUSINESS_REPORTS_DESTINATION.href ? "page" : undefined}
                onClick={close}
              >
                <Chart size={19} />
                <span>{BUSINESS_REPORTS_DESTINATION.label}</span>
              </Link>
              <Link
                className={`business-nav-item business-nav-item--sheet${pathname === BUSINESS_TEAM_DESTINATION.href ? " is-active" : ""}`}
                href={BUSINESS_TEAM_DESTINATION.href}
                aria-current={pathname === BUSINESS_TEAM_DESTINATION.href ? "page" : undefined}
                onClick={close}
              >
                <UserRoundCheck size={19} />
                <span>{BUSINESS_TEAM_DESTINATION.label}</span>
              </Link>
              <div className="business-more-sheet__group">
                <p>งานบริการ</p>
                {enabledModules.map((module) => (
                  module === "grooming" ? (
                    <Link
                      key={module}
                      className={`business-nav-item business-nav-item--sheet${pathname === BUSINESS_GROOMING_DESTINATION.href ? " is-active" : ""}`}
                      href={BUSINESS_GROOMING_DESTINATION.href}
                      aria-current={pathname === BUSINESS_GROOMING_DESTINATION.href ? "page" : undefined}
                      onClick={close}
                    >
                      <Scissors size={19} />
                      <span>{BUSINESS_GROOMING_DESTINATION.label}</span>
                    </Link>
                  ) : module === "hotel" ? (
                    <Link
                      key={module}
                      className={`business-nav-item business-nav-item--sheet${pathname === BUSINESS_HOTEL_DESTINATION.href ? " is-active" : ""}`}
                      href={BUSINESS_HOTEL_DESTINATION.href}
                      aria-current={pathname === BUSINESS_HOTEL_DESTINATION.href ? "page" : undefined}
                      onClick={close}
                    >
                      <BedDouble size={19} />
                      <span>{BUSINESS_HOTEL_DESTINATION.label}</span>
                    </Link>
                  ) : (
                    <Link
                      key={module}
                      className={`business-nav-item business-nav-item--sheet${pathname === BUSINESS_DAYCARE_DESTINATION.href ? " is-active" : ""}`}
                      href={BUSINESS_DAYCARE_DESTINATION.href}
                      aria-current={pathname === BUSINESS_DAYCARE_DESTINATION.href ? "page" : undefined}
                      onClick={close}
                    >
                      <PawPrint size={19} />
                      <span>{BUSINESS_DAYCARE_DESTINATION.label}</span>
                    </Link>
                  )
                ))}
              </div>
              <div className="business-more-sheet__group business-more-sheet__group--management">
                <p>จัดการร้าน</p>
                <Link
                  className={`business-nav-item business-nav-item--sheet${pathname === BUSINESS_SETTINGS_DESTINATION.href ? " is-active" : ""}`}
                  href={BUSINESS_SETTINGS_DESTINATION.href}
                  aria-current={pathname === BUSINESS_SETTINGS_DESTINATION.href ? "page" : undefined}
                  onClick={close}
                >
                  <Settings size={19} />
                  <span>{BUSINESS_SETTINGS_DESTINATION.label}</span>
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
