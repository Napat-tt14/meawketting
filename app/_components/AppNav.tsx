"use client";

import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import { BellRinging, House, MessageCircle, PawPrint, QrCode, Storefront, Swatches } from "./icons";

export type AppNavMode = "public" | "consumer";

type AppNavProps = {
  mode?: AppNavMode;
  mobile?: boolean;
  showLogin?: boolean;
  showBusinessEntry?: boolean;
};

type AppNavItem = {
  href?: string;
  label: string;
  icon: IconType;
  disabled?: boolean;
};

const appNavItems: AppNavItem[] = [
  { href: "/", label: "หน้าแรก", icon: House },
  { href: "/passports", label: "Passport 6 แบบ", icon: Swatches },
  { href: "/qr-preview", label: "ทดลองสแกน QR", icon: QrCode },
];

const consumerNavItems: AppNavItem[] = [
  { label: "หน้าหลัก", icon: House, disabled: true },
  { href: "/my-pets", label: "สัตว์เลี้ยง", icon: PawPrint },
  { href: "/activity", label: "กิจกรรม", icon: BellRinging },
  { label: "ข้อความ", icon: MessageCircle, disabled: true },
];

export function AppNav({ mode = "public", mobile = false, showLogin = false, showBusinessEntry = false }: AppNavProps) {
  const pathname = usePathname();
  const ariaLabel = mode === "consumer"
    ? "เมนูผู้ดูแลสัตว์เลี้ยง"
    : "เมนูหลัก";
  const navItems = mode === "consumer" ? consumerNavItems : appNavItems;

  return (
    <nav
      className={`app-nav app-nav--${mode}${mobile ? " app-nav--mobile" : ""}`}
      aria-label={ariaLabel}
    >
      {navItems.map(({ href, label, icon: Icon, disabled }) => {
        const active = href === "/"
          ? pathname === "/"
          : href === "/my-pets"
            ? pathname === "/my-pets" || pathname.startsWith("/my-pets/")
            : href ? pathname === href || pathname.startsWith(`${href}/`) : false;
        const className = `app-nav__link${active ? " is-active" : ""}${disabled ? " app-nav__link--disabled" : ""}`;
        if (disabled) {
          return (
            <button key={label} className={className} type="button" aria-disabled="true" aria-label={`${label} — เร็ว ๆ นี้`} disabled title="เร็ว ๆ นี้">
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        }
        return (
          <a
            key={href ?? label}
            className={className}
            href={href}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={17} />
            <span>{label}</span>
          </a>
        );
      })}
      {showLogin ? (
        <a className="app-nav__link app-nav__link--login" href="/login">
          <span>เข้าสู่ระบบ</span>
        </a>
      ) : null}
      {showBusinessEntry && mode === "public" ? (
        <a className="app-nav__link app-nav__link--business-entry" href="/business">
          <Storefront size={17} />
          <span>สำหรับธุรกิจ</span>
        </a>
      ) : null}
    </nav>
  );
}
