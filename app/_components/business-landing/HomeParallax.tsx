"use client";

import { useEffect } from "react";

/** Decorative, bounded scroll motion. No state updates or scroll interception. */
export function HomeParallax() {
  useEffect(() => {
    const layers = Array.from(document.querySelectorAll<HTMLElement>(".hotel-landing [data-parallax]"));
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".hotel-landing > section"));
    const reveals = Array.from(document.querySelectorAll<HTMLElement>(".hotel-landing > section, .hotel-service, .visual-capabilities article, .visual-journey article"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 800px)");
    const visible = new Set<HTMLElement>();
    let frame = 0;

    const update = () => {
      frame = 0;
      if (reducedMotion.matches) return;
      const positions = Array.from(visible, (layer) => {
        const box = (layer.parentElement ?? layer).getBoundingClientRect();
        const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - box.top - box.height / 2) / window.innerHeight));
        const distance = Number(layer.dataset.parallax) * (narrow.matches ? 0.4 : 1);
        return { layer, offset: progress * distance };
      });
      positions.forEach(({ layer, offset }) => layer.style.setProperty("--scroll-offset", `${offset.toFixed(2)}px`));
    };
    const schedule = () => {
      if (!frame && !reducedMotion.matches) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) visible.add(target as HTMLElement);
        else visible.delete(target as HTMLElement);
      });
      schedule();
    }, { rootMargin: "100px" });
    layers.forEach((layer) => observer.observe(layer));
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) {
          target.classList.add("is-revealed");
          revealObserver.unobserve(target);
        }
      });
    }, { threshold: 0.08 });
    reveals.forEach((element) => {
      // Content stays visible without JavaScript, when motion is reduced, and
      // at the initial viewport/anchor. Only approaching content eases in.
      if (!reducedMotion.matches && element.getBoundingClientRect().top > window.innerHeight) {
        element.classList.add("home-reveal-ready");
        revealObserver.observe(element);
      }
    });
    const motionObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => target.classList.toggle("motion-active", isIntersecting));
    }, { rootMargin: "80px" });
    sections.forEach((section) => motionObserver.observe(section));
    const revealFocused = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      let element: Element | null = event.target;
      while (element) {
        if (element.classList.contains("home-reveal-ready")) element.classList.add("is-revealed");
        element = element.parentElement;
      }
    };
    document.addEventListener("focusin", revealFocused);
    const resetMotion = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      layers.forEach((layer) => layer.style.removeProperty("--scroll-offset"));
      if (reducedMotion.matches) reveals.forEach((element) => element.classList.add("is-revealed"));
      schedule();
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    reducedMotion.addEventListener("change", resetMotion);
    narrow.addEventListener("change", resetMotion);
    return () => {
      observer.disconnect();
      revealObserver.disconnect();
      motionObserver.disconnect();
      document.removeEventListener("focusin", revealFocused);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", resetMotion);
      narrow.removeEventListener("change", resetMotion);
      layers.forEach((layer) => layer.style.removeProperty("--scroll-offset"));
      reveals.forEach((element) => element.classList.remove("home-reveal-ready", "is-revealed"));
      sections.forEach((section) => section.classList.remove("motion-active"));
    };
  }, []);
  return null;
}
