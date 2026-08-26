import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  BUSINESS_SERVICE_MODULES,
  type BusinessServiceModule,
} from "../../_prototype/businessState";
import { BedDouble, PawPrint, Scissors } from "../../_components/icons";

const SERVICE_ICONS: Record<BusinessServiceModule, IconType> = {
  grooming: Scissors,
  hotel: BedDouble,
  daycare: PawPrint,
};

export function BusinessServiceIcon({
  module,
  size = 20,
  label,
  className = "",
}: {
  module: BusinessServiceModule;
  size?: number;
  label?: string;
  className?: string;
}) {
  const Icon = SERVICE_ICONS[module];
  return (
    <span
      className={`business-service-icon business-service-icon--${module} ${className}`.trim()}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Icon size={size} />
    </span>
  );
}

export function BusinessServiceIdentity({
  module,
  label = BUSINESS_SERVICE_MODULES[module].label,
  detail,
  compact = false,
}: {
  module: BusinessServiceModule;
  label?: ReactNode;
  detail?: ReactNode;
  compact?: boolean;
}) {
  return (
    <span className={`business-service-identity business-service-identity--${module}${compact ? " is-compact" : ""}`}>
      <BusinessServiceIcon module={module} size={compact ? 18 : 20} />
      <span>
        <strong>{label}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
    </span>
  );
}
