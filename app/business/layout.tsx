import { BusinessPortalFrame } from "./_components/BusinessPortalFrame";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <BusinessPortalFrame>{children}</BusinessPortalFrame>;
}
