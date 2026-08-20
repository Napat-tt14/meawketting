"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoBusinessContext } from "../../_prototype/businessState";
import {
  DEMO_BUSINESS_CONTEXTS,
  getDemoBusinessContextDetails,
  readActiveBusinessContext,
} from "../../_prototype/businessState";
import { ChevronDown, LogOut, Storefront, UserRoundCheck, X } from "../../_components/icons";

export function BusinessUserMenu() {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<DemoBusinessContext>(DEMO_BUSINESS_CONTEXTS[0]);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const details = getDemoBusinessContextDetails(context);

  const closeMenu = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    const refresh = () => setContext(readActiveBusinessContext());
    const frame = window.requestAnimationFrame(refresh);
    window.addEventListener("meawketting:business-state", refresh);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("meawketting:business-state", refresh);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button, a")?.focus());
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu();
    }
    function handlePanelKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
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
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", handlePanelKeys);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", handlePanelKeys);
    };
  }, [closeMenu, open]);

  return (
    <div ref={rootRef} className="business-user-menu">
      <button
        ref={triggerRef}
        className="business-user-menu__trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="เปิดเมนูบัญชีร้าน"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="business-user-menu__icon"><UserRoundCheck size={20} weight="bold" /></span>
        <span className="business-user-menu__summary">
          <strong>{context.role}</strong>
          <small>บัญชีทีมร้าน · ตัวอย่าง</small>
        </span>
        <ChevronDown size={17} weight="bold" />
      </button>
      {open ? (
        <>
          <button className="business-user-menu__backdrop" type="button" aria-label="ปิดเมนูบัญชีร้าน" onClick={closeMenu} />
          <div ref={panelRef} className="business-user-menu__panel" role="dialog" aria-modal="true" aria-label="บัญชีร้าน">
            <header><strong>บัญชีร้าน</strong><button type="button" aria-label="ปิดเมนูบัญชีร้าน" onClick={closeMenu}><X size={20} weight="bold" /></button></header>
            <section className="business-user-menu__context" aria-label="ร้านและสิทธิ์ปัจจุบัน">
              <span><Storefront size={20} weight="bold" /><span><small>ร้านและสาขา</small><strong>{details.business?.name}<br />{details.branch?.name}</strong></span></span>
              <span><UserRoundCheck size={20} weight="bold" /><span><small>หน้าที่ปัจจุบัน</small><strong>{context.role}</strong></span></span>
            </section>
            <button className="business-user-menu__signout" type="button" onClick={() => window.location.assign("/business/login")}><LogOut size={18} weight="bold" /> ออกจากระบบตัวอย่าง</button>
          </div>
        </>
      ) : null}
    </div>
  );
}
