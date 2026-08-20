"use client";

import { useState } from "react";
import Image from "next/image";
import { PawPrint } from "../../_components/icons";

export function PetPhoto({ src, name, className = "" }: { src: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className={`pet-photo pet-photo--fallback ${className}`} role="img" aria-label={`ยังไม่มีรูปของ ${name}`}>
        <PawPrint size={32} weight="bold" />
      </span>
    );
  }
  return <Image className={`pet-photo ${className}`} src={src} alt={`รูปของ ${name}`} width={144} height={164} unoptimized onError={() => setFailed(true)} />;
}
