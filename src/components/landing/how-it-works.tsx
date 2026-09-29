"use client";

import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { FoodArt } from "@/components/food/food-art";
import { gsap, ScrollTrigger } from "./motion";

const STEPS = [
  { title: "Choose from your campus menu", text: "Your cafeteria's own menu and prices, up to 7 days ahead. Sold-out items are switched off live.", kicker: "01" },
  { title: "Pick a break-time slot", text: "Snack break, lunch or after school. Each slot shows its order-by time, so you know the cut-off.", kicker: "02" },
  { title: "Pay in the app", text: "bKash, Nagad or card. Staff can also pay at the counter. Receipts show VAT and any staff discount.", kicker: "03" },
  { title: "Collect with your QR", text: "The screen says Ready; the counter scans your code and checks your name. No queue, no mix-ups.", kicker: "04" },
];

/** A QR-looking pattern for the illustration (not a scannable code). */
function DecorativeQr() {
  const ink = "var(--sts-purple-deep)";
  const finder = (x: number, y: number) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width="7" height="7" fill={ink} />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="var(--sts-white)" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill={ink} />
    </g>
  );
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
  const dots = [];
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (!inFinder(x, y) && (x * 7 + y * 13 + x * y) % 3 === 0) dots.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={ink} />);
  return (
    <svg viewBox="-1 -1 23 23" className="w-3/5 rounded-lg bg-sts-white p-1.5 shadow-[0_0_0_1px_var(--sts-hairline)]" aria-hidden>
      {finder(0, 0)}{finder(14, 0)}{finder(0, 14)}{dots}
    </svg>
  );
}

function Screen({ step }: { step: number }) {
  const row = "flex items-center gap-2 rounded-xl bg-sts-white p-2 shadow-[0_0_0_1px_var(--sts-hairline)]";
  if (step === 0)
    return (
      <div className="grid grid-cols-2 gap-2">
        {([["burger", "Chicken Burger", "৳150"], ["cake", "Brownie", "৳150"], ["hot", "Latte", "৳180"], ["wrap", "Kebab Wrap", "৳120"]] as const).map(([k, n, p]) => (
          <div key={n} className="rounded-xl bg-sts-white p-2 text-left shadow-[0_0_0_1px_var(--sts-hairline)]">
            <FoodArt kind={k} tint="coffee" steam={false} className="mx-auto w-3/4" />
            <b className="block truncate text-2xs text-sts-ink">{n}</b>
            <span className="flex items-center justify-between text-2xs font-bold text-sts-purple">{p}<i className="grid h-5 w-5 place-items-center rounded-full bg-sts-orange not-italic text-sts-ink">+</i></span>
          </div>
        ))}
      </div>
    );
  if (step === 1)
    return (
      <div className="flex flex-col gap-2">
        {[["10:00 AM", "Snack break", "Order by 9:00"], ["12:00 PM", "Lunch", "Order by 11:00"], ["3:00 PM", "After school", "Order by 2:00"]].map(([t, l, c], i) => (
          <div key={t} className={`${row} ${i === 1 ? "ring-2 ring-sts-purple" : ""}`}>
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-sts-purple-soft text-2xs font-bold text-sts-purple">{t.split(" ")[0]}</span>
            <span className="min-w-0 text-left"><b className="block text-xs text-sts-ink">{l}</b><small className="text-2xs text-muted">{c}</small></span>
            {i === 1 && <span className="ml-auto text-sts-purple">✓</span>}
          </div>
        ))}
      </div>
    );
  if (step === 2)
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-xl bg-sts-purple p-3 text-left text-sts-white"><small className="text-2xs opacity-80">Total</small><b className="block font-display text-2xl">৳299</b><small className="text-2xs opacity-80">VAT 5% included</small></div>
        {[["bK", "bKash"], ["N", "Nagad"], ["▭", "Card"]].map(([m, l], i) => (
          <div key={l} className={`${row} ${i === 0 ? "ring-2 ring-sts-orange" : ""}`}>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-sts-cream text-2xs font-bold text-sts-purple">{m}</span>
            <b className="text-xs text-sts-ink">{l}</b>
          </div>
        ))}
      </div>
    );
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="rounded-full bg-success-bg px-3 py-1 text-2xs font-bold text-success">Ready for pickup ✓</span>
      <b className="font-display text-4xl text-sts-purple">S12</b>
      <DecorativeQr />
      <small className="text-2xs text-muted">Counter scans and checks your name</small>
    </div>
  );
}

