"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect, useSyncExternalStore, type RefObject } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// One owner per animated element: GSAP runs scroll reveals, the hero intro,
// parallax and the pinned "how it works" scene; framer-motion runs component
// state (filters, cards, game); CSS runs loops (marquee, steam, orbit).
// Reduced motion or ?motion=lite turns the scripted motion off — content is
// always visible without it (elements are only hidden right before they are
// animated in).

const noop = () => () => {};
export function useLite() {
  return useSyncExternalStore(
    noop,
    () => new URLSearchParams(location.search).get("motion") === "lite" || matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function useLandingMotion(root: RefObject<HTMLElement | null>, lite: boolean) {
  // smooth scrolling on desktop mouse/trackpad only
  useEffect(() => {
    if (lite || !matchMedia("(pointer: fine) and (min-width: 1024px)").matches) return;
    const lenis = new Lenis({ lerp: 0.12, anchors: { offset: -72 } });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [lite]);

  useGSAP(
    () => {
      if (lite) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // hero: everything but the headline (the headline is the LCP element)
        gsap.from("[data-hero-in]", { y: 22, autoAlpha: 0, duration: 0.9, ease: "power3.out", stagger: 0.09, delay: 0.05 });
        gsap.fromTo("[data-swash]", { strokeDashoffset: 320 }, { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut", delay: 0.45 });
        gsap.from("[data-hero-art]", { scale: 0.88, rotate: -6, autoAlpha: 0, duration: 1.1, ease: "back.out(1.4)", delay: 0.15 });
        gsap.to("[data-parallax]", {
          yPercent: -14,
          ease: "none",
          scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: true },
        });

        // section reveals — only what is below the fold gets hidden first
        const below = gsap.utils.toArray<HTMLElement>("[data-reveal]").filter((el) => el.getBoundingClientRect().top > innerHeight * 0.92);
        gsap.set(below, { autoAlpha: 0, y: 36 });
        ScrollTrigger.batch(below, {
          start: "top 90%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, overwrite: true }),
        });

        // count-up figures
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const to = Number(el.dataset.count);
          const obj = { v: 0 };
          gsap.to(obj, {
            v: to,
            duration: 1.4,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 95%", once: true },
            onUpdate: () => { el.textContent = String(Math.round(obj.v)); },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [lite] },
  );
}

export { gsap, ScrollTrigger };
