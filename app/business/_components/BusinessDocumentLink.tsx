"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { BUSINESS_NAVIGATION_HREFS } from "./businessNavigationModel";

type BusinessDocumentLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

export function BusinessDocumentLink({ href, children, ...props }: BusinessDocumentLinkProps) {
  return <Link href={href} prefetch={BUSINESS_NAVIGATION_HREFS.includes(href)} {...props}>{children}</Link>;
}
