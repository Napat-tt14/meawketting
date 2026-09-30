"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "./AppHeader";
import { BusinessHeader } from "../business/_components/BusinessHeader";

export function SiteHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/create-passport")) {
    return <AppHeader variant="flow" />;
  }

  if (pathname === "/" || pathname === "/business") return <BusinessHeader variant="landing" />;
  if (["/business/login", "/business/register", "/privacy", "/terms"].includes(pathname)) return <BusinessHeader variant="auth" />;
  if (pathname.startsWith("/business/")) return <BusinessHeader variant="app" />;
  if (pathname === "/activity" || pathname.startsWith("/my-pets")) return <AppHeader variant="consumer" displayName="มิว" />;
  return <AppHeader variant="public" />;
}
