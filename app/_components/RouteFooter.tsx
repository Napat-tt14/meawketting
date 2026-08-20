"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./SiteFooter";

const fullFooterRoutes = new Set(["/"]);

export function RouteFooter() {
  const pathname = usePathname();

  return fullFooterRoutes.has(pathname) ? <SiteFooter /> : null;
}
