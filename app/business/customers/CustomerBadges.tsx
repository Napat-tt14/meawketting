import type { BusinessLocalPetRelationship } from "../../_prototype/businessState";
import { BadgeCheck, Clock, Info, LockKey } from "../../_components/icons";
import { passportConnectionPresentation, petDataSourceLabel } from "./customerPresentation";

export function DataSourceLabel({ pet }: { pet: BusinessLocalPetRelationship }) {
  return <span className="customer-source-label"><Info size={15} />{petDataSourceLabel(pet.dataSource)}</span>;
}

export function PassportConnectionStatus({
  pet,
  compact = false,
}: {
  pet: BusinessLocalPetRelationship;
  compact?: boolean;
}) {
  const presentation = passportConnectionPresentation(pet.passportConnection);
  const Icon = presentation.tone === "active"
    ? BadgeCheck
    : presentation.tone === "limited"
      ? BadgeCheck
      : presentation.tone === "expired"
        ? Clock
        : LockKey;
  const compactLabel = presentation.tone === "active"
    ? "ยืนยันแล้ว"
    : presentation.tone === "limited"
      ? "เชื่อม Passport"
      : presentation.tone === "expired"
        ? "สิทธิ์หมดอายุ"
        : "ยังไม่ได้เชื่อม";

  return (
    <span
      className={`passport-connection passport-connection--${presentation.tone}${compact ? " passport-connection--compact" : ""}`}
      aria-label={compact ? `${presentation.label} · ${presentation.detail}` : undefined}
    >
      <Icon size={16} />
      <span><strong>{compact ? compactLabel : presentation.label}</strong>{!compact ? <small>{presentation.detail}</small> : null}</span>
    </span>
  );
}
