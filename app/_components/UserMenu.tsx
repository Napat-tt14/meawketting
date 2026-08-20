"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { IconType } from "react-icons";
import { ChevronDown, LogOut, UserRound, X } from "./icons";

type UserMenuProps = {
  className?: string;
  authenticated?: boolean;
  displayName?: string;
  onLogout?: () => void;
};

type UserMenuItem = {
  label: string;
  icon: IconType;
  href?: string;
  action?: "logout";
};

type UserMenuGroup = {
  label: string;
  items: UserMenuItem[];
};

export function UserMenu({
  className = "",
  authenticated = false,
  displayName,
  onLogout,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutside(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    const focusFrame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    });

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function closeAndRestoreFocus() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!panelRef.current) return;
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
    if (focusable.length === 0) return;
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      focusable[(currentIndex + direction + focusable.length) % focusable.length]?.focus();
    }

    if (event.key === "Tab") {
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function handleLogout() {
    setOpen(false);
    if (onLogout) {
      onLogout();
      return;
    }
    window.location.assign("/login");
  }

  if (!authenticated) {
    return (
      <div className={`user-menu user-menu--signed-out${className ? ` ${className}` : ""}`}>
        <a className="user-menu__business-entry" href="/business">สำหรับธุรกิจ</a>
        <a className="user-menu__login" href="/login">Login</a>
        <a className="button button--primary user-menu__create-cta" href="/create-passport">Create Passport</a>
      </div>
    );
  }

  const groups: UserMenuGroup[] = [
    {
      label: "Session",
      items: [{ label: "Sign out", icon: LogOut, action: "logout" }],
    },
  ];

  return (
    <div ref={menuRef} className={`user-menu user-menu--signed-in${className ? ` ${className}` : ""}`}>
      <button
        ref={triggerRef}
        className="user-menu__trigger"
        type="button"
        aria-label={displayName ? `Open ${displayName} account menu` : "Open account menu"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="user-menu__avatar"><UserRound size={20} weight="bold" /></span>
        {displayName ? <span className="user-menu__name">{displayName}</span> : null}
        <ChevronDown className="user-menu__chevron" size={17} weight="bold" aria-hidden="true" />
      </button>
      {open ? (
        <>
          <button className="user-menu__backdrop" type="button" aria-label="Close account menu" onClick={closeAndRestoreFocus} />
          <div ref={panelRef} className="user-menu__panel" role="menu" aria-label="Account menu" tabIndex={-1} onKeyDown={handleMenuKeyDown}>
            <div className="user-menu__sheet-header">
              <strong>Account</strong>
              <button className="user-menu__sheet-close" type="button" aria-label="Close account menu" onClick={closeAndRestoreFocus}>
                <X size={20} weight="bold" />
              </button>
            </div>
            <div className="user-menu__account-summary" role="group" aria-label="Account identity">
              <span className="user-menu__account-summary-avatar"><UserRound size={20} weight="bold" /></span>
              <span className="user-menu__account-summary-copy">
                <strong>{displayName ?? "บัญชีผู้ดูแลสัตว์เลี้ยง"}</strong>
                <small>บัญชีผู้ดูแลสัตว์เลี้ยง</small>
              </span>
            </div>
            {groups.map((group) => (
              <section key={group.label} className="user-menu__group" aria-labelledby={`user-menu-${group.label.toLowerCase()}`}>
                <h2 id={`user-menu-${group.label.toLowerCase()}`} className="user-menu__group-label">{group.label}</h2>
                {group.items.map(({ href, label, icon: Icon, action }) => action === "logout" ? (
                  <button key={action} type="button" role="menuitem" onClick={handleLogout}>
                    <Icon size={18} weight="bold" /> {label}
                  </button>
                ) : (
                  <a key={href} href={href} role="menuitem" onClick={() => setOpen(false)}>
                    <Icon size={18} weight="bold" /> {label}
                  </a>
                ))}
              </section>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
