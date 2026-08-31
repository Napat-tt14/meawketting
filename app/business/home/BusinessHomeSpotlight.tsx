"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, ArrowRight } from "../../_components/icons";

type BannerVariant = {
  id: "care-lounge" | "grooming" | "hotel";
  imageSrc: string;
  mobileImageSrc?: string;
  imageAlt: string;
  href: "/business/calendar" | "/business/scan";
  label: string;
};

const BANNER_ROTATION_MS = 6_000;
const SWIPE_THRESHOLD_PX = 48;

const variants: readonly BannerVariant[] = [
  {
    id: "care-lounge",
    imageSrc: "/images/business/business-banner-care-lounge.png",
    imageAlt: "แมวสองตัวพักผ่อนในเลานจ์สำหรับสัตว์เลี้ยง",
    href: "/business/calendar",
    label: "ประกาศการดูแลสัตว์เลี้ยง",
  },
  {
    id: "grooming",
    imageSrc: "/images/business/business-banner-grooming.png",
    imageAlt: "สุนัขที่เพิ่งรับบริการอาบน้ำตัดขนในร้านที่สว่างอบอุ่น",
    href: "/business/calendar",
    label: "บริการอาบน้ำและตัดขน",
  },
  {
    id: "hotel",
    imageSrc: "/images/business/business-banner-hotel.png",
    imageAlt: "แมวกำลังพักผ่อนในห้องพักสัตว์เลี้ยงที่อบอุ่น",
    href: "/business/scan",
    label: "พื้นที่พักและรับเข้าบริการ",
  },
];

export function BusinessHomeSpotlight() {
  const panelId = useId();
  const pointerStart = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const suppressNextClick = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const active = variants[activeIndex] ?? variants[0];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setPrefersReducedMotion(media.matches);
    syncMotionPreference();
    media.addEventListener("change", syncMotionPreference);
    return () => media.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    if (paused || prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % variants.length);
    }, BANNER_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [paused, prefersReducedMotion]);

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + variants.length) % variants.length);
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % variants.length);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== "touch") return;
    pointerStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPaused(true);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const start = pointerStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    pointerStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);

    const distanceX = event.clientX - start.x;
    const distanceY = event.clientY - start.y;
    if (Math.abs(distanceX) >= SWIPE_THRESHOLD_PX && Math.abs(distanceX) > Math.abs(distanceY) * 1.1) {
      suppressNextClick.current = true;
      window.setTimeout(() => { suppressNextClick.current = false; }, 0);
      if (distanceX < 0) showNext();
      else showPrevious();
    }
    setPaused(false);
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLElement>) {
    pointerStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setPaused(false);
  }

  return (
    <section
      className="business-home-banner"
      aria-label="ประกาศและสิทธิประโยชน์ของร้าน"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <a
        className="business-home-banner__image"
        id={panelId}
        href={active.href}
        aria-label={active.label}
        onClickCapture={(event) => {
          if (!suppressNextClick.current) return;
          event.preventDefault();
          suppressNextClick.current = false;
        }}
      >
        <span
          className="business-home-banner__track"
          style={{ "--business-banner-index": activeIndex } as CSSProperties}
        >
          {variants.map((variant, index) => (
            <picture
              className="business-home-banner__slide"
              key={variant.id}
            >
              {variant.mobileImageSrc ? <source media="(max-width: 767px)" srcSet={variant.mobileImageSrc} /> : null}
              <img src={variant.imageSrc} alt={index === activeIndex ? variant.imageAlt : ""} />
            </picture>
          ))}
        </span>
      </a>
      <button className="business-home-banner__arrow business-home-banner__arrow--previous" type="button" aria-controls={panelId} aria-label="แบนเนอร์ก่อนหน้า" onClick={showPrevious}>
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
      <button className="business-home-banner__arrow business-home-banner__arrow--next" type="button" aria-controls={panelId} aria-label="แบนเนอร์ถัดไป" onClick={showNext}>
        <ArrowRight size={20} aria-hidden="true" />
      </button>
      <span className="business-home-banner__counter" aria-live="polite" aria-atomic="true">
        <span className="sr-only">แบนเนอร์</span> {activeIndex + 1}/{variants.length}
      </span>
    </section>
  );
}
