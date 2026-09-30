"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { FoodArt } from "@/components/food/food-art";

const STATUS = [
  { label: "Order placed", sub: "Paid with bKash", tone: "bg-sts-purple-soft text-sts-purple" },
  { label: "In the kitchen", sub: "Preparing now", tone: "bg-sts-orange-soft text-sts-orange-text" },
  { label: "Ready for pickup", sub: "Show your QR", tone: "bg-success-bg text-success" },
];

/**
 * The hero video sits in the original card, which
 * tilts toward the pointer, with the order's journey playing beside it.
 */
export function HeroArt({ next, lite }: { next: { label: string; time: string } | null; lite: boolean }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 16 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 16 });
  const [step, setStep] = useState(2);

  useEffect(() => {
    if (lite) return;
    const t = setInterval(() => setStep((s) => (s + 1) % STATUS.length), 2400);
    return () => clearInterval(t);
  }, [lite]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lite || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const s = STATUS[step];

  return (
    <div
      data-hero-art
      onPointerMove={onMove}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
      className="relative mx-auto aspect-square w-[min(78vw,calc(100svh-26.5rem))] min-w-44 [perspective:1100px] sm:w-[min(70vw,44svh)] lg:w-[min(46vw,68svh,600px)]"
    >
      {/* glow and orbit */}
      <div aria-hidden className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle,var(--sts-orange-soft)_0%,transparent_68%)]" />
      <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-spin-slow motion-safe-only">
        <circle cx="100" cy="100" r="94" fill="none" stroke="var(--sts-lilac)" strokeWidth="1" strokeDasharray="2 6" />
        <circle cx="100" cy="6" r="3.5" fill="var(--sts-orange)" />
        <circle cx="194" cy="100" r="2.5" fill="var(--sts-purple)" />
      </svg>

      {/* the tray */}
      <motion.div
        data-parallax
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="absolute bottom-[17%] left-[9%] right-[13%] top-[11%] rounded-[22%] bg-[linear-gradient(145deg,var(--sts-purple)_0%,var(--sts-purple-deep)_100%)] p-[5%] shadow-sts-float"
      >
        <div className="h-full w-full overflow-hidden rounded-[18%] bg-sts-white">
          <video
            key={lite ? "still" : "playing"}
            src="/videos/hero-food.mp4"
            poster="/videos/hero-food-poster.jpg"
            autoPlay={!lite}
            loop
            muted
            playsInline
            preload={lite ? "none" : "auto"}
            aria-label="S Cafe food animation"
            className="h-full w-full object-cover"
          />
        </div>
      </motion.div>

      {/* floating satellites */}
      <FoodArt kind="hot" tint="coffee" className="absolute -right-[2%] top-[4%] w-[22%] animate-float motion-safe-only drop-shadow-[0_12px_14px_var(--sts-drop)]" />
      <FoodArt kind="cookie" className="absolute -left-[4%] bottom-[20%] w-[19%] animate-float motion-safe-only [animation-delay:-3s] drop-shadow-[0_12px_14px_var(--sts-drop)]" />

      {/* next pickup (real data) */}
      {next && (
        <div className="absolute -left-[6%] top-[4%] hidden rounded-2xl bg-sts-white px-3.5 py-2.5 text-left shadow-sts-card sm:block">
          <small className="block text-2xs font-semibold uppercase tracking-wider text-muted">Next pickup</small>
          <b className="font-display text-lg text-sts-purple">{next.label} · {next.time}</b>
        </div>
      )}

      {/* order status, cycling */}
      <div className="absolute -right-[4%] bottom-0 w-[64%] min-w-40 max-w-64 rounded-2xl bg-sts-white p-2 text-left shadow-sts-card sm:p-3" aria-hidden>
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-sts-purple font-display text-xs font-bold text-sts-white sm:h-9 sm:w-9 sm:text-sm">S12</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.28 }} className="min-w-0">
              <b className="block truncate text-xs text-sts-ink sm:text-sm">{s.label}</b>
              <small className={`mt-0.5 inline-block rounded-full px-2 py-px text-2xs font-semibold ${s.tone}`}>{s.sub}</small>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {STATUS.map((x, i) => <span key={x.label} className={`h-1.5 rounded-full transition-colors duration-500 ${i <= step ? "bg-sts-orange" : "bg-sts-purple-soft"}`} />)}
        </div>
      </div>
    </div>
  );
}
