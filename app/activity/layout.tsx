import { ConsumerShell } from "../my-pets/_components/ConsumerShell";

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return <ConsumerShell>{children}</ConsumerShell>;
}
