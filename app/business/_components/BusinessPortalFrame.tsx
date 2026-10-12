"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Be1ClientError, ensureBusinessSession } from "../../_backend/be1/client";
import { BusinessRequestError } from "../../_backend/shared/client";
import { BUSINESS_FIXTURE_TEST_MODE } from "../../_prototype/fixtureRuntime";
import { readActiveBusinessContext } from "../../_prototype/businessState";
import { BusinessAlert, BusinessLoadingScene } from "./BusinessFeedback";
import { ensureBusinessPageData } from "./businessPageData";
import { useBusinessContext } from "./useBusinessContext";
import { BusinessMobileNavigation } from "./BusinessMobileNavigation";
import { BusinessNavigation } from "./BusinessNavigation";

export function BusinessPortalFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicBusinessRoute = pathname === "/business" || pathname === "/business/login" || pathname === "/business/register" || pathname === "/business/setup";
  const { context } = useBusinessContext(!publicBusinessRoute);
  const [loaded, setLoaded] = useState<{ key: string; status: "ready" | "error" | "auth" } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadKey = `${pathname}:${context.key}:${attempt}`;
  const loadState = loaded?.key === loadKey ? loaded.status : "loading";

  useEffect(() => {
    if (publicBusinessRoute) return;
    let active = true;
    const controller = new AbortController();
    void ensureBusinessSession(attempt > 0)
      .then(() => { if (active) return ensureBusinessPageData(pathname, readActiveBusinessContext(), controller.signal); })
      .then(() => { if (active) setLoaded({ key: loadKey, status: "ready" }); })
      .catch(async (error: unknown) => {
        if (!active) return;
        if ((error instanceof Be1ClientError || error instanceof BusinessRequestError) && error.code === "UNAUTHENTICATED") {
          window.location.replace("/business/login"); return;
        }
        if (error instanceof Be1ClientError && error.code === "FORBIDDEN") {
          try {
            const response = await fetch("/api/business/register", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(20_000) });
            if (response.ok && !(await response.json() as { registered: boolean }).registered) {
              if (active) window.location.replace("/business/setup"); return;
            }
          } catch { /* The retry state below handles unavailable account status. */ }
        }
        if (active) setLoaded({ key: loadKey, status: error instanceof Be1ClientError && ["AUTHENTICATION_NOT_CONFIGURED", "UNAUTHENTICATED"].includes(error.code) ? "auth" : "error" });
      });
    return () => { active = false; controller.abort(); };
  }, [publicBusinessRoute, pathname, loadKey, attempt]);

  if (publicBusinessRoute) return <>{children}</>;

  return (
    <div className="business-app-frame">
      <BusinessNavigation />
      <div key={`${pathname}:${context.key}`} className="business-app-frame__content business-route-stage">
        {BUSINESS_FIXTURE_TEST_MODE || loadState === "ready" ? children : (
          <section id="main-content" tabIndex={-1} className="business-shell shell" aria-busy={loadState === "loading"}>
            {loadState === "loading" ? <BusinessLoadingScene title="กำลังโหลดข้อมูลร้าน" /> : <>
              <h1>{loadState === "auth" ? "ยังไม่สามารถเข้าสู่ระบบได้" : "โหลดข้อมูลร้านไม่สำเร็จ"}</h1>
              <BusinessAlert tone="critical" title={loadState === "auth" ? "ระบบเข้าสู่ระบบสำหรับธุรกิจยังไม่พร้อมใช้งาน" : "ยังแสดงข้อมูลร้านไม่ได้ กรุณาลองอีกครั้ง"}
                actions={<><button className="button button--business" type="button" onClick={() => setAttempt((value) => value + 1)}>ลองอีกครั้ง</button><a className="button button--ghost" href="/business/login">กลับหน้าเข้าสู่ระบบ</a></>} />
            </>}
          </section>
        )}
      </div>
      <BusinessMobileNavigation />
    </div>
  );
}