function Phone({ step }: { step: number }) {
  return (
    <div className="relative mx-auto w-[min(270px,70vw)] rounded-[2.6rem] bg-sts-purple-deep p-2.5 shadow-sts-float">
      <div className="absolute left-1/2 top-3.5 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-sts-purple-deep" />
      <div className="relative aspect-[9/17] overflow-hidden rounded-[2.1rem] bg-sts-cream-2 px-3 pb-3 pt-9">
        <div className="mb-3 flex items-center justify-between text-left">
          <span><small className="block text-2xs text-muted">ISD Cafeteria</small><b className="text-xs text-sts-purple">{STEPS[step].title.split(" ").slice(0, 3).join(" ")}</b></span>
          <span className="h-7 w-7 rounded-full bg-sts-purple-soft" />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: "easeOut" }}>
            <Screen step={step} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function HowItWorks({ lite }: { lite: boolean }) {
  const root = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  // desktop: pin the section and let the scroll walk through the four steps
  useGSAP(
    () => {
      if (lite) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const st = ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: "+=140%",
          pin: true,
          scrub: 0.4,
          onUpdate: (self) => setStep(Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length))),
        });
        gsap.fromTo("[data-how-bar]", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "+=140%", scrub: true } });
        return () => st.kill();
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [lite] },
  );

  return (
    <section ref={root} id="how" aria-labelledby="how-title" className="relative overflow-hidden bg-sts-purple-deep py-16 text-sts-white lg:flex lg:min-h-svh lg:items-center lg:py-10">
      <div aria-hidden className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,var(--sts-orange)_0%,transparent_65%)] opacity-25" />
      <div className="relative mx-auto grid w-full max-w-[1180px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr]">
        <div data-reveal>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-sts-orange">How it works</p>
          <h2 id="how-title" className="mt-3 font-display text-[clamp(2rem,3.2vw+.6rem,3.4rem)] font-extrabold leading-[1.02] tracking-[-.03em]">Lunch, sorted before the bell.</h2>
          <p className="mt-4 max-w-md text-sts-white/75">Four steps, one screen each. Everything here is the working app — the same rules the kitchen and counter use.</p>
        </div>

        <div className="hidden lg:block"><Phone step={step} /></div>

        {/* desktop: step list driven by scroll */}
        <ol className="relative hidden flex-col gap-5 pl-6 lg:flex">
          <span aria-hidden className="absolute left-0 top-1 h-[calc(100%-8px)] w-0.5 rounded bg-sts-white/15" />
          <span aria-hidden data-how-bar className="absolute left-0 top-1 h-[calc(100%-8px)] w-0.5 origin-top rounded bg-sts-orange" />
          {STEPS.map((s, i) => (
            <li key={s.kicker} aria-current={i === step ? "step" : undefined} className={`transition-opacity duration-300 ${i === step ? "opacity-100" : "opacity-45"}`}>
              <button type="button" className="text-left" onClick={() => setStep(i)}>
                <span className="font-display text-sm font-bold text-sts-orange">{s.kicker}</span>
                <b className="mt-0.5 block font-display text-xl">{s.title}</b>
                <span className="mt-1 block text-sm text-sts-white/70">{s.text}</span>
              </button>
            </li>
          ))}
        </ol>

        {/* phones and tablets: each step with its own screen */}
        <ol className="grid gap-6 sm:grid-cols-2 lg:hidden">
          {STEPS.map((s, i) => (
            <li key={s.kicker} data-reveal className="rounded-3xl bg-sts-white/6 p-5 shadow-[0_0_0_1px_var(--sts-on-dark-line)]">
              <span className="font-display text-sm font-bold text-sts-orange">{s.kicker}</span>
              <b className="mt-0.5 block font-display text-xl">{s.title}</b>
              <p className="mt-1 text-sm text-sts-white/70">{s.text}</p>
              <div className="mx-auto mt-4 max-w-56 rounded-2xl bg-sts-cream-2 p-3 text-sts-ink"><Screen step={i} /></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
