import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RouteFooter } from "./_components/RouteFooter";
import { SiteHeader } from "./_components/SiteHeader";

export const metadata: Metadata = {
  title: {
    default: "Meawketting | Pet Passport & Care",
    template: "%s | Meawketting",
  },
  description:
    "ต้นแบบประสบการณ์ Pet Passport และการแชร์ข้อมูลดูแลสัตว์เลี้ยงอย่างพอดีสำหรับแมวและสุนัข",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <a className="skip-link" href="#main-content">
          ข้ามไปยังเนื้อหา
        </a>
        <SiteHeader />
        {children}
        <RouteFooter />
      </body>
    </html>
  );
}
