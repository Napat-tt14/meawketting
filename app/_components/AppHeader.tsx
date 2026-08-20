"use client";

import { ArrowLeft, IdentificationCard, List, PawPrint } from "./icons";
import { AppNav, type AppNavMode } from "./AppNav";
import { BrandMark } from "./BrandMark";
import { UserMenu } from "./UserMenu";

export type AppHeaderVariant = "public" | "consumer" | "flow" | "auth";

type AppHeaderProps = {
  variant?: AppHeaderVariant;
  flowTitle?: string;
  flowDescription?: string;
  flowExitHref?: string;
  flowExitLabel?: string;
  displayName?: string;
  onLogout?: () => void;
};

const flowDefaults = {
  flow: {
    title: "กำลังทำ Passport",
    description: "ค่อย ๆ เติมรายละเอียดของน้องได้เลย",
    exitHref: "/",
    exitLabel: "ออกจากขั้นตอน",
  },
  auth: {
    title: "เข้าสู่ระบบ",
    description: "บันทึก Passport ของน้องไว้ดูต่อได้ทุกเมื่อ",
    exitHref: "/",
    exitLabel: "กลับหน้าแรก",
  },
} as const;

function MobileNav({ mode, flow = false, showLogin }: { mode: AppNavMode; flow?: boolean; showLogin?: boolean }) {
  return (
    <details className={flow ? "flow-header__menu" : "mobile-nav"}>
      <summary aria-label="เปิดเมนูเว็บไซต์">
        <List size={24} weight="bold" />
      </summary>
      <div className={flow ? "flow-header__menu-panel" : "mobile-nav__panel"}>
        <span className={flow ? "flow-header__menu-title" : "mobile-nav__label"}>
          {flow ? <IdentificationCard size={16} weight="bold" /> : <PawPrint size={16} weight="fill" />}
          {flow ? "ไปที่" : "เมนู"}
        </span>
        <AppNav mode={mode} mobile showLogin={showLogin ?? mode === "public"} showBusinessEntry={mode === "public" && !flow} />
      </div>
    </details>
  );
}

export function AppHeader({
  variant = "public",
  flowTitle,
  flowDescription,
  flowExitHref,
  flowExitLabel,
  displayName,
  onLogout,
}: AppHeaderProps) {
  if (variant === "flow" || variant === "auth") {
    const defaults = flowDefaults[variant];
    return (
      <header className={`site-header site-header--flow${variant === "auth" ? " site-header--auth" : ""}`}>
        <div className="flow-header shell">
          <BrandMark />
          <span className="flow-header__context">
            <IdentificationCard size={18} weight="bold" />
            <span>
              <strong>{flowTitle ?? defaults.title}</strong>
              <small>{flowDescription ?? defaults.description}</small>
            </span>
          </span>
          <a className="button button--ghost flow-header__exit" href={flowExitHref ?? defaults.exitHref}>
            <ArrowLeft size={18} weight="bold" />
            {flowExitLabel ?? defaults.exitLabel}
          </a>
          <MobileNav mode="public" flow showLogin={variant !== "auth"} />
        </div>
      </header>
    );
  }

  const consumer = variant === "consumer";
  const mode: AppNavMode = consumer ? "consumer" : "public";
  return (
    <header className={`site-header${consumer ? " site-header--consumer" : ""}`}>
      <div className="site-header__inner shell">
        <BrandMark />
        <AppNav mode={mode} />
        <div className="header-actions">
          <UserMenu
            authenticated={consumer}
            displayName={displayName}
            onLogout={onLogout}
          />
        </div>
        <MobileNav mode={mode} />
      </div>
    </header>
  );
}
