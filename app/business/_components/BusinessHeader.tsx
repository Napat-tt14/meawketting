"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Scan, Storefront } from "../../_components/icons";
import { BrandMark } from "../../_components/BrandMark";
import { BusinessContextSwitcher } from "./BusinessContextSwitcher";
import { BusinessUserMenu } from "./BusinessUserMenu";

type BusinessHeaderProps = {
  variant: "landing" | "auth" | "app";
};

export function BusinessHeader({ variant }: BusinessHeaderProps) {
  const pathname = usePathname();
  const scannerActive = pathname === "/business/scan" || pathname.startsWith("/business/intake/");

  return (
    <header className={`business-header business-header--${variant}`}>
      <div className="business-header__inner shell">
        <div className="business-brand">
          <BrandMark href="/" ariaLabel="Meawketting Business หน้าแรก" />
          <span>Business</span>
        </div>
        {variant === "landing" ? (
          <nav className="business-header__nav" aria-label="เมนูหลักสำหรับธุรกิจ">
            <Link href="#business-core">ระบบ</Link>
            <Link href="#services">บริการสำหรับธุรกิจ</Link>
            <Link href="#guardian">สำหรับเจ้าของสัตว์เลี้ยง</Link>
          </nav>
        ) : null}
        {variant === "app" ? (
          <div className="business-header__context"><BusinessContextSwitcher /></div>
        ) : null}
        {variant === "auth" ? (
          <span className="business-header__descriptor"><Storefront size={18} weight="bold" /> ระบบสำหรับร้านและทีมดูแลสัตว์</span>
        ) : null}
        <div className="business-header__actions">
          {variant === "landing" ? (
            <>
              <Link className="business-header__login" href="/login">เข้าสู่ระบบ</Link>
              <Link className="button button--business" href="/business/login" aria-label="เข้าสู่ระบบสำหรับธุรกิจ">
                <span className="business-header__cta-full">เข้าสู่ระบบสำหรับธุรกิจ</span>
                <span className="business-header__cta-short">เข้าสู่ระบบธุรกิจ</span>
              </Link>
            </>
          ) : null}
          {variant === "auth" ? <Link className="button button--business-ghost" href="/"><ArrowLeft size={18} weight="bold" /> กลับหน้าสำหรับธุรกิจ</Link> : null}
          {variant === "app" ? (
            <>
              <Link className={`business-header__scan${scannerActive ? " is-active" : ""}`} href="/business/scan" aria-current={pathname === "/business/scan" ? "page" : undefined}>
                <Scan size={18} weight="bold" /> <span>สแกนรับเข้า</span>
              </Link>
              <BusinessUserMenu />
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
