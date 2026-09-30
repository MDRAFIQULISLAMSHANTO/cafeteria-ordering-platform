"use client";

import { useEffect, useRef, useState } from "react";
import { GROUP_LABEL, MEASURES, compactMoney, formatMeasure, type GroupKey, type MeasureKey, type Query } from "@/lib/report-meta";
import { MeasuresMenu } from "./pivot-view";
import { useQueryNav } from "./use-query-nav";

export type GraphData = { measure: MeasureKey; x: { key: string; label: string }[]; series: { key: string; label: string; values: number[] }[]; seriesBy: GroupKey | null; xBy: GroupKey | null; folded: number };

// Categorical colours in fixed order (validated palette, tokens.css --rpt-*);
// "Other" is always neutral so it never reads as a real series.
const color = (key: string, i: number) => (key === "__other" ? "var(--o-text-faint)" : `var(--rpt-${(i % 8) + 1})`);

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(720);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function GraphView({ q, data }: { q: Query; data: GraphData }) {
  const { go } = useQueryNav();
  const m = data.measure;
  const def = MEASURES[m];
  const axis = (v: number) => (def.kind === "money" ? compactMoney(v) : def.kind === "pct" ? `${Math.round(v)}%` : v.toLocaleString("en-IN"));
  const full = (v: number) => formatMeasure(def.kind, v);
  const multi = data.series.length > 1;
  const stacked = multi && def.additive;

  return (
    <div>
      <div className="o-chart-toolbar print:hidden">
        <MeasuresMenu q={q} single />
        <div className="o-switcher" role="group" aria-label="Chart type">
          {([["bar", "Bar chart", "M4 20V10m6 10V4m6 16v-7"], ["line", "Line chart", "m3 17 6-6 4 4 8-8"], ["share", "Share (ranked)", "M4 6h16M4 12h10M4 18h6"]] as const).map(([k, label, d]) => (
            <button key={k} type="button" aria-pressed={q.chart === k} aria-label={label} title={label} onClick={() => go({ gt: k === "bar" ? null : k })}>
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={d} /></svg>
            </button>
          ))}
        </div>
        <span className="text-sm text-muted">
          {def.label}
          {data.xBy ? ` by ${GROUP_LABEL[data.xBy]}` : ""}
          {data.seriesBy && q.chart !== "share" ? `, ${stacked && q.chart === "bar" ? "stacked" : "split"} by ${GROUP_LABEL[data.seriesBy]}` : ""}
        </span>
      </div>
      <div className="o-chart">
        {q.chart === "share" ? <Share data={data} full={full} /> : <Plot key={`${q.chart}:${m}`} data={data} kind={q.chart} stacked={stacked} axis={axis} full={full} />}
      </div>
      {data.folded > 0 && <p className="mt-2 text-xs text-muted">The smallest {data.folded} groups are folded into “Other”.</p>}
    </div>
  );
}

function Legend({ data }: { data: GraphData }) {
  if (data.series.length < 2) return null;
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink" aria-label="Legend">
      {data.series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color(s.key, i) }} />{s.label}
        </li>
      ))}
    </ul>
  );
}

type Tip = { x: number; y: number; title: string; rows: { label: string; value: string; color?: string }[] } | null;

