import { CircleDashed } from "../../_components/icons";

export function FlowLoading({ label = "กำลังเปิด Draft ในเบราว์เซอร์นี้" }: { label?: string }) {
  return (
    <div className="flow-loading-card" role="status" aria-live="polite">
      <CircleDashed size={24} weight="bold" />
      <span>{label}</span>
    </div>
  );
}

