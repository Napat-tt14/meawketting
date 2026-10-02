import { BusinessPortalFrame } from "./_components/BusinessPortalFrame";
import "./motion.css";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <BusinessPortalFrame>{children}</BusinessPortalFrame>;
}
