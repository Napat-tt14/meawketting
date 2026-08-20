import type { ReactNode } from "react";
import { BottomNavigation } from "../../_components/BottomNavigation";

export function ConsumerShell({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <div className="consumer-bottom-nav" aria-label="เมนูด้านล่างสำหรับมือถือ">
        <BottomNavigation context="consumer" />
      </div>
    </>
  );
}
