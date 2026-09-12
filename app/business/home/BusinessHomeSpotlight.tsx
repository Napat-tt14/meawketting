"use client";

import { useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, ArrowRight } from "../../_components/icons";

type BannerVariant = {
  id: "care-lounge" | "grooming" | "hotel";
  imageSrc: string;
  mobileImageSrc?: string;
  imageAlt: string;
  href: "/business/calendar" | "/business/scan";
  label: string;
  badge: string;
  title: string;
};

const SWIPE_THRESHOLD_PX = 48;

const variants: readonly BannerVariant[] = [
  {
    id: "care-lounge",
    imageSrc: "/images/business/business-banner-care-lounge.png",
    imageAlt: "แมวสองตัวพักผ่อนในเลานจ์สำหรับสัตว์เลี้ยง",
    href: "/business/calendar",
    label: "ประกาศการดูแลสัตว์เลี้ยง",
    badge: "พื้นที่บริการพิเศษ",
    title: "เลานจ์พักผ่อนและดูแลสัตว์เลี้ยง",
  },
  {
    id: "grooming",
    imageSrc: "/images/business/business-banner-grooming.png",
    imageAlt: "สุนัขที่เพิ่งรับบริการอาบน้ำตัดขนในร้านที่สว่างอบอุ่น",
    href: "/business/calendar",
    label: "บริการอาบน้ำและตัดขน",
    badge: "กรูมมิ่ง & สปา",
    title: "บริการอาบน้ำตัดขนมาตรฐาน",
  },
  {
    id: "hotel",
    imageSrc: "/images/business/business-banner-hotel.png",
    imageAlt: "แมวกำลังพักผ่อนในห้องพักสัตว์เลี้ยงที่อบอุ่น",
    href: "/business/scan",
    label: "พื้นที่พักและรับเข้าบริการ",
    badge: "โรงแรมสัตว์เลี้ยง",
    title: "ห้องพักส่วนตัว สะอาด ปลอดภัย",
  },
];

export function BusinessHomeSpotlight() {
  const panelId = useId();
  const pointerStart = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const suppressNextClick = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = variants[activeIndex] ?? variants[0];

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
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLElement>) {
    pointerStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <section
      className="dashboard-banner"
      aria-label="ประกาศและสิทธิประโยชน์ของร้าน"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <a
        className="dashboard-banner__link"
        id={panelId}
        href={active.href}
        aria-label={active.label}
        onClickCapture={(event) => {
          if (!suppressNextClick.current) return;
          event.preventDefault();
          suppressNextClick.current = false;
        }}
      >
        <picture className="dashboard-banner__picture" key={active.id}>
          {active.mobileImageSrc ? <source media="(max-width: 767px)" srcSet={active.mobileImageSrc} /> : null}
          <img src={active.imageSrc} alt={active.imageAlt} width={1672} height={941} loading="lazy" decoding="async" />
        </picture>
        <div className="dashboard-banner__copy">
          <span className="dashboard-banner__eyebrow">{active.badge}</span>
          <h2>{active.title}</h2>
          <span className="dashboard-banner__cta">{active.href === "/business/scan" ? "เปิดหน้ารับเข้าบริการ" : "เปิดตารางการจอง"}<ArrowRight size={16} aria-hidden="true" /></span>
        </div>
      </a>
      <div className="dashboard-banner__controls">
      <span className="dashboard-banner__section-label">ข่าวสารและบริการ</span>
      <span className="dashboard-banner__counter" aria-live="polite" aria-atomic="true"><span className="sr-only">แบนเนอร์</span>{activeIndex + 1} / {variants.length}</span>
      <button type="button" aria-controls={panelId} aria-label="แบนเนอร์ก่อนหน้า" onClick={showPrevious}>
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
      <button type="button" aria-controls={panelId} aria-label="แบนเนอร์ถัดไป" onClick={showNext}>
        <ArrowRight size={20} aria-hidden="true" />
      </button>
      </div>
    </section>
  );
}
