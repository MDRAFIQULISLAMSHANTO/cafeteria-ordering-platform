"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FoodArt } from "@/components/food/food-art";
import { MenuCard } from "@/components/food/menu-card";
import type { LandingData } from "@/lib/landing-data";
import { handOff } from "@/lib/tray-handoff";

export function MenuShowcase({ data, orderHref }: { data: LandingData; orderHref: string }) {
  const [filter, setFilter] = useState<string>("All");
  const [inCart, setInCart] = useState(0);
  const tabs = ["All", ...data.sections.map((s) => s.name)];
  const shown = useMemo(() => {
    const pool = filter === "All" ? data.items : data.items.filter((i) => i.section === filter);
    // "All" shows a spread across sections rather than the first section only
    if (filter !== "All") return pool.slice(0, 8);
    const out: typeof pool = [];
    for (let round = 0; out.length < 8 && round < 8; round++) for (const s of data.sections) {
      const it = pool.filter((i) => i.section === s.name)[round];
      if (it && out.length < 8) out.push(it);
    }
    return out;
  }, [data.items, data.sections, filter]);

  return (
    <section id="menu" aria-labelledby="menu-title" className="bg-sts-cream-2 py-16 md:py-24">
      {/* category strip */}
      <div aria-hidden className="mb-12 overflow-hidden border-y border-sts-hairline bg-sts-white py-3 md:mb-16">
        <div className="flex w-max animate-marquee gap-3 motion-safe-only">
          {[...data.sections, ...data.sections, ...data.sections, ...data.sections].map((s, i) => (
            <span key={`${s.name}${i}`} className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-sts-cream-2 py-1 pl-1 pr-4 font-display text-base font-bold text-sts-purple">
              <FoodArt kind={s.look.kind} tint={s.look.tint} steam={false} className="h-9 w-9" />
              {s.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-sts-orange-text">On the menu · {data.day}</p>
            <h2 id="menu-title" className="mt-2 font-display text-[clamp(2rem,3vw+.8rem,3.4rem)] font-extrabold leading-none tracking-[-.03em] text-sts-purple">Freshly made at {data.outlet.name}</h2>
            <p className="mt-3 max-w-xl text-sts-ink/75">
              Real items and prices from the cafeteria&apos;s menu.
              {data.guest && <> Showing {data.outlet.name} — sign in to see your own campus.</>}
              {!data.outlet.menuConfirmed && <span className="ml-1 pill-pending" title={data.pending.menu}>sample menu assignment</span>}
            </p>
          </div>
          <Link href={orderHref} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sts-purple px-5 text-sm font-bold text-sts-white hover:no-underline">
            {inCart ? `Go to my order · ${inCart}` : "Full menu"} <span aria-hidden>→</span>
          </Link>
        </div>

        <LayoutGroup>
          <div role="tablist" aria-label="Menu sections" className="scrollbar-none -mx-4 mt-7 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {tabs.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={filter === t}
                onClick={() => setFilter(t)}
                className={`relative flex-none rounded-full px-4 py-2 text-sm font-semibold transition-colors ${filter === t ? "text-sts-white" : "text-sts-purple hover:bg-sts-purple-soft"}`}
              >
                {filter === t && <motion.span layoutId="menu-pill" className="absolute inset-0 rounded-full bg-sts-purple" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                <span className="relative">{t}</span>
              </button>
            ))}
          </div>

          <motion.div layout className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((it) => (
                <motion.div key={it.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.25 }}>
                  <MenuCard
                    item={it}
                    onAdd={() => setInCart(handOff([{ id: it.id, name: it.name }]))}
                    badges={it.special ? <span className="rounded-full bg-sts-purple px-2 py-px font-semibold text-sts-white">Day special</span> : null}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
        <p className="mt-5 text-center text-xs text-muted">Photos are from the cafeteria&apos;s own menu; items without one show a drawn plate until the outlet adds a photo. Prices in BDT as printed, VAT included for parents and students.</p>
      </div>
    </section>
  );
}
