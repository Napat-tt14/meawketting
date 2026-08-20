"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDemoBusinessContextDetails, getEnabledBusinessModules } from "../../_prototype/businessState";
import { CalendarDays, House, List, MessageCircle, Scan, X } from "../../_components/icons";
import {
  BUSINESS_CALENDAR_DESTINATION,
  BUSINESS_MANAGEMENT_DESTINATIONS,
  BUSINESS_TOP_DESTINATIONS,
  type BusinessPlannedDestination,
} from "./businessNavigationModel";
import { PlannedBusinessDestination, PlannedBusinessModule } from "./BusinessNavigation";
import { useBusinessContext } from "./useBusinessContext";

export function BusinessMobileNavigation() {
  const pathname = usePathname();
  const { context } = useBusinessContext();
  const details = getDemoBusinessContextDetails(context);
  const enabledModules = getEnabledBusinessModules(context);
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

  const messages = BUSINESS_TOP_DESTINATIONS.find((item): item is BusinessPlannedDestination => item.key === "messages");
  const customers = BUSINESS_TOP_DESTINATIONS.find((item): item is BusinessPlannedDestination => item.key === "customers");

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
        <button className="business-mobile-navigation__item is-disabled" type="button" disabled aria-disabled="true">
          <MessageCircle size={20} /><span>ข้อความ</span>
        </button>
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
              {customers ? <PlannedBusinessDestination destinationKey={customers.key} label={customers.label} className="business-nav-item--sheet" /> : null}
              <div className="business-more-sheet__group">
                <p>งานบริการของสาขานี้</p>
                {enabledModules.map((module) => <PlannedBusinessModule key={module} module={module} className="business-nav-item--sheet" />)}
              </div>
              {BUSINESS_MANAGEMENT_DESTINATIONS.map((item) => (
                <PlannedBusinessDestination key={item.key} destinationKey={item.key} label={item.label} className="business-nav-item--sheet" />
              ))}
              {messages ? <span className="sr-only">{messages.label} อยู่ในเมนูหลักและยังไม่เปิดใช้</span> : null}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
