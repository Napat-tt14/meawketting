import type { PetLifecycle } from "../../_prototype/consumerPets";
import { Archive, BadgeCheck, CircleOff, Flower, ShieldAlert } from "../../_components/icons";

const statusContent = {
  active: { label: "กำลังดูแล", Icon: BadgeCheck },
  lost: { label: "กำลังตามหา", Icon: ShieldAlert },
  memorial: { label: "ในความทรงจำ", Icon: Flower },
  archived: { label: "เก็บถาวร", Icon: Archive },
  transferred: { label: "โอนการดูแลแล้ว", Icon: CircleOff },
} as const;

export function PetStatus({ lifecycle, prominent = false }: { lifecycle: PetLifecycle; prominent?: boolean }) {
  const { label, Icon } = statusContent[lifecycle];
  return (
    <span className={`pet-status pet-status--${lifecycle}${prominent ? " pet-status--prominent" : ""}`}>
      <Icon size={18} weight="bold" />
      {label}
    </span>
  );
}
