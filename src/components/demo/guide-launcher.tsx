"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEMO_LOGIN, FLOW, LANES, STORIES } from "@/app/guide/flow-data";

// The demo guide as a floating button in the bottom-left corner (like a chat
// widget). Opens a panel with the flow in ten steps and the demo script;
// the full guide with the swimlane diagram is one click away at /guide.

const HIDE_ON = ["/guide", "/status"]; // the guide itself; the pickup TV screen
const LANE_LABEL = Object.fromEntries(LANES.map((l) => [l.id, l.label])) as Record<string, string>;
const LANE_TONE: Record<string, string> = {
  customer: "bg-sts-orange-soft text-sts-orange-text",
  app: "bg-sts-purple-soft text-sts-purple",
  payment: "bg-success-bg text-success",
  kitchen: "bg-warning-bg text-warning",
  counter: "bg-info-bg text-info",
  ops: "bg-neutral-bg text-neutral",
};

export function GuideLauncher() {
  const path = usePathname();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"flow" | "script">("flow");
  const [story, setStory] = useState<number | null>(1);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); button.current?.focus(); }
    };
    const onDown = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  if (HIDE_ON.some((p) => path === p || path.startsWith(`${p}/`)) || path.endsWith("/receipt")) return null;
  // the menu page has a fixed "View order" bar on phones; sit above it
  const lift = path === "/order" ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] cart:bottom-5" : "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))]";

  // closed: z-36, above the phone "View order" bar (z-30) but under the cart drawer (z-40) and dialogs (z-50).
  // open: above everything, including the landing header (z-50).
  return (
    <div className={`fixed left-4 flex flex-col items-start gap-2.5 print:hidden sm:left-5 ${open ? "z-[70]" : "z-[36]"} ${lift}`}>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            id="demo-guide-panel"
            role="dialog"
            aria-label="Demo guide"
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ transformOrigin: "bottom left" }}
            className="flex max-h-[min(470px,calc(100dvh-7.5rem))] w-[min(320px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-sts-hairline bg-sts-white text-sts-ink shadow-sts-float"
          >
            <div className="bg-sts-purple px-4 pb-3 pt-3 text-sts-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-extrabold leading-tight">Demo guide</h2>
                </div>
                <button type="button" aria-label="Close demo guide" onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-full bg-sts-white/15 hover:bg-sts-white/25">
                  <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                </button>
              </div>
              <p className="mt-1 text-2xs leading-snug text-sts-white/80">Login <b className="text-sts-white">{DEMO_LOGIN}</b> · code <b className="text-sts-white">123456</b>. Switch people with <b className="text-sts-white">DEMO</b>.</p>
              <div role="tablist" aria-label="Guide sections" className="mt-2.5 grid grid-cols-2 rounded-full bg-sts-white/12 p-0.5 text-xs font-semibold">
                {([["flow", "How it works"], ["script", "Run the demo"]] as const).map(([id, label]) => (
                  <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-full py-1 ${tab === id ? "bg-sts-white text-sts-purple" : "text-sts-white/85"}`}>{label}</button>
                ))}
              </div>
            </div>

            {/* data-lenis-prevent: the landing's smooth scroll must not swallow wheel events here */}
            <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
              {tab === "flow" ? (
                <ol className="relative flex flex-col gap-2.5">
                  <span aria-hidden className="absolute bottom-3 left-[11px] top-3 w-0.5 rounded bg-sts-orange-soft" />
                  {FLOW.map((s) => (
                    <li key={s.n} className="relative grid grid-cols-[auto_1fr] gap-2.5">
                      <span className="relative z-10 grid h-6 w-6 place-items-center rounded-full bg-sts-orange font-display text-2xs font-bold text-sts-ink">{s.n}</span>
                      <div>
                        <span className={`inline-block rounded-full px-2 py-px text-2xs font-bold ${LANE_TONE[s.lane]}`}>{LANE_LABEL[s.lane]}</span>
                        <p className="mt-0.5 text-xs leading-snug">{s.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="flex flex-col gap-2">
                  <li className="rounded-2xl bg-sts-cream-2 px-3 py-2.5 text-xs text-sts-ink/80">
                    <b className="text-sts-purple">Before you start:</b> press <b>Reset</b> on the demo hub and set the demo clock to a school morning.
                  </li>
                  {STORIES.map((st) => {
                    const on = story === st.n;
                    return (
                      <li key={st.n} className="overflow-hidden rounded-2xl border border-sts-hairline">
                        <button type="button" aria-expanded={on} onClick={() => setStory(on ? null : st.n)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-sts-cream-2">
                          <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-sts-purple font-display text-xs font-bold text-sts-white">{st.n}</span>
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-sm text-sts-purple">{st.title}</b>
                            <small className="text-2xs text-muted">{st.who} · {st.minutes}</small>
                          </span>
                          <svg aria-hidden viewBox="0 0 16 16" className={`h-4 w-4 flex-none text-sts-purple transition-transform ${on ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6l4 4 4-4" /></svg>
                        </button>
                        {on && (
                          <ol className="flex flex-col gap-2.5 border-t border-sts-hairline px-3 py-3">
                            {st.steps.map((s, i) => (
                              <li key={i} className="grid grid-cols-[auto_1fr] gap-2 text-xs">
                                <span className="mt-px grid h-5 w-5 place-items-center rounded-full bg-sts-purple-soft text-2xs font-bold text-sts-purple">{i + 1}</span>
                                <span>
                                  <b className="block text-sts-ink">{s.do}</b>
                                  <span className="text-sts-ink/70">{s.see}</span>
                                  {s.open && <Link href={s.open.href} prefetch={false} onClick={() => setOpen(false)} className="ml-1.5 whitespace-nowrap font-semibold text-sts-purple underline">{s.open.label} →</Link>}
                                </span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex gap-2 border-t border-sts-hairline bg-sts-cream-2 px-3 py-2.5">
              <Link href="/" prefetch={false} onClick={() => setOpen(false)} aria-label="Back to home" title="Back to home" className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-sts-purple shadow-[0_0_0_1.5px_var(--sts-hairline)] hover:no-underline">
                <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 10 3.5l7 6M5 8v8.5h10V8" /></svg>
                Home
              </Link>
              <Link href="/guide" prefetch={false} target="_blank" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sts-purple px-3 py-2 text-xs font-bold text-sts-white hover:no-underline">
                Full guide <span aria-hidden>↗</span>
              </Link>
              <Link href="/demo" prefetch={false} target="_blank" className="flex items-center justify-center rounded-lg px-3 py-2 text-xs font-bold text-sts-purple shadow-[0_0_0_1.5px_var(--sts-hairline)] hover:no-underline">
                Demo hub
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="demo-guide-panel"
        aria-label={open ? "Close demo guide" : "Open demo guide"}
        onClick={() => setOpen((o) => !o)}
        whileHover={reduce ? undefined : { y: -2 }}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        title={open ? "Close demo guide" : "Demo guide"}
        className="relative grid h-11 w-11 place-items-center rounded-full bg-sts-orange text-sts-ink shadow-sts-float ring-2 ring-sts-white"
      >
        {!open && !reduce && <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full bg-sts-orange/40 [animation-duration:2.4s] [animation-iteration-count:3]" />}
        {open ? (
          <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>
        ) : (
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z" /><path d="M8 7.5h8M8 11h6" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
