import { DraftPassportProvider } from "./DraftPassportContext";

export default function CreatePassportLayout({ children }: { children: React.ReactNode }) {
  return <DraftPassportProvider>{children}</DraftPassportProvider>;
}

