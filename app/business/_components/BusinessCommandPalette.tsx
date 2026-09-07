"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getEnabledBusinessModules } from "../../_prototype/businessState";
import { Search, X } from "../../_components/icons";
import { BusinessDocumentLink as Link } from "./BusinessDocumentLink";
import { useBusinessContext, useBusinessStateReady } from "./useBusinessContext";

type BusinessCommand = {
  label: string;
  detail: string;
  href: string;
};

const BUSINESS_COMMANDS: readonly BusinessCommand[] = [
  { label: "หน้าหลัก", detail: "ภาพรวมร้านและงานวันนี้", href: "/business/home" },
  { label: "ปฏิทิน", detail: "ดูและจัดการการจอง", href: "/business/calendar" },
  { label: "ลูกค้าและสัตว์เลี้ยง", detail: "ค้นหาข้อมูลลูกค้า", href: "/business/customers" },
  { label: "ข้อความ", detail: "คุยกับเจ้าของสัตว์เลี้ยง", href: "/business/inbox" },
  { label: "การเงิน", detail: "ตรวจยอด รับชำระ และดูรายรับ", href: "/business/billing" },
  { label: "รายงาน", detail: "ภาพรวมธุรกิจ ยอดขาย และประสิทธิภาพ", href: "/business/reports" },
  { label: "ทีม", detail: "ดูทีม งาน และความพร้อมของสาขา", href: "/business/team" },
  { label: "สแกนรับเข้า", detail: "ตรวจสิทธิ์ก่อนเปิดข้อมูล", href: "/business/scan" },
  { label: "ตั้งค่า", detail: "จัดการข้อมูลร้าน สาขา บริการ และเวลาทำการ", href: "/business/settings" },
];

const BUSINESS_MODULE_COMMANDS = {
  grooming: { label: "อาบน้ำ / ตัดขน", detail: "จัดการคิวและงานบริการ", href: "/business/grooming" },
  hotel: { label: "โรงแรม", detail: "จัดการการเข้าพัก ห้อง และงานดูแล", href: "/business/hotel" },
  daycare: { label: "Daycare", detail: "จัดการรับเข้า โซน และกิจกรรมระหว่างวัน", href: "/business/daycare" },
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("th-TH");
}

export function BusinessCommandPalette() {
  const { context, revision } = useBusinessContext();
  const stateReady = useBusinessStateReady();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const commands = useMemo(
    () => {
      void revision;
      return [...BUSINESS_COMMANDS, ...getEnabledBusinessModules(context, !stateReady).map((module) => BUSINESS_MODULE_COMMANDS[module])];
    },
    [context, revision, stateReady],
  );

  const visibleCommands = useMemo(() => {
    const search = normalize(query);
    if (!search) return commands;
    return commands.filter((command) => normalize(`${command.label} ${command.detail}`).includes(search));
  }, [commands, query]);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    function openWithShortcut(event: globalThis.KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
      if (event.defaultPrevented || [...document.querySelectorAll('[aria-modal="true"]')].some((dialog) => dialog.getClientRects().length > 0 && dialog !== panelRef.current)) return;
      event.preventDefault();
      setOpen(true);
    }
    document.addEventListener("keydown", openWithShortcut);
    return () => document.removeEventListener("keydown", openWithShortcut);
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    function handlePanelKeys(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePalette();
        return;
      }
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && panelRef.current) {
        const links = [...panelRef.current.querySelectorAll<HTMLAnchorElement>(".business-command-palette__results a[href]")];
        if (!links.length) return;
        event.preventDefault();
        const current = links.findIndex((link) => link === document.activeElement);
        const next = event.key === "ArrowDown" ? (current + 1) % links.length : (current <= 0 ? links.length - 1 : current - 1);
        links[next]?.focus();
        return;
      }
      if (event.key === "Enter" && document.activeElement === inputRef.current) {
        const firstResult = panelRef.current?.querySelector<HTMLAnchorElement>(".business-command-palette__results a[href]");
        if (firstResult) {
          event.preventDefault();
          firstResult.click();
        }
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>("input, a[href], button:not([disabled])")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handlePanelKeys);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handlePanelKeys);
    };
  }, [closePalette, open]);

  return (
    <div ref={rootRef} className="business-command-palette">
      <button
        ref={triggerRef}
        className="business-command-palette__trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="business-command-palette-panel"
        aria-label="เปิดการค้นหา"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => setOpen((current) => !current)}
      >
        <Search size={18} />
        <span>ค้นหา</span>
        <kbd>Ctrl K</kbd>
      </button>

      {open ? (
        <>
          <button className="business-command-palette__backdrop" type="button" tabIndex={-1} aria-label="ปิดการค้นหา" onClick={closePalette} />
          <div id="business-command-palette-panel" ref={panelRef} className="business-command-palette__panel" role="dialog" aria-modal="true" aria-label="ค้นหาในระบบ">
            <header className="business-command-palette__header">
              <div><strong>ไปที่หน้า</strong><small>ค้นหาเมนูด้วยคำค้น หรือกด Ctrl K</small></div>
              <button type="button" aria-label="ปิดการค้นหา" onClick={closePalette}><X size={19} /></button>
            </header>
            <label className="business-command-palette__input">
              <Search size={18} />
              <span className="sr-only">ค้นหาเมนู</span>
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="ค้นหาหน้าหรือการทำงาน" />
              <kbd>Esc</kbd>
            </label>
            <nav className="business-command-palette__results" aria-label="ผลการค้นหา">
              {visibleCommands.length > 0 ? visibleCommands.map((command) => (
                <Link key={command.href} href={command.href} onClick={closePalette}>
                  <span><strong>{command.label}</strong><small>{command.detail}</small></span>
                  <span aria-hidden="true">↵</span>
                </Link>
              )) : <p className="business-command-palette__empty">ไม่พบหน้าที่ค้นหา</p>}
            </nav>
            <footer className="business-command-palette__footer"><span><kbd>↑</kbd><kbd>↓</kbd> เลือก</span><span><kbd>Enter</kbd> เปิด</span><span><kbd>Esc</kbd> ปิด</span></footer>
          </div>
        </>
      ) : null}
    </div>
  );
}