function Plot({ data, kind, stacked, axis, full }: { data: GraphData; kind: "bar" | "line"; stacked: boolean; axis: (v: number) => string; full: (v: number) => string }) {
  const [box, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = data.x.length;
  const minBand = kind === "bar" ? 26 : 18;
  const W = Math.max(width, n * minBand + 70);
  const H = 300;
  const pad = { l: 56, r: 12, t: 12, b: 64 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const sums = data.x.map((_, i) => data.series.reduce((a, s) => a + Math.max(0, s.values[i]), 0));
  const peak = stacked && kind === "bar" ? Math.max(...sums, 0) : Math.max(...data.series.flatMap((s) => s.values), 0);
  const max = niceMax(peak);
  const y = (v: number) => pad.t + ih - (Math.max(0, v) / max) * ih;
  const band = iw / Math.max(1, n);
  const cx = (i: number) => pad.l + band * i + band / 2;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const every = Math.max(1, Math.ceil((n * 64) / iw));
  const rotate = n > 8;

  const showTip = (i: number, e: React.MouseEvent, only?: number) => {
    const rect = box.current!.getBoundingClientRect();
    const rows: { label: string; value: string; color?: string; si: number; v: number }[] = data.series
      .map((s, si) => ({ label: s.label, value: full(s.values[i]), color: color(s.key, si), si, v: s.values[i] }))
      .filter((r) => (only == null ? true : r.si === only));
    if (stacked && only != null && data.series.length > 1) rows.push({ label: "Total", value: full(sums[i]), color: undefined, si: -1, v: sums[i] });
    setTip({ x: e.clientX - rect.left + box.current!.scrollLeft, y: e.clientY - rect.top, title: data.x[i].label, rows });
    setHover(i);
  };

  return (
    <div>
      <Legend data={data} />
      <div ref={box} className="relative overflow-x-auto" onMouseLeave={() => { setTip(null); setHover(null); }}>
        <svg width={W} height={H} role="img" aria-label={`${data.series.map((s) => s.label).join(", ")} by ${data.xBy ? GROUP_LABEL[data.xBy] : "total"}`} className="block">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--o-border)" strokeDasharray={v ? "3 3" : undefined} />
              <text x={pad.l - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--o-text-muted)" className="tabular-nums">{axis(v)}</text>
            </g>
          ))}
          {data.x.map((xk, i) =>
            i % every === 0 ? (
              <text key={xk.key} x={cx(i)} y={H - pad.b + 14} fontSize="11" fill="var(--o-text-muted)" textAnchor={rotate ? "end" : "middle"} transform={rotate ? `rotate(-35 ${cx(i)} ${H - pad.b + 14})` : undefined}>
                {xk.label.length > 18 ? `${xk.label.slice(0, 17)}…` : xk.label}
              </text>
            ) : null,
          )}

          {kind === "bar" &&
            data.x.map((_, i) => {
              const inner = Math.min(40, band * 0.7);
              if (stacked || data.series.length === 1) {
                let base = 0;
                const top = data.series.reduce((last, s, si) => (s.values[i] > 0 ? si : last), -1);
                return (
                  <g key={i}>
                    {data.series.map((s, si) => {
                      const v = Math.max(0, s.values[i]);
                      if (!v) return null;
                      const y0 = y(base), y1 = y(base + v);
                      base += v;
                      const h = Math.max(1, y0 - y1);
                      const r = si === top ? Math.min(4, h, inner / 2) : 0;
                      const x0 = cx(i) - inner / 2;
                      // rounded data end on the top segment only; 2px surface gap between segments
                      const d = r
                        ? `M${x0},${y0} V${y1 + r} Q${x0},${y1} ${x0 + r},${y1} H${x0 + inner - r} Q${x0 + inner},${y1} ${x0 + inner},${y1 + r} V${y0} Z`
                        : `M${x0},${y0} V${y1} H${x0 + inner} V${y0} Z`;
                      return <path key={s.key} d={d} fill={color(s.key, si)} stroke="var(--o-surface)" strokeWidth={data.series.length > 1 ? 2 : 0} opacity={hover == null || hover === i ? 1 : 0.55} onMouseMove={(e) => showTip(i, e, data.series.length > 1 ? si : undefined)} />;
                    })}
                  </g>
                );
              }
              // not additive (averages, margins): bars side by side
              const w = inner / data.series.length;
              return (
                <g key={i}>
                  {data.series.map((s, si) => {
                    const v = Math.max(0, s.values[i]);
                    const x0 = cx(i) - inner / 2 + si * w;
                    return <rect key={s.key} x={x0 + 1} width={Math.max(1, w - 2)} y={y(v)} height={Math.max(0, y(0) - y(v))} rx={Math.min(3, w / 3)} fill={color(s.key, si)} opacity={hover == null || hover === i ? 1 : 0.55} onMouseMove={(e) => showTip(i, e, si)} />;
                  })}
                </g>
              );
            })}

          {kind === "line" && (
            <>
              {hover != null && <line x1={cx(hover)} x2={cx(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--o-border-strong)" />}
              {data.series.map((s, si) => (
                <g key={s.key}>
                  <path d={s.values.map((v, i) => `${i ? "L" : "M"}${cx(i)},${y(v)}`).join(" ")} fill="none" stroke={color(s.key, si)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {s.values.map((v, i) => (
                    <circle key={i} cx={cx(i)} cy={y(v)} r={hover === i ? 5 : n <= 16 ? 3 : 0} fill={color(s.key, si)} stroke="var(--o-surface)" strokeWidth={2} />
                  ))}
                </g>
              ))}
              {data.x.map((xk, i) => (
                <rect key={xk.key} x={cx(i) - band / 2} y={pad.t} width={band} height={ih} fill="transparent" onMouseMove={(e) => showTip(i, e)} />
              ))}
            </>
          )}
        </svg>
        {tip && (
          <div className="pointer-events-none absolute z-10 min-w-40 rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-o-md" style={{ left: Math.min(tip.x + 12, W - 180), top: Math.max(0, tip.y - 12) }}>
            <b className="block text-ink">{tip.title}</b>
            {tip.rows.map((r) => (
              <div key={r.label} className="mt-0.5 flex items-center gap-2">
                {r.color && <span aria-hidden className="inline-block h-2 w-2 rounded-sm" style={{ background: r.color }} />}
                <span className="flex-1 text-muted">{r.label}</span><b className="tabular-nums text-ink">{r.value}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Share of the total as a ranked bar list (no pie: lengths compare better than angles). */
function Share({ data, full }: { data: GraphData; full: (v: number) => string }) {
  const def = MEASURES[data.measure];
  const rows = data.x.map((x, i) => ({ ...x, v: data.series.reduce((a, s) => a + s.values[i], 0) })).sort((a, b) => b.v - a.v);
  const total = rows.reduce((a, r) => a + Math.max(0, r.v), 0) || 1;
  const top = Math.max(...rows.map((r) => r.v), 1);
  if (!def.additive) return <p className="text-sm text-muted">Share needs a measure that adds up (sales, items, profit…). {def.label} is an average — use the bar chart.</p>;
  return (
    <table className="o-rank">
      <thead><tr><th>{data.xBy ? GROUP_LABEL[data.xBy] : "Group"}</th><th className="o-num">{def.short}</th><th className="o-num">Share</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} title={`${r.label}: ${full(r.v)} (${((r.v / total) * 100).toFixed(1)}%)`}>
            <td className="o-rank-label w-[60%]">
              <span aria-hidden className="o-rank-bar" style={{ width: `${Math.max(1, (r.v / top) * 100)}%`, background: "color-mix(in srgb, var(--rpt-1) 22%, transparent)" }} />
              <span>{r.label}</span>
            </td>
            <td className="o-num">{full(r.v)}</td>
            <td className="o-num">{((r.v / total) * 100).toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
