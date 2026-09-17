"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Be1ClientError, ensureBusinessSession } from "../../_backend/be1/client";
import { BUSINESS_FIXTURE_TEST_MODE } from "../../_prototype/fixtureRuntime";
import { BusinessAlert, BusinessProgress } from "./BusinessFeedback";
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
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "auth">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (publicBusinessRoute) return;
    let active = true;
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
      .then(() => { if (active) setLoadState("ready"); })
      .catch((error: unknown) => {
        if (active) setLoadState(error instanceof Be1ClientError && ["AUTHENTICATION_NOT_CONFIGURED", "UNAUTHENTICATED"].includes(error.code) ? "auth" : "error");
      });
    return () => { active = false; };
  }, [publicBusinessRoute, attempt]);

  if (publicBusinessRoute) return <>{children}</>;

  return (
    <div className="business-app-frame">
      <BusinessNavigation />
      <div key={pathname} className="business-app-frame__content business-route-stage">
        {BUSINESS_FIXTURE_TEST_MODE || loadState === "ready" ? children : (
          <section id="main-content" tabIndex={-1} className="business-shell shell" aria-busy={loadState === "loading"}>
            <h1>{loadState === "loading" ? "กำลังโหลดข้อมูลร้าน" : loadState === "auth" ? "ยังไม่สามารถเข้าสู่ระบบได้" : "โหลดข้อมูลร้านไม่สำเร็จ"}</h1>
            {loadState === "loading" ? <BusinessProgress indeterminate label="กำลังโหลดข้อมูลร้าน" /> : (
              <BusinessAlert tone="critical" title={loadState === "auth" ? "ระบบเข้าสู่ระบบสำหรับธุรกิจยังไม่พร้อมใช้งาน" : "ยังแสดงข้อมูลร้านไม่ได้ กรุณาลองอีกครั้ง"}
                actions={<><button className="button button--business" type="button" onClick={() => { setLoadState("loading"); setAttempt((value) => value + 1); }}>ลองอีกครั้ง</button><a className="button button--ghost" href="/business/login">กลับหน้าเข้าสู่ระบบ</a></>} />
            )}
          </section>
        )}
      </div>
      <BusinessMobileNavigation />
    </div>
  );
}
