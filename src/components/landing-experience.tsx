"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Visitor = {
  name: string;
  accountType: string;
  outletName: string;
  campus: string;
} | null;

const featuredMeals = [
  { name: "Chicken Burger Combo", detail: "Burger, fries and lemonade", price: "৳299", icon: "burger" },
  { name: "Chicken & Mushroom Bake", detail: "Warm savoury bake", price: "৳150", icon: "bake" },
  { name: "Singara & Coffee", detail: "A quick break-time pairing", price: "৳90", icon: "snack" },
  { name: "Fried Chicken Combo", detail: "Chicken, wedges and cold coffee", price: "৳299", icon: "chicken" },
];

const outlets = [
  { name: "ISD Cafeteria", campus: "ISD Bashundhara", hours: "7:30 AM–3:30 PM" },
  { name: "ISD Parent Lounge", campus: "ISD Bashundhara", hours: "7:30 AM–4:30 PM" },
  { name: "UCBD Cafeteria", campus: "UCBD", hours: "8:30 AM–5:30 PM" },
];

const trayFoods = [
  { id: "chicken", name: "Grilled chicken", group: "Protein", mark: "P" },
  { id: "egg", name: "Egg", group: "Protein", mark: "P" },
  { id: "vegetables", name: "Mixed vegetables", group: "Vegetables & fruit", mark: "V" },
  { id: "banana", name: "Banana", group: "Vegetables & fruit", mark: "V" },
  { id: "rice", name: "Rice", group: "Grains", mark: "G" },
  { id: "bread", name: "Wholegrain bread", group: "Grains", mark: "G" },
] as const;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Circular food-photo composition for the hero.
 * Crops to the croissant + blueberries area at the top-right of the reference
 * image using CSS background positioning — no event text or school branding
 * is visible at this zoom level. Chips animate in once; no infinite loops.
 */
