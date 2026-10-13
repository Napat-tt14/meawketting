"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Be1ClientError, ensureBusinessSession } from "../../_backend/be1/client";
import { BusinessRequestError } from "../../_backend/shared/client";
import { startBusinessRefresh } from "../../_backend/shared/refresh";
import { crmScopeKey } from "../../_backend/be8/client";
import { BUSINESS_FIXTURE_TEST_MODE } from "../../_prototype/fixtureRuntime";
import { readActiveBusinessContext } from "../../_prototype/businessState";
import { BusinessAlert, BusinessLoadingScene } from "./BusinessFeedback";
import { businessStartupPages, ensureBusinessPageData, isBusinessPagePrepared, isBusinessWorkspacePrepared, prepareBusinessWorkspace } from "./businessPageData";
import { useBusinessContext } from "./useBusinessContext";
import { BusinessMobileNavigation } from "./BusinessMobileNavigation";
import { BusinessNavigation } from "./BusinessNavigation";

export function BusinessPortalFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const publicBusinessRoute = pathname === "/business" || pathname === "/business/login" || pathname === "/business/register" || pathname === "/business/setup";
  const { context } = useBusinessContext(!publicBusinessRoute);
  const [loaded, setLoaded] = useState<{ key: string; status: "ready" | "error" | "auth" } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [, setPreparationRevision] = useState(0);
  const scopeKey = crmScopeKey(context);
  const loadKey = `${pathname}:${scopeKey}:${attempt}`;
  const loadState = loaded?.key === loadKey ? loaded.status : isBusinessPagePrepared(pathname, context) ? "ready" : "loading";
  const workspacePrepared = isBusinessWorkspacePrepared(context);

  useEffect(() => {
    if (publicBusinessRoute) return;
    let active = true;
    const controller = new AbortController();
    void ensureBusinessSession(attempt > 0)
      .then(async () => {
        if (!active) return;
        const current = readActiveBusinessContext();
        const currentScope = crmScopeKey(current);
        if (!currentScope) throw new Be1ClientError("FORBIDDEN", "ยังไม่มีสาขาที่เปิดใช้งานได้");
        if (!scopeKey || currentScope !== scopeKey) return;
        try { await ensureBusinessPageData(pathname, current, controller.signal); }
        catch (error) {
          // A foreground read can share a prefetch that was cancelled when the tab hid.
          if (!(error instanceof Error) || error.name !== "AbortError" || controller.signal.aborted) throw error;
          await ensureBusinessPageData(pathname, current, controller.signal);
        }
        if (active) setLoaded({ key: loadKey, status: "ready" });
      })
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
  }, [publicBusinessRoute, pathname, loadKey, attempt, scopeKey]);

  useEffect(() => {
    if (publicBusinessRoute || !scopeKey || !workspacePrepared || BUSINESS_FIXTURE_TEST_MODE) return;
    const current = readActiveBusinessContext();
    if (crmScopeKey(current) !== scopeKey) return;
    const prefetchedRoutes = new Set<string>();
    const refresh = startBusinessRefresh(async signal => {
      for (const href of businessStartupPages(current)) {
        signal.throwIfAborted();
        // Vinext accepts "full"; Next's compatibility type represents it as a string enum.
        if (!prefetchedRoutes.has(href)) { router.prefetch(href, { kind: "full" } as Parameters<typeof router.prefetch>[1]); prefetchedRoutes.add(href); }
      }
      await prepareBusinessWorkspace(current, signal, () => setPreparationRevision(value => value + 1));
    }, { businessId: current.businessId, targets: [] });
    return refresh.stop;
  }, [publicBusinessRoute, scopeKey, workspacePrepared, router]);

  if (publicBusinessRoute) return <>{children}</>;

  return (
    <div className="business-app-frame">
      <BusinessNavigation />
      <div key={scopeKey ?? context.key} className="business-app-frame__content business-route-stage">
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
