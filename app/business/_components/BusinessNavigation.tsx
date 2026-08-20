"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import type { BusinessServiceModule } from "../../_prototype/businessState";
import { getEnabledBusinessModules } from "../../_prototype/businessState";
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
import {
  BUSINESS_MANAGEMENT_DESTINATIONS,
  BUSINESS_MODULE_LABELS,
  BUSINESS_TOP_DESTINATIONS,
  type BusinessDestinationKey,
  type BusinessLiveDestination,
  type BusinessPlannedDestinationKey,
} from "./businessNavigationModel";
import { useBusinessContext } from "./useBusinessContext";

const DESTINATION_ICONS: Record<BusinessDestinationKey, IconType> = {
  calendar: CalendarDays,
  customers: UsersRound,
  messages: MessageCircle,
  finance: Wallet,
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
      <small>เร็ว ๆ นี้</small>
    </button>
  );
}

export function LiveBusinessDestination({
  destination,
  active,
}: {
  destination: BusinessLiveDestination;
  active: boolean;
}) {
  const Icon = DESTINATION_ICONS[destination.key];
  return (
    <Link
      className={`business-nav-item${active ? " is-active" : ""}`}
      href={destination.href}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={19} />
      <span>{destination.label}</span>
    </Link>
  );
}

export function PlannedBusinessModule({ module, className = "" }: { module: BusinessServiceModule; className?: string }) {
  const Icon = MODULE_ICONS[module];
  return (
    <button className={`business-nav-item business-nav-item--planned ${className}`.trim()} type="button" disabled aria-disabled="true">
      <Icon size={19} />
      <span>{BUSINESS_MODULE_LABELS[module]}</span>
      <small>เร็ว ๆ นี้</small>
    </button>
  );
}

export function BusinessNavigation() {
  const pathname = usePathname();
  const { context } = useBusinessContext();
  const enabledModules = getEnabledBusinessModules(context);

  return (
    <aside className="business-desktop-navigation" aria-label="เมนูหลักสำหรับธุรกิจ">
      <nav>
        <Link className={`business-nav-item${pathname === "/business/home" ? " is-active" : ""}`} href="/business/home" aria-current={pathname === "/business/home" ? "page" : undefined}>
          <House size={19} />
          <span>หน้าหลัก</span>
        </Link>
        {BUSINESS_TOP_DESTINATIONS.map((item) => (
          "href" in item
            ? <LiveBusinessDestination key={item.key} destination={item} active={pathname === item.href} />
            : <PlannedBusinessDestination key={item.key} destinationKey={item.key} label={item.label} />
        ))}

        <div className="business-nav-group" aria-label="งานบริการที่สาขาเปิดใช้">
          <p>งานบริการ</p>
          {enabledModules.map((module) => <PlannedBusinessModule key={module} module={module} />)}
        </div>

        <div className="business-nav-group business-nav-group--management" aria-label="จัดการธุรกิจ">
          {BUSINESS_MANAGEMENT_DESTINATIONS.map((item) => (
            <PlannedBusinessDestination key={item.key} destinationKey={item.key} label={item.label} />
          ))}
        </div>
      </nav>
      <p className="business-navigation__prototype-note">ต้นแบบในเบราว์เซอร์ · ไม่มีสิทธิ์สมาชิกจริง</p>
    </aside>
  );
}
