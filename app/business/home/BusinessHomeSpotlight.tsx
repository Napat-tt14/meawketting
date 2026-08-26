"use client";

import { useEffect, useId, useState } from "react";
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
    >
      <a className="business-home-banner__image" id={panelId} href={active.href} aria-label={active.label}>
        <picture key={active.id}>
          {active.mobileImageSrc ? <source media="(max-width: 767px)" srcSet={active.mobileImageSrc} /> : null}
          <img src={active.imageSrc} alt={active.imageAlt} />
        </picture>
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
