"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FoodArt } from "@/components/food/food-art";
import type { LandingData } from "@/lib/landing-data";
import { money } from "@/lib/rules";
import { handOff } from "@/lib/tray-handoff";
import { GROUPS, budgetFor, deal, filled, seedFrom, stars, total, type Group, type Hand, type Tray } from "./tray-logic";
import { useCan3D } from "./use-can-3d";

const Tray3D = dynamic(() => import("./tray-3d"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading 3D tray…</div> });

const BELL_SECONDS = 60;

function TrayFlat({ tray }: { tray: Tray }) {
  return (
    <div className="mx-auto aspect-[4/3] w-full max-w-[520px] rounded-[2rem] bg-[linear-gradient(145deg,var(--sts-purple)_0%,var(--sts-purple-deep)_100%)] p-[3.5%] shadow-sts-float">
      <div className="grid h-full grid-cols-2 grid-rows-2 gap-[3.5%] rounded-[1.6rem] bg-sts-cream p-[3.5%]">
        {GROUPS.map((g) => {
          const it = tray[g.id];
          return (
            <div key={g.id} className="relative grid place-items-center overflow-hidden rounded-[1.2rem] bg-sts-white">
              {!it && <span className="text-xs font-semibold uppercase tracking-wider text-sts-purple/40">{g.label}</span>}
              {it && (
                <motion.div layoutId={`art-${it.id}`} className="h-[88%]" transition={{ type: "spring", stiffness: 260, damping: 22 }}>
                  <FoodArt kind={it.look.kind} tint={it.look.tint} steam={false} className="h-full w-auto drop-shadow-[0_8px_8px_var(--sts-drop)]" />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Confetti() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const bits = Array.from({ length: 22 }, (_, i) => i);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((i) => (
        <motion.span
          key={i}
          className={`absolute top-1/2 left-1/2 h-2.5 w-1.5 rounded-sm ${i % 3 === 0 ? "bg-sts-orange" : i % 3 === 1 ? "bg-sts-purple" : "bg-sts-lilac"}`}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: Math.cos(i * 0.9) * (120 + (i % 5) * 30), y: Math.sin(i * 0.9) * (90 + (i % 4) * 30) - 40, opacity: 0, rotate: i * 40 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function BalancedTray({ data, orderHref }: { data: LandingData; orderHref: string }) {
  const router = useRouter();
  const can3d = useCan3D();
  const [show3d, setShow3d] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [seed, setSeed] = useState(() => seedFrom(`${data.outlet.id}:${data.now.date}`));
  const hand: Hand = useMemo(() => deal(data.game, seed), [data.game, seed]);
  const budget = useMemo(() => budgetFor(hand), [hand]);
  const [tray, setTray] = useState<Tray>({});
  const [challenge, setChallenge] = useState(false);
  const [left, setLeft] = useState(BELL_SECONDS);
  const [running, setRunning] = useState(false);
  const [announce, setAnnounce] = useState("");

  const spent = total(tray);
  const done = filled(tray, hand);
  const over = spent > budget;
  // the bell only runs in challenge mode, stops when the tray is full or time is up
  const ticking = challenge && running && left > 0 && !done;
  const bellRang = challenge && left === 0 && !done;
  const beat = challenge && done && left > 0;
  const finished = done || bellRang;
  const result = stars(tray, hand, budget, challenge, beat);
  const use3d = !declined && (can3d === "yes" || (can3d === "tap" && show3d));

  useEffect(() => {
    if (!ticking) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [ticking]);

  const pick = (g: Group, id: string) => {
    if (bellRang) return;
    if (challenge && !running) setRunning(true);
    const it = hand[g].find((x) => x.id === id)!;
    const next = { ...tray, [g]: tray[g]?.id === id ? undefined : it };
    const n = GROUPS.filter((x) => next[x.id]).length;
    setTray(next);
    setAnnounce(`${next[g] ? `${it.name} on your tray` : `${it.name} removed`}. ${n} of 4 filled, ${money(total(next))} of ${money(budget)}.`);
  };

  const reset = (newDeal: boolean) => {
    if (newDeal) setSeed((s) => (s * 16807 + Date.now()) >>> 0);
    setTray({});
    setLeft(BELL_SECONDS);
    setRunning(false);
    setAnnounce(newDeal ? "New cards dealt." : "Tray cleared.");
  };

  const orderIt = () => {
    const items = GROUPS.map((g) => tray[g.id]).filter((x) => x != null);
    handOff(items.map((i) => ({ id: i.id, name: i.name })));
    router.push(orderHref);
  };

  if (data.game.length < 4) return null;

  return (
    <section id="play" aria-labelledby="play-title" className="relative overflow-hidden bg-sts-purple-soft py-16 md:py-24">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-sts-orange-text">Play · two minutes</p>
            <h2 id="play-title" className="mt-2 font-display text-[clamp(2rem,3vw+.8rem,3.4rem)] font-extrabold leading-none tracking-[-.03em] text-sts-purple">Build a balanced tray</h2>
            <p className="mt-3 text-sts-ink/75">One main, one side, one drink and one treat from today&apos;s real menu — and keep it within budget. Like it? Send the tray to your order.</p>
          </div>
          <div role="radiogroup" aria-label="Game mode" className="flex rounded-full bg-sts-white p-1 shadow-[0_0_0_1px_var(--sts-hairline)]">
            {[["Relaxed", false], ["Bell challenge · 60 s", true]].map(([label, value]) => (
              <button
                key={String(label)}
                role="radio"
                aria-checked={challenge === value}
                onClick={() => { setChallenge(value as boolean); reset(false); }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${challenge === value ? "bg-sts-purple text-sts-white" : "text-sts-purple"}`}
              >
                {String(label)}
              </button>
            ))}
          </div>
        </div>

        <LayoutGroup>
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
            {/* the tray */}
            <div data-reveal className="relative lg:sticky lg:top-24">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-xs font-semibold text-sts-purple">
                    <span>Spent {money(spent)}</span><span>Budget {money(budget)}</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-sts-white" role="meter" aria-label="Budget used" aria-valuemin={0} aria-valuemax={budget} aria-valuenow={spent}>
                    <motion.div className={`h-full rounded-full ${over ? "bg-danger" : "bg-sts-orange"}`} animate={{ width: `${Math.min(100, (spent / budget) * 100)}%` }} transition={{ type: "spring", stiffness: 160, damping: 24 }} />
                  </div>
                </div>
                {challenge && (
                  <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 font-display text-lg font-bold tabular-nums ${left <= 10 && ticking ? "bg-danger text-primary-ink" : "bg-sts-white text-sts-purple"}`}>
                    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 13V9M9 2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><motion.path d="M12 13l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" animate={ticking ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} style={{ originX: "12px", originY: "13px" }} /></svg>
                    {left}s
                    {ticking && <button className="ml-1 text-xs underline" onClick={() => setRunning(false)}>Pause</button>}
                    {!running && left > 0 && left < BELL_SECONDS && !done && <button className="ml-1 text-xs underline" onClick={() => setRunning(true)}>Resume</button>}
                    {!running && left === BELL_SECONDS && <span className="text-xs font-semibold">starts on your first pick</span>}
                  </div>
                )}
              </div>

              <div className="relative">
                {use3d ? (
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_50%_40%,var(--sts-white)_0%,var(--sts-purple-soft)_75%)]">
                    <Tray3D tray={tray} onDecline={() => setDeclined(true)} />
                    <span className="absolute bottom-3 left-4 text-2xs font-semibold text-sts-purple/70">3D · move the pointer to tilt</span>
                  </div>
                ) : (
                  <TrayFlat tray={tray} />
                )}
                {can3d === "tap" && !show3d && (
                  <button className="absolute right-3 top-3 rounded-full bg-sts-white px-3 py-1.5 text-xs font-bold text-sts-purple shadow-sts-card" onClick={() => setShow3d(true)}>View in 3D</button>
                )}
                {finished && done && <Confetti />}
              </div>

              <AnimatePresence>
                {finished && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-3xl bg-sts-white p-5 shadow-sts-card">
                    <b className="font-display text-xl text-sts-purple">{done ? (over ? "Full tray — a little over budget" : "Balanced and on budget!") : "The bell rang!"}</b>
                    <ul className="mt-2 flex flex-col gap-1 text-sm">
                      {result.map((s) => (
                        <li key={s.label} className={`flex items-center gap-2 ${s.earned ? "text-sts-ink" : "text-muted"}`}>
                          <span aria-hidden className={s.earned ? "text-sts-orange" : "text-sts-ornament"}>★</span>{s.label}<span className="sr-only">{s.earned ? " — earned" : " — not earned"}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {done && <button onClick={orderIt} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-sts-action px-5 font-bold text-sts-ink shadow-[var(--sts-action-shadow)]">Order this tray · {money(spent)} →</button>}
                      <button onClick={() => reset(true)} className="min-h-11 rounded-2xl px-5 font-bold text-sts-purple shadow-[0_0_0_1.5px_var(--sts-hairline)]">Deal again</button>
                    </div>
                    <p className="mt-3 text-2xs text-muted">Just for fun — no prizes or discounts. Prices are today&apos;s menu prices at {data.outlet.name}.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* the cards */}
            <div className="flex flex-col gap-5">
              {GROUPS.map((g) => (
                <fieldset key={g.id} data-reveal>
                  <legend className="mb-2 flex items-baseline gap-2">
                    <b className="font-display text-lg text-sts-purple">{g.label}</b>
                    <span className="text-xs text-muted">{g.hint}</span>
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {hand[g.id].map((it) => {
                      const on = tray[g.id]?.id === it.id;
                      return (
                        <button
                          key={it.id}
                          type="button"
                          aria-pressed={on}
                          disabled={bellRang}
                          onClick={() => pick(g.id, it.id)}
                          className={`flex flex-col items-center gap-1 rounded-2xl bg-sts-white p-2 text-center transition-shadow disabled:opacity-60 ${on ? "shadow-[0_0_0_2.5px_var(--sts-orange)]" : "shadow-[0_0_0_1px_var(--sts-hairline)] hover:shadow-sts-card"}`}
                        >
                          <span className="grid aspect-square w-[78%] place-items-center">
                            {!on ? (
                              <motion.span layoutId={`art-${it.id}`} className="block h-full w-full">
                                <FoodArt kind={it.look.kind} tint={it.look.tint} steam={false} className="h-full w-full" />
                              </motion.span>
                            ) : (
                              <span aria-hidden className="grid h-full w-full place-items-center rounded-full border-2 border-dashed border-sts-orange/60 text-2xl text-sts-orange">✓</span>
                            )}
                          </span>
                          <span className="line-clamp-2 min-h-8 text-xs font-semibold leading-tight text-sts-ink">{it.name}</span>
                          <span className="font-display text-sm font-bold text-sts-purple">{money(it.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <div className="flex gap-2">
                <button onClick={() => reset(false)} className="min-h-10 rounded-xl px-4 text-sm font-semibold text-sts-purple hover:bg-sts-white">Clear tray</button>
                <button onClick={() => reset(true)} className="min-h-10 rounded-xl px-4 text-sm font-semibold text-sts-purple hover:bg-sts-white">Deal new cards</button>
              </div>
            </div>
          </div>
        </LayoutGroup>
        <p className="sr-only" aria-live="polite">{announce}</p>
      </div>
    </section>
  );
}
