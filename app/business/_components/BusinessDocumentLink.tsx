import type { AnchorHTMLAttributes, ReactNode } from "react";

type BusinessDocumentLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * Keep business navigation reliable while vinext's beta RSC client-navigation
 * shim is unavailable. Session-backed prototype data survives document loads.
 */
export function BusinessDocumentLink({ href, children, ...props }: BusinessDocumentLinkProps) {
  return <a href={href} {...props}>{children}</a>;
}
