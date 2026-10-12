import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { IconType } from "react-icons";
import { CheckCircle, CircleAlert, Info, PawPrint, Storefront, TriangleAlert } from "../../_components/icons";

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

export function BusinessLoadingScene({ titleId, title = "กำลังเตรียมพื้นที่ของคุณ" }: { titleId?: string; title?: string }) {
  return <div className="business-loading-scene" role="status" aria-live="polite">
    <div className="business-loading-scene__art" aria-hidden="true">
      <span className="business-loading-scene__halo" />
      <span className="business-loading-scene__shop"><Storefront size={42} weight="duotone" /></span>
      <span className="business-loading-scene__paw"><PawPrint size={22} weight="fill" /></span>
      <span className="business-loading-scene__paw"><PawPrint size={18} weight="fill" /></span>
      <span className="business-loading-scene__paw"><PawPrint size={24} weight="fill" /></span>
    </div>
    <h1 id={titleId}>{title}</h1>
    <p>เตรียมพื้นที่ให้คุณและเพื่อนตัวเล็ก สักครู่นะ</p>
    <span className="business-loading-scene__dots" aria-hidden="true"><i /><i /><i /></span>
  </div>;
}
