"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ensureBusinessSession } from "../../_backend/be1/client";
import { ensureDurableCustomerDirectory } from "../../_backend/be2/client";
import { ensureDurableOperations } from "../../_backend/be4/client";
import { ensureDurableInbox } from "../../_backend/be6/client";
import { ensureDurableBilling } from "../../_backend/be7/client";
import { ensureDurableReport } from "../../_backend/be8/client";
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
        ...workspace.permittedBranches.map(async (branch) => {
          await ensureDurableBookingCatalog(workspace.business.id, branch.id);
          await ensureDurableOperations(workspace.business.id, branch.id);
          await ensureDurableInbox(workspace.business.id, branch.id);
          await ensureDurableBilling(workspace.business.id, branch.id);
          await ensureDurableReport({ businessId: workspace.business.id, branchId: branch.id });
        }),
      ])))
      .catch(() => {
        // Keep the shell renderable on a failed load. Protected operations
        // remain empty until an authorized backend response is available.
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
