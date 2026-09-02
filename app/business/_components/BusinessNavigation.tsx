"use client";

import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import type { BusinessServiceModule } from "../../_prototype/businessState";
import { getEnabledBusinessModules } from "../../_prototype/businessState";
import { getPrototypeInboxUnreadCount } from "../../_prototype/inboxState";
import { BusinessDocumentLink as Link } from "./BusinessDocumentLink";
import {
  BedDouble,
  CalendarDays,
  Chart,
  House,
  MessageCircle,
  PawPrint,
  Scissors,
  Settings,
  UserRoundCheck,
  UsersRound,
  Wallet,
} from "../../_components/icons";
import { BrandMark } from "../../_components/BrandMark";
import {
  BUSINESS_MANAGEMENT_DESTINATIONS,
  BUSINESS_BILLING_DESTINATION,
  BUSINESS_GROOMING_DESTINATION,
  BUSINESS_HOTEL_DESTINATION,
  BUSINESS_MODULE_LABELS,
  BUSINESS_TOP_DESTINATIONS,
  type BusinessDestinationKey,
  type BusinessLiveDestination,
  type BusinessPlannedDestinationKey,
} from "./businessNavigationModel";
import { useBusinessContext, useBusinessStateReady } from "./useBusinessContext";
import { BusinessContextSwitcher } from "./BusinessContextSwitcher";
import { BusinessSidebarSectionHeader } from "./BusinessNavigationPrimitives";

const DESTINATION_ICONS: Record<BusinessDestinationKey, IconType> = {
  calendar: CalendarDays,
  customers: UsersRound,
  messages: MessageCircle,
  grooming: Scissors,
  hotel: BedDouble,
  billing: Wallet,
  reports: Chart,
  team: UserRoundCheck,
  settings: Settings,
};

const MODULE_ICONS: Record<BusinessServiceModule, IconType> = {
  grooming: Scissors,
  hotel: BedDouble,
  daycare: PawPrint,
};

export function PlannedBusinessDestination({
  destinationKey,
  label,
  className = "",
}: {
  destinationKey: BusinessPlannedDestinationKey;
  label: string;
  className?: string;
}) {
  const Icon = DESTINATION_ICONS[destinationKey];
  return (
    <button className={`business-nav-item business-nav-item--planned ${className}`.trim()} type="button" disabled aria-disabled="true">
      <Icon size={19} />
      <span>{label}</span>
      <small>ยังไม่เปิดใช้</small>
    </button>
  );
}

export function LiveBusinessDestination({
  destination,
  active,
  badge = 0,
}: {
  destination: BusinessLiveDestination;
  active: boolean;
  badge?: number;
}) {
  const Icon = DESTINATION_ICONS[destination.key];
  const content = (
    <>
      <Icon size={19} />
      <span>{destination.label}</span>
      {badge > 0 ? <span className="business-nav-unread-badge" aria-label={`ข้อความใหม่ ${badge} ข้อความ`}>{badge}</span> : null}
    </>
  );
  if (destination.key === "messages") {
    return (
      <a
        className={`business-nav-item${active ? " is-active" : ""}`}
        href={destination.href}
        aria-current={active ? "page" : undefined}
      >
        {content}
      </a>
    );
  }
  return (
    <Link
      className={`business-nav-item${active ? " is-active" : ""}`}
      href={destination.href}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </Link>
  );
}

export function PlannedBusinessModule({ module, className = "" }: { module: BusinessServiceModule; className?: string }) {
  const Icon = MODULE_ICONS[module];
  return (
    <button className={`business-nav-item business-nav-item--planned ${className}`.trim()} type="button" disabled aria-disabled="true">
      <Icon size={19} />
      <span>{BUSINESS_MODULE_LABELS[module]}</span>
      <small>ยังไม่เปิดใช้</small>
    </button>
  );
}

export function BusinessNavigation() {
  const pathname = usePathname();
  const { context, revision } = useBusinessContext();
  const stateReady = useBusinessStateReady();
  const enabledModules = getEnabledBusinessModules(context);
  const unreadCount = getPrototypeInboxUnreadCount(context, !stateReady);
  void revision;

  return (
    <aside className="business-desktop-navigation" aria-label="เมนูหลักสำหรับธุรกิจ">
      <div className="business-navigation__identity">
        <BrandMark href="/business/home" ariaLabel="Meawketting หน้าหลักธุรกิจ" />
        <BusinessContextSwitcher />
      </div>
      <nav>
        <Link className={`business-nav-item${pathname === "/business/home" ? " is-active" : ""}`} href="/business/home" aria-current={pathname === "/business/home" ? "page" : undefined}>
          <House size={19} />
          <span>หน้าหลัก</span>
        </Link>
        {BUSINESS_TOP_DESTINATIONS.map((item) => (
          <LiveBusinessDestination
            key={item.key}
            destination={item}
            active={pathname === item.href || (item.key === "customers" && pathname.startsWith("/business/customers/")) || (item.key === "messages" && pathname.startsWith("/business/inbox"))}
            badge={item.key === "messages" ? unreadCount : 0}
          />
        ))}
        <LiveBusinessDestination
          destination={BUSINESS_BILLING_DESTINATION}
          active={pathname === BUSINESS_BILLING_DESTINATION.href}
        />
        <div className="business-nav-group business-nav-group--services" aria-label="งานบริการ">
          <BusinessSidebarSectionHeader title="งานบริการ" />
          {enabledModules.map((module) => (
            module === "grooming" ? (
              <LiveBusinessDestination
                key={module}
                destination={BUSINESS_GROOMING_DESTINATION}
                active={pathname === BUSINESS_GROOMING_DESTINATION.href}
              />
            ) : module === "hotel" ? (
              <LiveBusinessDestination
                key={module}
                destination={BUSINESS_HOTEL_DESTINATION}
                active={pathname === BUSINESS_HOTEL_DESTINATION.href}
              />
            ) : <PlannedBusinessModule key={module} module={module} />
          ))}
        </div>

        <div className="business-nav-group business-nav-group--management" aria-label="เมนูธุรกิจที่ยังไม่เปิดใช้">
          <BusinessSidebarSectionHeader title="ยังไม่เปิดใช้" />
          {BUSINESS_MANAGEMENT_DESTINATIONS.map((item) => (
            <PlannedBusinessDestination key={item.key} destinationKey={item.key} label={item.label} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
