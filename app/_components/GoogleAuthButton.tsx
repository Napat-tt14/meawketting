"use client";

import { ChevronRight, Google } from "./icons";

type GoogleAuthButtonProps = {
  busy: boolean;
  onClick: () => void;
  className?: string;
};

export function GoogleAuthButton({ busy, onClick, className = "" }: GoogleAuthButtonProps) {
  return (
    <button
      className={`button button--google button--large${className ? ` ${className}` : ""}`}
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
    >
      <Google size={20} aria-hidden="true" />
      {busy ? "กำลังเข้าสู่ระบบ" : "ดำเนินการต่อด้วย Google"}
      <ChevronRight size={18} weight="bold" />
    </button>
  );
}
