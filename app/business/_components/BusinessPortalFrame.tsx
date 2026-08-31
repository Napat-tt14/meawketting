"use client";

import { usePathname } from "next/navigation";
import { BusinessMobileNavigation } from "./BusinessMobileNavigation";
import { BusinessNavigation } from "./BusinessNavigation";

export function BusinessPortalFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicBusinessRoute = pathname === "/business" || pathname === "/business/login";

  if (publicBusinessRoute) return <>{children}</>;

  return (
    <div className="business-app-frame">
      <BusinessNavigation />
      <div key={pathname} className="business-app-frame__content business-route-stage">{children}</div>
      <BusinessMobileNavigation />
    </div>
  );
}
