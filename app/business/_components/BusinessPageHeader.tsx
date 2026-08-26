import type { ReactNode } from "react";

export function BusinessPageHeader({
  title,
  context,
  actions,
  className = "",
}: {
  title: ReactNode;
  context?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`business-page-header ${className}`.trim()}>
      <div className="business-page-header__copy">
        <h1>{title}</h1>
        {context ? <div className="business-page-header__context">{context}</div> : null}
      </div>
      {actions ? <div className="business-page-header__actions">{actions}</div> : null}
    </header>
  );
}