function HeroPhoto({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden>
      {/* Outer decorative ring */}
      <div className="absolute inset-[3%] rounded-full border-2 border-sts-orange/25" />
      {/* White backing ring with depth shadow */}
      <div className="absolute inset-[7%] rounded-full bg-sts-white shadow-o-pop" />
      {/*
        Circular photo crop.
        background-size: 330% auto  → zooms 3.3× into the image
        background-position: 96% 3% → anchors near the top-right corner
        Net visible strip: roughly the top-right 30% × 30% of the source,
        which contains only the croissant, chocolate drizzle and blueberries.
      */}
      <div
        className="absolute inset-[9%] rounded-full shadow-o-md"
        role="img"
        aria-label="Chocolate-drizzled pastry with blueberries from the STS cafeteria"
        style={{
          backgroundImage: "url(/branding/food-tasting-reference.jpeg)",
          backgroundSize: "330% auto",
          backgroundPosition: "96% 3%",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Floating info chips — slide in once; no repeat */}
      <motion.div
        className="absolute left-0 top-[19%] max-w-[180px] rounded-2xl border border-line bg-sts-white px-4 py-3 shadow-o-md"
        initial={reduceMotion === false ? { opacity: 0, x: -20 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, delay: 0.85, ease: "easeOut" }}
      >
        <b className="block text-sm text-sts-purple">Ready on time</b>
        <span className="text-xs text-muted">Choose your pickup slot</span>
      </motion.div>
      <motion.div
        className="absolute bottom-[13%] right-0 max-w-[180px] rounded-2xl border border-line bg-sts-white px-4 py-3 shadow-o-md"
        initial={reduceMotion === false ? { opacity: 0, x: 20 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, delay: 1.05, ease: "easeOut" }}
      >
        <b className="block text-sm text-sts-purple">Quick collection</b>
        <span className="text-xs text-muted">Show your secure QR</span>
      </motion.div>
    </div>
  );
}

function FoodMark({ icon }: { icon: string }) {
  const paths: Record<string, string> = {
    burger: "M6 11h12M5 15h14M7 8c1-4 9-4 10 0M7 18h10",
    bake: "M7 8h10l-1 11H8L7 8Zm2-3h6",
    snack: "M7 7h10l-2 12H9L7 7Zm3-3h4M18 5c2 2 2 5 0 7",
    chicken: "M9 8c3-3 8-1 8 3 0 5-6 8-10 5-3-2-1-6 2-8Zm8 8 3 3m0-3-3 3",
  };
  return (
    <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d={paths[icon]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BalancedTrayGame() {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<string[]>([]);
  const groups = new Set(selected.map((id) => trayFoods.find((food) => food.id === id)?.group));
  const complete = groups.has("Protein") && groups.has("Vegetables & fruit") && groups.has("Grains");

  function choose(id: string, group: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      const withoutGroup = current.filter((item) => trayFoods.find((food) => food.id === item)?.group !== group);
      return [...withoutGroup, id];
    });
  }

  return (
    <section id="game" className="landing-reveal overflow-hidden bg-sts-purple py-18 text-sts-white md:py-24">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
        <div>
          {/* Dark ink on orange for WCAG AA contrast (#1D1D1D on #F57C18 ≈ 5.1:1) */}
          <span className="mb-4 inline-flex rounded-full bg-sts-orange px-4 py-2 text-xs font-bold uppercase tracking-[.12em] text-sts-ink">
            Student break
          </span>
          <h2 className="max-w-[12ch] text-4xl font-bold leading-tight md:text-5xl">Build a balanced lunch tray</h2>
          <p className="mt-5 max-w-[46ch] text-base leading-7 text-sts-white/80">
            Pick one protein, one vegetable or fruit, and one grain. It takes less than a minute.
          </p>
          <p className="mt-4 text-sm text-sts-white/70">A learning activity only. It does not change your order or account.</p>
        </div>

        <div className="rounded-[28px] bg-sts-white p-5 text-sts-ink shadow-o-pop md:p-8">
          <div
            className="grid min-h-32 grid-cols-3 gap-2 rounded-[24px] border-2 border-dashed border-sts-ornament bg-sts-cream p-3 sm:gap-3 sm:p-4"
            aria-live="polite"
          >
            {["Protein", "Vegetables & fruit", "Grains"].map((group) => {
              const food = trayFoods.find((item) => item.group === group && selected.includes(item.id));
              return (
                <motion.div
                  layout
                  key={group}
                  className="grid min-h-20 place-items-center rounded-2xl bg-sts-white p-2 text-center shadow-o-sm sm:min-h-24 sm:p-3"
                  animate={food && !reduceMotion ? { scale: [0.92, 1.04, 1] } : undefined}
                >
                  {food ? (
                    <>
                      {/* Dark ink on orange for accessible contrast */}
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-sts-orange text-xs font-black text-sts-ink sm:h-10 sm:w-10 sm:text-sm">
                        {food.mark}
                      </span>
                      <b className="mt-2 text-[11px] leading-tight sm:text-xs md:text-sm">{food.name}</b>
                    </>
                  ) : (
                    <span className="text-[11px] font-semibold leading-tight text-muted sm:text-xs">
                      Add<br />{group}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {trayFoods.map((food) => {
              const active = selected.includes(food.id);
              return (
                <motion.button
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  key={food.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(food.id, food.group)}
                  className={`min-h-14 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sts-orange ${
                    active
                      ? "border-sts-orange bg-sts-cream text-sts-purple"
                      : "border-line bg-sts-white hover:border-sts-orange"
                  }`}
                >
                  <span className="block text-2xs uppercase tracking-wide text-muted">{food.group}</span>
                  {food.name}
                </motion.button>
              );
            })}
          </div>

          <div className="mt-5 flex min-h-12 items-center justify-between gap-4">
            <motion.p
              key={complete ? "complete" : "progress"}
              initial={reduceMotion ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm font-bold ${complete ? "text-success" : "text-sts-purple"}`}
            >
              {complete
                ? "Great balance — your tray has all three groups!"
                : `${groups.size} of 3 food groups selected`}
            </motion.p>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold hover:bg-surface-3"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingExperience({ visitor }: { visitor: Visitor }) {
  const root = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const orderHref = visitor ? "/order" : "/login";
  const ordersHref = visitor ? "/orders" : "/login?next=/orders";

  useEffect(() => {
    if (reduceMotion || !root.current) return;
    // Guard against the async import completing after unmount.
    let cancelled = false;
    let cleanup = () => {};
    void (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        const context = gsap.context(() => {
          // immediateRender: false keeps the elements at their natural CSS state
          // until the ScrollTrigger fires — so content is visible with JS disabled
          // and on first server render (brief: "avoid initial opacity zero on
          // essential content").
          gsap.utils.toArray<HTMLElement>(".landing-reveal").forEach((section) => {
            gsap.from(section, {
              opacity: 0,
              y: 42,
              duration: 0.75,
              ease: "power2.out",
              immediateRender: false,
              scrollTrigger: { trigger: section, start: "top 86%", once: true },
            });
          });
          gsap.to(".hero-orbit", {
            yPercent: -7,
            ease: "none",
            scrollTrigger: { trigger: ".landing-hero", start: "top top", end: "bottom top", scrub: 0.5 },
          });
        }, root);
        cleanup = () => context.revert();
      } catch {
        // GSAP load failed — content remains visible at its initial position.
      }
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [reduceMotion]);

  return (
    <div ref={root} className="sts-public-theme min-h-screen bg-sts-white text-sts-ink">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-line/80 bg-sts-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 max-w-[1180px] items-center gap-5 px-5">
          <Link href="/" aria-label="STS Group cafeteria home" className="shrink-0">
            <Image src="/branding/sts-group-logo.png" alt="STS Group" width={112} height={48} priority />
          </Link>
          <nav aria-label="Main navigation" className="ml-auto hidden items-center gap-1 md:flex">
            <a href="#how" className="rounded-lg px-3 py-2 text-sm font-semibold text-sts-purple hover:bg-sts-cream">How it works</a>
            <a href="#meals" className="rounded-lg px-3 py-2 text-sm font-semibold text-sts-purple hover:bg-sts-cream">Meals</a>
            <a href="#outlets" className="rounded-lg px-3 py-2 text-sm font-semibold text-sts-purple hover:bg-sts-cream">Outlets</a>
            <a href="#help" className="rounded-lg px-3 py-2 text-sm font-semibold text-sts-purple hover:bg-sts-cream">Help</a>
          </nav>
          <Link
            href={ordersHref}
            className="ml-auto hidden min-h-11 items-center rounded-xl px-4 text-sm font-bold text-sts-purple hover:bg-sts-cream md:flex"
          >
            {visitor ? "My Orders" : "Sign In"}
          </Link>
          {/* Dark ink on orange gradient — WCAG AA contrast (#1D1D1D on ~#F07020 ≈ 5:1) */}
          <Link
            href={orderHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-so-grad px-4 text-sm font-bold text-sts-ink shadow-o-sm hover:no-underline md:px-5"
          >
            Order Now <ArrowIcon />
          </Link>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      {/* pb-20 md:pb-0 reserves space so the fixed mobile CTA never covers content */}
      <main className="pb-20 md:pb-0">

        {/* Hero */}
        <section className="landing-hero relative overflow-hidden bg-so-hero">
          <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full border border-sts-purple/15" />
          <div className="pointer-events-none absolute -right-28 bottom-0 h-80 w-80 rounded-full border border-sts-orange/20" />
          <div className="mx-auto grid min-h-[690px] w-full max-w-[1180px] grid-cols-1 items-center gap-10 overflow-hidden px-5 py-16 lg:grid-cols-[1.03fr_.97fr] lg:overflow-visible lg:py-20">
            <motion.div
              className="min-w-0"
              initial={reduceMotion === false ? { opacity: 0, y: 24 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-sts-orange/30 bg-sts-white px-4 py-2 text-xs font-bold uppercase tracking-[.12em] text-sts-purple">
                <span className="h-2 w-2 rounded-full bg-sts-orange" /> Campus meals, ready for you
              </span>
              {visitor && (
                <p className="mt-6 text-sm font-bold text-sts-purple">
                  Welcome back, {visitor.name.split(" ")[0]} · {visitor.campus}
                </p>
              )}
              <h1 className="mt-6 max-w-[11ch] text-[clamp(3.2rem,7vw,6.7rem)] font-black leading-[.92] tracking-[-.055em] text-sts-purple">
                Order ahead. <span className="text-sts-orange">Pick up on time.</span>
              </h1>
              <p className="mt-7 max-w-[56ch] text-lg leading-8 text-sts-ink/75">
                Choose snacks and meals from your campus cafeteria, select a pickup time, and collect with your secure QR code.
              </p>
              <div className="mt-8 flex min-w-0 flex-col gap-3 sm:flex-row">
                {/* Dark ink on orange gradient */}
                <Link
                  href={orderHref}
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-so-grad px-7 text-base font-bold text-sts-ink shadow-o-md hover:no-underline"
                >
                  {visitor ? "Continue ordering" : "Order Now"} <ArrowIcon />
                </Link>
                <Link
                  href={ordersHref}
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-sts-purple/20 bg-sts-white px-7 text-base font-bold text-sts-purple shadow-o-sm hover:border-sts-purple hover:no-underline"
                >
                  Track My Order
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-sts-purple/75">
                <span className="rounded-full bg-sts-white px-4 py-2 shadow-o-sm">Up to 7 days ahead</span>
                <span className="rounded-full bg-sts-white px-4 py-2 shadow-o-sm">Pickup time slots</span>
                <span className="rounded-full bg-sts-white px-4 py-2 shadow-o-sm">QR collection</span>
              </div>
            </motion.div>

            <motion.div
              className="hero-orbit min-w-0"
              initial={reduceMotion === false ? { opacity: 0, scale: 0.92 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
            >
              <HeroPhoto reduceMotion={reduceMotion} />
            </motion.div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="landing-reveal bg-sts-white py-18 md:py-24">
          <div className="mx-auto max-w-[1180px] px-5">
            <div className="mx-auto max-w-2xl text-center">
              {/* Purple kicker: #462576 on white = 15:1, passes AAA */}
              <p className="text-xs font-bold uppercase tracking-[.14em] text-sts-purple">Easy from order to pickup</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-sts-purple md:text-5xl">Three simple steps</h2>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                ["01", "Choose your meal", "Browse the menu available for your assigned campus and service date."],
                ["02", "Select pickup time", "Choose an available break or lunch slot that fits your schedule."],
                ["03", "Collect with QR", "Follow the live status and show your secure code at collection."],
              ].map(([number, title, text]) => (
                <article key={number} className="rounded-[24px] border border-line bg-sts-cream p-7 transition-transform hover:-translate-y-1">
                  {/* Dark ink on orange badge — accessible contrast */}
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-sts-orange text-sm font-black text-sts-ink">
                    {number}
                  </span>
                  <h3 className="mt-6 text-xl font-bold text-sts-purple">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Connected journey — neutral, no fake live order state */}
        <section className="landing-reveal bg-sts-cream py-18 md:py-24">
          <div className="mx-auto grid max-w-[1180px] gap-8 px-5 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              {/* Purple kicker on cream */}
              <p className="text-xs font-bold uppercase tracking-[.14em] text-sts-purple">One connected journey</p>
              <h2 className="mt-3 max-w-[12ch] text-4xl font-black leading-tight text-sts-purple md:text-5xl">
                Your order stays with you
              </h2>
              <p className="mt-5 max-w-[52ch] text-base leading-7 text-muted">
                Login, order, kitchen preparation and collection use the same order number, outlet and pickup time.
              </p>
              <Link
                href={ordersHref}
                className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-sts-purple px-5 font-bold text-sts-white hover:no-underline"
              >
                {visitor ? "Open My Orders" : "Sign in to track orders"} <ArrowIcon />
              </Link>
            </div>

            {/* Order-journey illustration — three neutral stages, no fake live status */}
            <motion.div
              whileHover={reduceMotion ? undefined : { y: -4 }}
              className="rounded-[28px] bg-sts-white p-6 shadow-o-md md:p-8"
            >
              <div className="mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  {visitor ? "Your ordering outlet" : "Order journey"}
                </span>
                <h3 className="mt-2 text-2xl font-black text-sts-purple">
                  {visitor?.outletName ?? "Campus Cafeteria"}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {visitor?.campus ?? "Outlet is selected from your account"}
                </p>
              </div>

              {/* Three neutral stage tiles — no highlighted "active" state */}
              <div className="my-6 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                <div className="rounded-xl bg-sts-cream py-3 text-sts-purple">Confirmed</div>
                <div className="rounded-xl bg-sts-cream py-3 text-muted">Preparing</div>
                <div className="rounded-xl bg-sts-cream py-3 text-muted">Ready</div>
              </div>

              <Link
                href={ordersHref}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sts-purple px-5 font-bold text-sts-white hover:no-underline"
              >
                {visitor ? "View my orders" : "Sign in to see orders"} <ArrowIcon />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Featured meals */}
        <section id="meals" className="landing-reveal bg-sts-white py-18 md:py-24">
          <div className="mx-auto max-w-[1180px] px-5">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                {/* Purple kicker on white */}
                <p className="text-xs font-bold uppercase tracking-[.14em] text-sts-purple">Sample menu preview</p>
                <h2 className="mt-3 text-4xl font-black text-sts-purple md:text-5xl">A taste of the menu</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                  Final availability and outlet assignment appear after sign-in.
                </p>
              </div>
              <Link
                href={orderHref}
                className="inline-flex min-h-12 items-center gap-2 self-start rounded-xl border border-sts-purple/20 px-5 font-bold text-sts-purple hover:bg-sts-cream hover:no-underline"
              >
                View full menu <ArrowIcon />
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredMeals.map((meal, index) => (
                <Link
                  key={meal.name}
                  href={orderHref}
                  className="group overflow-hidden rounded-[22px] border border-line bg-sts-white text-sts-ink shadow-o-sm transition hover:-translate-y-1 hover:shadow-o-md hover:no-underline"
                >
                  <div className={`grid h-44 place-items-center ${index % 2 ? "bg-sts-cream" : "bg-sts-purple"}`}>
                    <div
                      className={`grid h-24 w-24 place-items-center rounded-full ${
                        index % 2 ? "bg-sts-white text-sts-orange" : "bg-sts-white/95 text-sts-purple"
                      }`}
                    >
                      <FoodMark icon={meal.icon} />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-sts-purple">{meal.name}</h3>
                    <p className="mt-2 min-h-10 text-xs leading-5 text-muted">{meal.detail}</p>
                    <div className="mt-4 flex items-center justify-between">
                      {/* Price text is 18px bold — qualifies as large text, 3.7:1 on white passes AA large */}
                      <b className="text-lg text-sts-orange">{meal.price}</b>
                      {/* Dark ink on orange arrow circle — accessible contrast */}
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-sts-orange text-sts-ink transition group-hover:translate-x-1">
                        <ArrowIcon />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <BalancedTrayGame />

        {/* Outlets */}
        <section id="outlets" className="landing-reveal bg-sts-cream py-18 md:py-24">
          <div className="mx-auto max-w-[1180px] px-5">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-sts-purple">Confirmed opening hours</p>
              <h2 className="mt-3 text-4xl font-black text-sts-purple md:text-5xl">Find your cafeteria</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {outlets.map((outlet) => (
                <article key={outlet.name} className="rounded-[22px] bg-sts-white p-6 shadow-o-sm">
                  <span className="inline-flex rounded-full bg-success-bg px-3 py-1 text-xs font-bold text-success">
                    Open hours confirmed
                  </span>
                  <h3 className="mt-5 text-xl font-bold text-sts-purple">{outlet.name}</h3>
                  <p className="mt-2 text-sm text-muted">{outlet.campus}</p>
                  <p className="mt-5 border-t border-line pt-5 font-bold text-sts-ink">{outlet.hours}</p>
                </article>
              ))}
            </div>
            <p className="mt-5 text-xs text-muted">
              Your permitted outlet is determined by your campus profile or employee HR record.
            </p>
          </div>
        </section>

        {/* Help */}
        <section id="help" className="landing-reveal bg-sts-white py-18 md:py-24">
          <div className="mx-auto grid max-w-[1180px] gap-8 px-5 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-sts-purple">Help before you order</p>
              <h2 className="mt-3 text-4xl font-black text-sts-purple md:text-5xl">Quick answers</h2>
            </div>
            <div className="divide-y divide-line rounded-[24px] border border-line bg-sts-white px-6">
              {[
                [
                  "How far ahead can I order?",
                  "For today or up to seven days ahead, subject to pickup-slot capacity and cut-off times.",
                ],
                [
                  "How do I collect?",
                  "Use the QR code or order lookup together with customer-name confirmation.",
                ],
                [
                  "Which outlet will I see?",
                  "Parents and students use their selected campus. Employees use the outlet assigned by HR.",
                ],
              ].map(([q, a]) => (
                <details key={q} className="group py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-bold text-sts-purple focus-visible:outline-3 focus-visible:outline-sts-orange">
                    {q}
                    <span className="text-xl text-sts-orange transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-2 pr-8 text-sm leading-6 text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-sts-purple text-sts-white">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-10 md:flex-row md:items-center">
          <div className="rounded-xl bg-sts-white p-2">
            <Image src="/branding/sts-group-logo.png" alt="STS Group" width={100} height={43} />
          </div>
          <p className="text-sm text-sts-white/70">Online cafeteria ordering prototype</p>
          {/* Explicit white text overrides the global `a { color: var(--o-accent) }` rule */}
          <div className="flex flex-wrap gap-5 text-sm md:ml-auto">
            <a href="#how" className="text-sts-white/80 hover:text-sts-white hover:no-underline">How it works</a>
            <a href="#outlets" className="text-sts-white/80 hover:text-sts-white hover:no-underline">Outlets</a>
            <a href="#help" className="text-sts-white/80 hover:text-sts-white hover:no-underline">Help</a>
            <Link href="/demo" className="text-sts-white/80 hover:text-sts-white hover:no-underline">Demo hub</Link>
          </div>
        </div>
      </footer>

      {/* Mobile sticky CTA — fixed above the fold; main has pb-20 md:pb-0 for clearance */}
      <Link
        href={orderHref}
        className="fixed bottom-4 left-4 right-4 z-40 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-so-grad px-6 font-bold text-sts-ink shadow-o-pop hover:no-underline md:hidden"
      >
        Order Now <ArrowIcon />
      </Link>
    </div>
  );
}
