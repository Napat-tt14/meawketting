import type { ReactNode, TableHTMLAttributes } from "react";

export function BusinessDataTable({
  caption,
  children,
  compact = false,
  className = "",
  ...tableProps
}: TableHTMLAttributes<HTMLTableElement> & {
  caption: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`business-data-table${compact ? " business-data-table--compact" : ""} ${className}`.trim()}>
      <table {...tableProps}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
