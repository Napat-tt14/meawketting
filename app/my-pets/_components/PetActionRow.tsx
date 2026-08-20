"use client";

import type { IconType } from "react-icons";
import { ChevronRight } from "../../_components/icons";

type PetActionRowProps = {
  title: string;
  status: string;
  description: string;
  icon: IconType;
  href?: string;
  onClick?: () => void;
  expanded?: boolean;
  prominent?: boolean;
};

export function PetActionRow({
  title,
  status,
  description,
  icon: Icon,
  href,
  onClick,
  expanded,
  prominent = false,
}: PetActionRowProps) {
  const className = `pet-action-row${prominent ? " pet-action-row--prominent" : ""}${expanded ? " is-expanded" : ""}`;
  const content = (
    <>
      <span className="pet-action-row__icon"><Icon size={22} /></span>
      <span className="pet-action-row__copy">
        <span className="pet-action-row__title"><strong>{title}</strong><small>{status}</small></span>
        <span className="pet-action-row__description">{description}</span>
      </span>
      <ChevronRight className="pet-action-row__chevron" size={20} weight="bold" />
    </>
  );

  if (href) {
    return <a className={className} href={href}>{content}</a>;
  }

  return (
    <button className={className} type="button" onClick={onClick} aria-expanded={expanded}>
      {content}
    </button>
  );
}
