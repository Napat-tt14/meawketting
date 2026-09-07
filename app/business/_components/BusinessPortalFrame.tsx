"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ensureBusinessSession } from "../../_backend/be1/client";
import { ensureDurableCustomerDirectory } from "../../_backend/be2/client";
import {
  ensureDurableBookingCatalog,
  ensureDurableBookingDirectory,
} from "../../_backend/be3/client";
import { BusinessMobileNavigation } from "./BusinessMobileNavigation";
import { BusinessNavigation } from "./BusinessNavigation";

export function BusinessPortalFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicBusinessRoute = pathname === "/business" || pathname === "/business/login";

  useEffect(() => {
    if (publicBusinessRoute) return;
    void ensureBusinessSession()
      .then((session) => Promise.all(session.workspaces.flatMap((workspace) => [
        ensureDurableCustomerDirectory(workspace.business.id),
        ensureDurableBookingDirectory(workspace.business.id),
        ...workspace.permittedBranches.map((branch) => (
          ensureDurableBookingCatalog(workspace.business.id, branch.id)
        )),
      ])))
      .catch(() => {
        // Explicit DEV/TEST fixtures keep the frozen shell renderable while
        // local D1 is unavailable. No fallback mutation is accepted.
      });
  }, [publicBusinessRoute]);

  if (publicBusinessRoute) return <>{children}</>;

  return (
    <div className="business-app-frame">
      <BusinessNavigation />
      <div key={pathname} className="business-app-frame__content business-route-stage">{children}</div>
      <BusinessMobileNavigation />
    </div>
  );
}
