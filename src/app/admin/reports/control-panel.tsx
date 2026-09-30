"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACCOUNT_LABEL, CHANNEL_LABEL, GROUP_LABEL, GROUP_SECTIONS, PAYMENT_LABEL, PERIOD_LABEL, SEARCH_FIELDS, STATUS_LABEL, TOD_LABEL,
  niceDate, type GroupKey, type Period, type Query, type Status,
} from "@/lib/report-meta";
import { useQueryNav } from "./use-query-nav";

type Outlet = { id: string; name: string };

const shift = (d: string, days: number) => new Date(Date.parse(`${d}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const span = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

/** Saved searches: each sets a real filter and grouping (Odoo "Favorites"). */
const FAVORITES: { label: string; set: Record<string, string | null> }[] = [
  { label: "Daily sales by outlet", set: { v: "graph", gt: "bar", g: "day", c: "outlet", m: "revenue", st: null } },
  { label: "Best-selling products", set: { v: "pivot", g: "product", c: null, m: "qty,revenue,profit", st: null } },
  { label: "Profit by category", set: { v: "pivot", g: "category", c: null, m: "revenue,net,cost,profit,margin", st: null } },
  { label: "Busiest pickup times", set: { v: "graph", gt: "bar", g: "slot", c: "account", m: "orders", st: null } },
  { label: "Payment methods", set: { v: "graph", gt: "share", g: "payment", c: null, m: "revenue", st: null } },
  { label: "Sales by day of week", set: { v: "graph", gt: "line", g: "weekday", c: "outlet", m: "revenue", st: null } },
  { label: "Top customers", set: { v: "pivot", g: "customer", c: null, m: "orders,revenue,aov", st: null } },
  { label: "Cancelled and rejected", set: { v: "list", g: "status", c: null, m: "revenue", st: "all" } },
];

function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}
const I = {
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.35-4.35",
  filter: "M3 5h18l-7 8v6l-4 2v-8z",
  group: "M4 6h16M4 12h10M4 18h6",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  pivot: "M3 3h18v18H3zM3 9h18M9 3v18",
  graph: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  caret: "m6 9 6 6 6-6",
};

function useOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", on);
    document.addEventListener("keydown", on);
    return () => { document.removeEventListener("mousedown", on); document.removeEventListener("keydown", on); };
  }, [open, close]);
  return ref;
}

export function ControlPanel({ q, outlets, sampleOrders }: { q: Query; outlets: Outlet[]; sampleOrders: number }) {
  const { go, pending } = useQueryNav();
  const [panel, setPanel] = useState(false);
  const [text, setText] = useState("");
  const [hi, setHi] = useState(0);
  const searchBox = useOutside<HTMLDivElement>(panel || Boolean(text), () => { setPanel(false); setText(""); });

  const toggleIn = (param: string, current: string[], value: string) => {
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    go({ [param]: next.join(",") || null });
  };
  const groupToggle = (g: GroupKey) => {
    const cur = q.groups;
    const next = cur.includes(g) ? cur.filter((x) => x !== g) : cur.length >= 2 ? [cur[0], g] : [...cur, g];
    go({ g: next.length ? next.join(",") : "-", c: q.col === g ? null : q.col });
  };
  const pickSearch = (param: string) => {
    if (!text.trim()) return;
    go({ [param]: text.trim() });
    setText("");
    setHi(0);
  };

  type Facet = { key: string; icon: "filter" | "group" | "search"; label: string; value: string; clear: Record<string, string | null> };
  const facets: Facet[] = [];
  if (q.status !== "all") facets.push({ key: "st", icon: "filter", label: "Status", value: STATUS_LABEL[q.status], clear: { st: "all" } });
  const multi = (param: string, label: string, values: string[], names: Record<string, string>) => {
    if (values.length) facets.push({ key: param, icon: "filter", label, value: values.map((v) => names[v] ?? v).join(" or "), clear: { [param]: null } });
  };
  multi("o", "Outlet", q.outlets, Object.fromEntries(outlets.map((o) => [o.id, o.name])));
  multi("a", "Customer type", q.accounts, ACCOUNT_LABEL);
  multi("ch", "Channel", q.channels, CHANNEL_LABEL);
  multi("pm", "Payment", q.payments, PAYMENT_LABEL);
  multi("tod", "Pickup", q.tod, TOD_LABEL);
  if (!q.sample) facets.push({ key: "sm", icon: "filter", label: "Sample history", value: "hidden", clear: { sm: null } });
  const searched: Record<string, string> = { sp: q.product, scat: q.category, sc: q.customer, so: q.order };
  for (const f of SEARCH_FIELDS) if (searched[f.param]) facets.push({ key: f.param, icon: "search", label: f.label, value: searched[f.param], clear: { [f.param]: null } });
  if (q.groups.length) facets.push({ key: "g", icon: "group", label: "Group by", value: q.groups.map((g) => GROUP_LABEL[g]).join(" › "), clear: { g: "-" } });

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !text && facets.length) go(facets[facets.length - 1].clear);
    if (!text) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => (h + 1) % SEARCH_FIELDS.length); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h + SEARCH_FIELDS.length - 1) % SEARCH_FIELDS.length); }
    if (e.key === "Enter") { e.preventDefault(); pickSearch(SEARCH_FIELDS[hi].param); }
  };

  const item = (on: boolean, label: string, onClick: () => void, key?: string) => (
    <button key={key ?? label} type="button" aria-pressed={on} className="o-dd-item" onClick={onClick}>
      <span className={`inline-block w-3 text-center ${on ? "text-success" : "text-transparent"}`}>✓</span>{label}
    </button>
  );

  return (
    <div className="o-cp flex-wrap !gap-y-2 print:hidden" aria-busy={pending}>
      <div className="o-cp-left">
        <div className="o-cp-titlewrap">
          <div className="o-breadcrumb">Reporting</div>
          <h1 className="m-0 text-lg font-semibold leading-tight">Sales Analysis</h1>
        </div>
      </div>

      <div className="o-cp-mid order-last basis-full md:order-none md:basis-auto">
        <div ref={searchBox} className="relative w-full max-w-[720px]">
          <div className="o-search flex-wrap !h-auto min-h-(--o-h-control) py-0.5">
            <span className="o-search-icon"><Icon d={I.search} /></span>
            {facets.map((f) => (
              <span key={f.key} className="o-facet">
                <span className="o-facet-k" aria-hidden><Icon d={I[f.icon === "search" ? "search" : f.icon]} className="h-3.5 w-3.5" /></span>
                <span className="o-facet-v"><span className="sr-only text-muted sm:not-sr-only">{f.label}:&nbsp;</span>{f.value}</span>
                <button type="button" className="o-facet-x" aria-label={`Remove ${f.label} ${f.value}`} onClick={() => go(f.clear)}>✕</button>
              </span>
            ))}
            <input
              value={text}
              onChange={(e) => { setText(e.target.value); setHi(0); setPanel(false); }}
              onKeyDown={onKey}
              placeholder={facets.length ? "" : "Search…"}
              aria-label="Search sales"
              role="combobox"
              aria-expanded={Boolean(text)}
              aria-controls="report-search-options"
            />
            <button type="button" className="o-search-icon px-1" aria-label="Toggle search panel" aria-expanded={panel} onClick={() => { setPanel((p) => !p); setText(""); }}>
              <Icon d={I.caret} />
            </button>
          </div>

          {text && (
            <div id="report-search-options" role="listbox" className="o-dropdown left-0 right-0 top-full mt-1">
              {SEARCH_FIELDS.map((f, i) => (
                <button key={f.param} type="button" role="option" aria-selected={i === hi} className={`o-dd-item ${i === hi ? "bg-surface-3" : ""}`} onMouseEnter={() => setHi(i)} onClick={() => pickSearch(f.param)}>
                  Search <b>{f.label}</b> for: <i className="truncate">{text}</i>
                </button>
              ))}
            </div>
          )}

          {panel && (
            <div className="o-dropdown o-searchpanel-pop left-1/2 top-full mt-1 -translate-x-1/2 !p-0" role="dialog" aria-label="Filters, group by and favorites">
              <div className="o-searchpanel max-h-[70vh] overflow-y-auto">
                <div className="o-sp-filter">
                  <div className="o-sp-head"><span><Icon d={I.filter} /></span>Filters</div>
                  {(Object.keys(STATUS_LABEL) as Status[]).map((s) => item(q.status === s, STATUS_LABEL[s], () => go({ st: s === "sales" ? null : s }), `st-${s}`))}
                  <div className="o-dd-sep" />
                  {Object.entries(ACCOUNT_LABEL).map(([k, v]) => item(q.accounts.includes(k), v, () => toggleIn("a", q.accounts, k), `a-${k}`))}
                  <div className="o-dd-sep" />
                  {Object.entries(CHANNEL_LABEL).map(([k, v]) => item(q.channels.includes(k), v, () => toggleIn("ch", q.channels, k), `ch-${k}`))}
                  <div className="o-dd-sep" />
                  {Object.entries(PAYMENT_LABEL).filter(([k]) => k !== "none").map(([k, v]) => item(q.payments.includes(k), v, () => toggleIn("pm", q.payments, k), `pm-${k}`))}
                  <div className="o-dd-sep" />
                  {Object.entries(TOD_LABEL).map(([k, v]) => item(q.tod.includes(k), v, () => toggleIn("tod", q.tod, k), `tod-${k}`))}
                  <div className="o-dd-sep" />
                  <div className="o-dd-section">Outlet</div>
                  {outlets.map((o) => item(q.outlets.includes(o.id), o.name, () => toggleIn("o", q.outlets, o.id), `o-${o.id}`))}
                  {sampleOrders > 0 && (
                    <>
                      <div className="o-dd-sep" />
                      {item(!q.sample, "Hide sample history", () => go({ sm: q.sample ? "0" : null }), "sm")}
                    </>
                  )}
                </div>
                <div className="o-sp-group">
                  <div className="o-sp-head"><span><Icon d={I.group} /></span>Group By</div>
                  {GROUP_SECTIONS.map((sec, i) => (
                    <div key={i}>
                      {i > 0 && <div className="o-dd-sep" />}
                      {sec.map((g) => item(q.groups.includes(g), `${GROUP_LABEL[g]}${q.groups.indexOf(g) === 1 ? " (2nd level)" : ""}`, () => groupToggle(g), `g-${g}`))}
                    </div>
                  ))}
                  <p className="px-6 pt-2 text-2xs text-muted">Up to two levels. Pick columns from the pivot&apos;s “Total” header.</p>
                </div>
                <div className="o-sp-favorite">
                  <div className="o-sp-head"><span><Icon d={I.star} /></span>Favorites</div>
                  {FAVORITES.map((f) => (
                    <button key={f.label} type="button" className="o-dd-item" onClick={() => { go(f.set); setPanel(false); }}>{f.label}</button>
                  ))}
                  <div className="o-dd-sep" />
                  <button type="button" className="o-dd-item text-muted" onClick={() => { go({ st: null, o: null, a: null, ch: null, pm: null, tod: null, sm: null, sp: null, scat: null, sc: null, so: null, g: null, c: null, m: null }); setPanel(false); }}>Reset to default</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="o-cp-right flex-wrap">
        <PeriodPill q={q} />
        <div className="o-switcher" role="group" aria-label="View">
          {(["pivot", "graph", "list"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={q.view === v} aria-label={`${v[0].toUpperCase()}${v.slice(1)} view`} title={`${v[0].toUpperCase()}${v.slice(1)}`} onClick={() => go({ v: v === "pivot" ? null : v })}>
              <Icon d={I[v]} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One period for the whole page: a pill with a step either side (Odoo dashboards). */
export function PeriodPill({ q }: { q: Query }) {
  const { go } = useQueryNav();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(q.from);
  const [to, setTo] = useState(q.to);
  const box = useOutside<HTMLDivElement>(open, () => setOpen(false));
  const len = span(q.from, q.to);
  const step = (dir: -1 | 1) => go({ p: "custom", from: shift(q.from, dir * len), to: shift(q.to, dir * len) });
  const label = q.period === "custom" ? (q.from === q.to ? niceDate(q.from, true) : `${niceDate(q.from)} – ${niceDate(q.to, true)}`) : PERIOD_LABEL[q.period];
  return (
    <div ref={box} className="o-daterange relative">
      <button type="button" className="o-daterange-step" aria-label="Previous period" onClick={() => step(-1)}>‹</button>
      <button type="button" className="o-daterange-pill" aria-expanded={open} onClick={() => { setFrom(q.from); setTo(q.to); setOpen((v) => !v); }}>
        <span className="font-semibold">{label}</span>
        {q.period !== "custom" && <span className="hidden text-muted lg:inline">{q.from === q.to ? niceDate(q.from) : `${niceDate(q.from)} – ${niceDate(q.to)}`}</span>}
      </button>
      <button type="button" className="o-daterange-step" aria-label="Next period" onClick={() => step(1)}>›</button>
      {open && (
        <div className="o-dropdown right-0 top-full mt-1 w-64" role="dialog" aria-label="Period">
          {(Object.keys(PERIOD_LABEL) as Period[]).filter((p) => p !== "custom").map((p) => (
            <button key={p} type="button" className={`o-dd-item ${q.period === p ? "font-semibold" : ""}`} onClick={() => { go({ p: p === "last30" ? null : p, from: null, to: null }); setOpen(false); }}>
              {PERIOD_LABEL[p]}
            </button>
          ))}
          <div className="o-dd-sep" />
          <form className="flex flex-col gap-2 px-4 py-2" onSubmit={(e) => { e.preventDefault(); go({ p: "custom", from, to }); setOpen(false); }}>
            <label className="flex items-center justify-between gap-2 text-sm">From <input type="date" className="o-input w-36" value={from} max={to} onChange={(e) => setFrom(e.target.value)} required /></label>
            <label className="flex items-center justify-between gap-2 text-sm">To <input type="date" className="o-input w-36" value={to} min={from} onChange={(e) => setTo(e.target.value)} required /></label>
            <button className="o-btn o-btn-primary o-btn-sm self-end">Apply</button>
          </form>
        </div>
      )}
    </div>
  );
}
