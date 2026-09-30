"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { FLOW, LANES, STAGES, SUPPORT, type Lane } from "./flow-data";

// Swimlane diagram of one order, from sign-in to collection. Lanes are who
// (or what) acts; columns are the stages. Numbered cards are the main flow
// and are joined by arrows drawn from their measured positions; dashed cards
// are the supporting work around it.

type Path = { d: string; key: string };

export function Swimlane() {
  const box = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<Path[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const draw = () => {
      const base = el.getBoundingClientRect();
      const rect = (n: number) => {
        const r = el.querySelector<HTMLElement>(`[data-step="${n}"]`)!.getBoundingClientRect();
        return { l: r.left - base.left, r: r.right - base.left, t: r.top - base.top, b: r.bottom - base.top, cx: r.left - base.left + r.width / 2, cy: r.top - base.top + r.height / 2 };
      };
      const out: Path[] = [];
      for (let i = 1; i < FLOW.length; i++) {
        const a = rect(i);
        const b = rect(i + 1);
        let d: string;
        if (b.l > a.r) {
          // to a later stage: leave from the right, enter from the left
          const mx = (a.r + b.l) / 2;
          d = `M ${a.r} ${a.cy} C ${mx} ${a.cy}, ${mx} ${b.cy}, ${b.l - 6} ${b.cy}`;
        } else if (b.t > a.b) {
          d = `M ${a.cx} ${a.b} C ${a.cx} ${(a.b + b.t) / 2}, ${b.cx} ${(a.b + b.t) / 2}, ${b.cx} ${b.t - 6}`;
        } else {
          d = `M ${a.cx} ${a.t} C ${a.cx} ${(a.t + b.b) / 2}, ${b.cx} ${(a.t + b.b) / 2}, ${b.cx} ${b.b + 6}`;
        }
        out.push({ d, key: `${i}` });
      }
      setPaths(out);
      setSize({ w: el.scrollWidth, h: el.scrollHeight });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    document.fonts?.ready.then(draw).catch(() => {});
    return () => ro.disconnect();
  }, []);

  const cell = (lane: Lane, stage: number) => [...FLOW, ...SUPPORT].filter((c) => c.lane === lane && c.stage === stage);

  return (
    <div className="overflow-x-auto rounded-3xl border border-sts-hairline bg-sts-white shadow-sts-card" role="region" aria-label="Swimlane diagram of the ordering flow" tabIndex={0}>
      <div ref={box} className="relative min-w-[1040px] p-4">
        <svg aria-hidden className="pointer-events-none absolute inset-0 z-10" width={size.w} height={size.h}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sts-orange)" />
            </marker>
          </defs>
          {paths.map((p) => (
            <path key={p.key} d={p.d} fill="none" stroke="var(--sts-orange)" strokeWidth="2.2" strokeDasharray="6 5" markerEnd="url(#arrow)" className="guide-flow" />
          ))}
        </svg>

        <div className="grid grid-cols-[170px_repeat(6,minmax(0,1fr))] gap-x-3">
          <div />
          {STAGES.map((s, i) => (
            <div key={s} className="mb-2 rounded-xl bg-sts-purple px-3 py-2 text-center text-sm font-bold text-sts-white">
              <span className="mr-1 text-sts-orange-soft">{i + 1}</span> {s}
            </div>
          ))}
          {LANES.map((lane, li) => (
            <div key={lane.id} className="contents">
              <div className={`flex flex-col justify-center border-t border-sts-hairline py-3 pr-2 ${li % 2 ? "" : ""}`}>
                <b className="font-display text-base text-sts-purple">{lane.label}</b>
                <small className="text-2xs text-muted">{lane.sub}</small>
              </div>
              {STAGES.map((_, si) => (
                <div key={si} className={`flex min-h-24 flex-col justify-center gap-2 border-t border-sts-hairline py-3 ${li % 2 ? "bg-sts-cream-2/60" : ""}`}>
                  {cell(lane.id, si).map((c) =>
                    c.n ? (
                      <div key={c.text} data-step={c.n} className="relative z-20 rounded-2xl border-2 border-sts-orange bg-sts-white p-2.5 text-xs leading-snug text-sts-ink shadow-sm">
                        <span className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-sts-orange text-2xs font-bold text-sts-ink">{c.n}</span>
                        {c.text}
                      </div>
                    ) : (
                      <div key={c.text} className="relative z-20 rounded-2xl border border-dashed border-sts-purple/35 bg-sts-purple-soft/60 p-2.5 text-xs leading-snug text-sts-purple">
                        {c.text}
                      </div>
                    ),
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
