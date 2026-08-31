import type { ReactNode } from "react";
import { ChevronRight } from "../../_components/icons";

export type BusinessBreadcrumbItem = {
  label: string;
  href?: string;
};

export function BusinessBreadcrumbs({
  items,
  ariaLabel = "ลำดับหน้า",
  className = "",
}: {
  items: readonly BusinessBreadcrumbItem[];
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <nav className={`business-breadcrumbs ${className}`.trim()} aria-label={ariaLabel}>
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`}>
              {index > 0 ? <ChevronRight className="business-breadcrumbs__separator" size={15} aria-hidden="true" /> : null}
              {item.href && !current ? <a href={item.href}>{item.label}</a> : <span aria-current={current ? "page" : undefined}>{item.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function BusinessSidebarSectionHeader({
  title,
  description,
  icon,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`business-sidebar-section-header ${className}`.trim()}>
      {icon ? <span className="business-sidebar-section-header__icon" aria-hidden="true">{icon}</span> : null}
      <span>
        <strong>{title}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </header>
  );
}
