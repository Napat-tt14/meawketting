"use client";

import Image from "next/image";
import type { PassportStyle } from "../create-passport/DraftPassportContext";
import { Camera, PawPrint, QrCode, Sparkle } from "./icons";

export const passportStyles: Array<{ id: PassportStyle; name: string; note: string }> = [
  { id: "classic", name: "Classic", note: "เรียบ สุขุม" },
  { id: "booklet", name: "Booklet", note: "อุ่นใจ อ่านง่าย" },
  { id: "sticker", name: "Sticker Book", note: "สดใส ขี้เล่น" },
  { id: "polaroid", name: "Polaroid", note: "อบอุ่น เป็นกันเอง" },
  { id: "ticket", name: "Retro Ticket", note: "กระชับ พร้อมพก" },
  { id: "japan", name: "Minimal Japan", note: "นิ่ง โปร่ง สบายตา" },
];

type PassportCardProps = {
  style: PassportStyle;
  photoSrc: string | null;
  name: string;
  speciesLabel: string;
  passportId: string;
  status?: "draft" | "claimed";
  compact?: boolean;
  showStatus?: boolean;
};

export function PassportCard({ style, photoSrc, name, speciesLabel, passportId, status = "draft", compact = false, showStatus = true }: PassportCardProps) {
  const styleInfo = passportStyles.find((item) => item.id === style) ?? passportStyles[0];
  return (
    <article className={`share-passport share-passport--${style}${compact ? " is-compact" : ""}`} aria-label={`${styleInfo.name} Pet Passport ของ ${name}`}>
      <span className="share-passport__texture" aria-hidden="true" />
      <header className="share-passport__head">
        <span><PawPrint size={20} weight="fill" /> MEAWKETTING</span>
        <strong>{styleInfo.name}</strong>
        {showStatus ? <span className="share-passport__status">{status === "claimed" ? "CLAIMED" : "DRAFT"}</span> : null}
      </header>
      <div className="share-passport__photo">
        {photoSrc ? <Image src={photoSrc} alt={`รูปของ ${name}`} fill unoptimized sizes="(max-width: 767px) 76vw, 360px" /> : <Camera size={48} weight="bold" />}
      </div>
      <div className="share-passport__identity">
        <span className="share-passport__eyebrow">PET PASSPORT</span>
        <h3>{name}</h3>
        <p>{speciesLabel}</p>
      </div>
      <footer className="share-passport__footer">
        <span><small>Passport no.</small><strong>{passportId}</strong></span>
        <span className="share-passport__seal"><Sparkle size={18} weight="fill" /></span>
        <QrCode size={22} weight="bold" />
      </footer>
    </article>
  );
}

export async function savePassportAsImage({ style, photoSrc, name, speciesLabel, passportId }: Omit<PassportCardProps, "compact">) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) return false;

  const root = getComputedStyle(document.documentElement);
  const palette = getCanvasPalette(style, root);
  context.fillStyle = palette.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = palette.accent;
  context.fillRect(0, 0, canvas.width, 42);
  context.fillStyle = palette.foreground;
  context.font = '700 34px "Noto Sans Thai", sans-serif';
  context.fillText("MEAWKETTING · PET PASSPORT", 82, 118);

  const photoX = 82;
  const photoY = 176;
  const photoWidth = 916;
  const photoHeight = 720;
  context.fillStyle = palette.surface;
  roundRect(context, photoX, photoY, photoWidth, photoHeight, 52);
  context.fill();
  if (photoSrc) {
    const image = await loadCanvasImage(photoSrc);
    context.save();
    roundRect(context, photoX, photoY, photoWidth, photoHeight, 52);
    context.clip();
    drawCover(context, image, photoX, photoY, photoWidth, photoHeight);
    context.restore();
  }

  context.fillStyle = palette.foreground;
  context.font = '800 76px "Noto Sans Thai", sans-serif';
  context.fillText(name, 82, 1025);
  context.font = '600 34px "Noto Sans Thai", sans-serif';
  context.fillText(speciesLabel, 84, 1085);
  context.strokeStyle = palette.accent;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(82, 1145);
  context.lineTo(998, 1145);
  context.stroke();
  context.font = '600 27px "Noto Sans Thai", sans-serif';
  context.fillText(`PASSPORT NO.  ${passportId}`, 82, 1225);
  context.font = '700 27px "Noto Sans Thai", sans-serif';
  context.fillText(passportStyles.find((item) => item.id === style)?.name ?? "Classic", 82, 1285);

  const link = document.createElement("a");
  link.download = `${name || "pet"}-passport-4x5.png`;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return false;
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.rel = "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return true;
}

function cssColor(styles: CSSStyleDeclaration, name: string, fallback: string) {
  return styles.getPropertyValue(name).trim() || fallback;
}

function getCanvasPalette(style: PassportStyle, root: CSSStyleDeclaration) {
  const palettes: Record<PassportStyle, [string, string, string, string]> = {
    classic: ["--color-meaw-passport-classic-navy", "--color-meaw-passport-classic-paper", "--color-meaw-passport-classic-brass", "--color-meaw-white"],
    booklet: ["--color-meaw-passport-booklet-paper", "--color-meaw-passport-booklet-ink", "--color-meaw-passport-booklet-line", "--color-meaw-white"],
    sticker: ["--color-meaw-passport-sticker-paper", "--color-meaw-passport-sticker-ink", "--color-meaw-passport-sticker-accent", "--color-meaw-white"],
    polaroid: ["--color-meaw-passport-polaroid-paper", "--color-meaw-passport-polaroid-ink", "--color-meaw-passport-polaroid-line", "--color-meaw-white"],
    ticket: ["--color-meaw-passport-ticket-paper", "--color-meaw-passport-ticket-ink", "--color-meaw-passport-ticket-line", "--color-meaw-white"],
    japan: ["--color-meaw-passport-japan-paper", "--color-meaw-passport-japan-ink", "--color-meaw-passport-japan-vermilion", "--color-meaw-white"],
  };
  const [background, foreground, accent, surface] = palettes[style];
  return {
    background: cssColor(root, background, "white"),
    foreground: cssColor(root, foreground, "black"),
    accent: cssColor(root, accent, "gray"),
    surface: cssColor(root, surface, "white"),
  };
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}
