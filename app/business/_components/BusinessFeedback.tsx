import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { IconType } from "react-icons";
import { CheckCircle, CircleAlert, Info, TriangleAlert } from "../../_components/icons";

type BusinessAlertTone = "success" | "warning" | "critical" | "info";

const alertIcons: Record<BusinessAlertTone, IconType> = {
  success: CheckCircle,
  warning: TriangleAlert,
  critical: CircleAlert,
  info: Info,
};

export function BusinessAlert({
  tone = "info",
  title,
  children,
  actions,
  className = "",
  role,
  ...attributes
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  tone?: BusinessAlertTone;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const AlertIcon = alertIcons[tone];
  return (
    <section className={`business-alert business-alert--${tone} ${className}`.trim()} role={role ?? (tone === "critical" || tone === "warning" ? "alert" : "status")} {...attributes}>
      <AlertIcon className="business-alert__icon" size={20} aria-hidden="true" />
      <div className="business-alert__content">
        <strong className="business-alert__title">{title}</strong>
        {children ? <div className="business-alert__description">{children}</div> : null}
        {actions ? <div className="business-alert__actions">{actions}</div> : null}
      </div>
    </section>
  );
}

export function BusinessProgress({
  value,
  label,
  indeterminate = false,
  className = "",
}: {
  value?: number;
  label: string;
  indeterminate?: boolean;
  className?: string;
}) {
  const normalizedValue = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div
      className={`business-progress${indeterminate ? " business-progress--indeterminate" : ""} ${className}`.trim()}
      role="progressbar"
      aria-label={label}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : normalizedValue}
    >
      <span className="business-progress__value" style={indeterminate ? undefined : { "--business-progress-value": `${normalizedValue}%` } as CSSProperties} />
    </div>
  );
}

export function BusinessSkeleton({
  variant,
  className = "",
}: {
  variant?: string;
  className?: string;
}) {
  return <span className={`business-skeleton${variant ? ` business-skeleton--${variant}` : ""} ${className}`.trim()} aria-hidden="true" />;
}
