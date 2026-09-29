"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FoodArt } from "@/components/food/food-art";
import type { LandingData } from "@/lib/landing-data";
import { money } from "@/lib/rules";

function Digit({ value }: { value: string }) {
  return (
    <span className="relative inline-grid h-[1.15em] w-[.66em] overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={value} initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.35, ease: "easeOut" }} className="col-start-1 row-start-1 text-center">
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Today's special plus a countdown to the real cut-off of the next open slot. */
export function SpecialCountdown({ data, orderHref }: { data: LandingData; orderHref: string }) {
  // the server's demo-clock "now" and the browser clock can differ; count from the server's
  const [offset] = useState(() => data.now.ms - Date.now());
  const [now, setNow] = useState(data.now.ms);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(t);
  }, [offset]);

  const left = data.next ? Math.max(0, data.next.cutoffMs - now) : 0;
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const parts: [string, string][] = [[String(Math.min(h, 99)).padStart(2, "0"), "hours"], [String(m).padStart(2, "0"), "min"], [String(s).padStart(2, "0"), "sec"]];
  const sp = data.special;

  return (
    <section aria-labelledby="special-title" className="bg-sts-cream-2 pb-16 md:pb-24">
      <div data-reveal className="mx-auto grid max-w-[1240px] overflow-hidden rounded-[2rem] bg-sts-orange px-5 py-8 text-sts-ink shadow-sts-float sm:mx-6 sm:px-10 md:grid-cols-[1fr_auto] md:items-center md:gap-10 md:py-12 xl:mx-auto">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em]">{sp ? "Today's day special" : "Next pickup"}</p>
          <h2 id="special-title" className="mt-2 font-display text-[clamp(1.9rem,2.6vw+.9rem,3.2rem)] font-extrabold leading-[1.02] tracking-[-.03em]">
            {sp ? sp.name : data.next ? `${data.next.label} at ${data.next.time}` : "Ordering opens again soon"}
          </h2>
          {sp && <p className="mt-2 font-display text-2xl font-bold">{money(sp.price)}</p>}
          {data.next ? (
            <>
              <p className="mt-5 text-sm font-semibold">Order for {data.next.label.toLowerCase()} ({data.next.time}) closes in</p>
              <div className="mt-2 flex items-end gap-3" aria-live="off">
                {parts.map(([v, l]) => (
                  <div key={l} className="rounded-2xl bg-sts-white/85 px-3 py-2 text-center shadow-sm">
                    <div className="flex font-display text-4xl font-extrabold tabular-nums text-sts-purple sm:text-5xl">{v.split("").map((d, i) => <Digit key={i} value={d} />)}</div>
                    <small className="text-2xs font-bold uppercase tracking-wider">{l}</small>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs">{data.next.cutoffRule}. <span className="font-semibold">{data.next.remaining} places left</span> in this slot.</p>
            </>
          ) : (
            <p className="mt-4 text-sm">All of today&apos;s slots have closed — you can pre-order for another day.</p>
          )}
          <Link href={orderHref} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-sts-purple px-6 font-bold text-sts-white hover:no-underline">Order before the cut-off <span aria-hidden>→</span></Link>
        </div>
        <div className="relative mx-auto mt-8 w-[min(70vw,300px)] md:mt-0">
          <div aria-hidden className="absolute inset-[8%] rounded-full bg-sts-white/35" />
          <FoodArt kind={sp?.look.kind ?? "rice"} tint={sp?.look.tint} className="relative w-full animate-float motion-safe-only drop-shadow-[0_24px_24px_var(--sts-drop)]" />
        </div>
      </div>
    </section>
  );
}
