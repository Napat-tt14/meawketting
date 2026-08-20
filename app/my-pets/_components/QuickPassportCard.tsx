"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { ConsumerPet } from "../../_prototype/consumerPets";
import { PassportCard, savePassportAsImage } from "../../_components/PassportCard";
import { ArrowClockwise, Barcode, Clock, Save, Share } from "../../_components/icons";
import { speciesLabel } from "../../_prototype/consumerPets";

const QUICK_QR_LIFETIME = 5 * 60 * 1000;

function PassportBarcode({ value, label }: { value: string; label: string }) {
  const bars = useMemo(() => {
    let cursor = 8;
    return value.split("").flatMap((character, index) => {
      const widths = [1, (character.charCodeAt(0) % 3) + 1, 1, (index % 2) + 1];
      return widths.map((width, part) => {
        const bar = { x: cursor, width: width * 3 };
        cursor += width * 3 + (part === widths.length - 1 ? 3 : 2);
        return bar;
      });
    });
  }, [value]);

  return (
    <svg className="quick-barcode" viewBox="0 0 240 82" role="img" aria-label={label}>
      <title>{label}</title>
      <rect width="240" height="82" rx="8" fill="white" />
      {bars.map((bar, index) => <rect key={`${bar.x}-${index}`} x={bar.x % 226 + 7} y="8" width={bar.width} height="48" fill="var(--ink)" />)}
      <text x="120" y="72" textAnchor="middle" fill="var(--ink)" fontSize="10" fontFamily="Noto Sans Thai, sans-serif" letterSpacing="2">{value}</text>
    </svg>
  );
}

export function QuickPassportCard({ pet }: { pet: ConsumerPet }) {
  const [flipped, setFlipped] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saveState, setSaveState] = useState<"idle" | "error">("idle");
  const [shareState, setShareState] = useState<"idle" | "shared" | "error">("idle");
  const style = pet.passportStyle ?? "classic";
  const passportId = pet.passportId ?? `PET-${pet.prototypeSlug.toUpperCase()}`;

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const remaining = Math.max(0, (expiresAt ?? 0) - now);
  const remainingLabel = `${String(Math.floor(remaining / 60000)).padStart(2, "0")}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`;
  const qrValue = useMemo(() => `https://meawketting.local/quick-passport/${pet.prototypeSlug}?scope=passport-safe&expires=${expiresAt ?? "pending"}`, [expiresAt, pet.prototypeSlug]);

  function flipPassport() {
    if (!flipped && (!expiresAt || remaining === 0)) {
      const nextNow = Date.now();
      setNow(nextNow);
      setExpiresAt(nextNow + QUICK_QR_LIFETIME);
    }
    setFlipped((current) => !current);
  }

  function renewQr() {
    const nextNow = Date.now();
    setNow(nextNow);
    setExpiresAt(nextNow + QUICK_QR_LIFETIME);
  }

  async function saveImage() {
    setSaveState("idle");
    try {
      const saved = await savePassportAsImage({ style, photoSrc: pet.photoSrc, name: pet.name, speciesLabel: speciesLabel(pet.species), passportId });
      setSaveState(saved ? "idle" : "error");
    } catch {
      setSaveState("error");
    }
  }

  async function sharePassport() {
    setShareState("idle");
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Passport ของ ${pet.name}`, text: `Passport ของ ${pet.name}`, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setShareState("shared");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareState("error");
    }
  }

  return (
    <section className="quick-passport-section" aria-labelledby="quick-passport-heading">
      <div className="quick-passport-section__heading">
        <div><p className="consumer-kicker">My Passport</p><h2 id="quick-passport-heading">Passport ของ {pet.name}</h2></div>
      </div>
      <div className={`quick-passport${flipped ? " is-flipped" : ""}`}>
        <div className="quick-passport__inner">
          <div className="quick-passport__face quick-passport__front" aria-hidden={flipped}>
            <PassportCard style={style} photoSrc={pet.photoSrc} name={pet.name} speciesLabel={speciesLabel(pet.species)} passportId={passportId} status={pet.prototypeSlug === "claimed-local" ? "claimed" : "draft"} />
          </div>
          <div className="quick-passport__face quick-passport__back" aria-hidden={!flipped}>
            {remaining > 0 ? (
              <div className="quick-qr-code-grid">
                <button className="quick-qr-block" type="button" onClick={flipPassport} aria-label="แตะ QR เพื่อพลิกกลับ"><QRCodeSVG value={qrValue} size={220} level="M" marginSize={2} title={`Quick Passport QR ของ ${pet.name}`} /></button>
                <div className="quick-barcode-block"><span><Barcode size={17} weight="bold" /> Barcode</span><PassportBarcode value={passportId} label={`Barcode ของ ${pet.name}`} /></div>
              </div>
            ) : (
              <div className="quick-qr-expired"><Clock size={38} weight="bold" /><strong>Expired</strong><span>QR หมดเวลาแล้ว</span><button className="button button--primary" type="button" onClick={(event) => { event.stopPropagation(); renewQr(); }}>Regenerate QR · สร้างใหม่</button></div>
            )}
            <div className="quick-qr-meta">
              <span className="quick-qr-countdown"><Clock size={17} weight="bold" /> {remainingLabel}</span>
              <button className="quick-qr-refresh" type="button" onClick={(event) => { event.stopPropagation(); renewQr(); }}>
                <ArrowClockwise size={16} weight="bold" /> รีเฟรช QR
              </button>
            </div>
          </div>
        </div>
        <button className="quick-passport__trigger" type="button" onClick={flipPassport} aria-pressed={flipped} aria-label={flipped ? "แตะเพื่อพลิกการ์ด" : "แตะเพื่อดู Quick Passport QR"} />
      </div>
      <div className="quick-passport__actions">
        <button className="button button--primary" type="button" onClick={() => void sharePassport()}><Share size={18} weight="bold" /> แชร์ Passport</button>
        <button className="button button--paper" type="button" onClick={() => void saveImage()}><Save size={18} weight="bold" /> บันทึกภาพ</button>
      </div>
      <p className="quick-passport__status" role="status" aria-live="polite">
        {shareState === "shared" ? "พร้อมแชร์ Passport" : shareState === "error" ? "แชร์ไม่สำเร็จ ลองอีกครั้ง" : saveState === "error" ? "บันทึกภาพไม่สำเร็จ ลองอีกครั้ง" : ""}
      </p>
    </section>
  );
}
