"use client";

import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import { BellRinging, House, MessageCircle, PawPrint } from "./icons";

export type BottomNavigationContext = "consumer" | "business";

export type BottomNavigationItem = {
  href?: string;
  label: string;
  icon: IconType;
  disabled?: boolean;
  emphasis?: boolean;
};

const consumerItems: readonly BottomNavigationItem[] = [
  { label: "หน้าหลัก", icon: House, disabled: true },
  { href: "/my-pets", label: "สัตว์เลี้ยง", icon: PawPrint },
  { href: "/activity", label: "กิจกรรม", icon: BellRinging },
  { label: "ข้อความ", icon: MessageCircle, disabled: true },
];

const contextItems: Record<BottomNavigationContext, readonly BottomNavigationItem[]> = {
  consumer: consumerItems,
  business: [],
};

type BottomNavigationProps = {
  context?: BottomNavigationContext;
  items?: readonly BottomNavigationItem[];
};

export function BottomNavigation({ context = "consumer", items }: BottomNavigationProps) {
  const pathname = usePathname();
  const navItems = items ?? contextItems[context];

  if (navItems.length === 0) return null;

  const ariaLabel = context === "consumer" ? "เมนูหลักสำหรับผู้ดูแลสัตว์เลี้ยง" : "เมนูหลัก";

  return (
    <nav className={`bottom-navigation bottom-navigation--${context}`} aria-label={ariaLabel}>
      {navItems.map(({ href, label, icon: Icon, disabled, emphasis }) => {
        const active = href === "/"
          ? pathname === "/"
          : href === "/my-pets"
            ? pathname === "/my-pets" || pathname.startsWith("/my-pets/")
            : href ? pathname === href || pathname.startsWith(`${href}/`) : false;
        const className = `bottom-navigation__link${active ? " is-active" : ""}${emphasis ? " bottom-navigation__link--emphasis" : ""}${disabled ? " bottom-navigation__link--disabled" : ""}`;
        if (disabled) {
          return (
            <button key={label} className={className} type="button" aria-disabled="true" aria-label={`${label} — เร็ว ๆ นี้`} disabled title="เร็ว ๆ นี้">
              <Icon size={21} aria-hidden="true" />
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
            <Icon size={21} />
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
