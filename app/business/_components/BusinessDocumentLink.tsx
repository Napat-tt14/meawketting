"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type BusinessDocumentLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

export function BusinessDocumentLink({ href, children, ...props }: BusinessDocumentLinkProps) {
  return <Link href={href} prefetch={false} {...props}>{children}</Link>;
}
