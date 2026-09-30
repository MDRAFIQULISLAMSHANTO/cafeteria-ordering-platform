"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { GROUP_LABEL, GROUP_SECTIONS, MEASURES, MEASURE_KEYS, formatMeasure, type GroupKey, type MeasureKey, type Query } from "@/lib/report-meta";
import { useQueryNav } from "./use-query-nav";

type Totals = Record<MeasureKey, number>;
type Row = { id: string; label: string; depth: number; values: Totals; cells: Totals[]; hasChildren: boolean; parent: string | null };
export type PivotData = { rows: Row[]; cols: { key: string; label: string }[]; total: Totals; colTotals: Totals[]; colsCut: number };

function Dropdown({ label, children, align = "left", title }: { label: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; title?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", on);
    document.addEventListener("keydown", on);
    return () => { document.removeEventListener("mousedown", on); document.removeEventListener("keydown", on); };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" className="o-btn" aria-expanded={open} aria-haspopup="menu" title={title} onClick={() => setOpen((v) => !v)}>{label}</button>
      {open && <div role="menu" className={`o-dropdown top-full mt-1 max-h-[60vh] overflow-y-auto ${align === "right" ? "right-0" : "left-0"}`}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

/** Measures ▾ — several in the pivot and list, one in the graph (as in Odoo). */
export function MeasuresMenu({ q, single = false }: { q: Query; single?: boolean }) {
  const { go } = useQueryNav();
  const set = (m: MeasureKey) => {
    if (single) return go({ m: [m, ...q.measures.filter((x) => x !== m)].join(",") });
    const next = q.measures.includes(m) ? q.measures.filter((x) => x !== m) : MEASURE_KEYS.filter((k) => k === m || q.measures.includes(k));
    if (next.length) go({ m: next.join(",") });
  };
  return (
    <Dropdown label={<>Measures <span aria-hidden>▾</span></>}>
      {() => MEASURE_KEYS.map((k) => {
        const on = single ? q.measures[0] === k : q.measures.includes(k);
        return (
          <button key={k} type="button" role={single ? "menuitemradio" : "menuitemcheckbox"} aria-checked={on} className="o-dd-item" onClick={() => set(k)}>
            <span className={`inline-block w-3 ${on ? "text-success" : "text-transparent"}`}>✓</span>{MEASURES[k].label}
          </button>
        );
      })}
    </Dropdown>
  );
}

function GroupMenu({ onPick, exclude, current, onClear }: { onPick: (g: GroupKey) => void; exclude: GroupKey[]; current: GroupKey | null; onClear?: () => void }) {
  return (
    <>
      {onClear && current && <button type="button" className="o-dd-item" onClick={onClear}>Collapse columns</button>}
      {onClear && current && <div className="o-dd-sep" />}
      {GROUP_SECTIONS.map((sec, i) => (
        <Fragment key={i}>
          {i > 0 && <div className="o-dd-sep" />}
          {sec.filter((g) => !exclude.includes(g)).map((g) => (
            <button key={g} type="button" className={`o-dd-item ${current === g ? "font-semibold" : ""}`} onClick={() => onPick(g)}>{GROUP_LABEL[g]}</button>
          ))}
        </Fragment>
      ))}
    </>
  );
}

const fmt = (m: MeasureKey, v: number) => formatMeasure(MEASURES[m].kind, v);

export function PivotView({ q, data }: { q: Query; data: PivotData }) {
  const { go } = useQueryNav();
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [rootOpen, setRootOpen] = useState(true);
  const ms = q.measures;
  const hasCols = data.cols.length > 0;
  const visible = data.rows.filter((r) => rootOpen && (!r.parent || !closed.has(r.parent)));
  const parents = data.rows.filter((r) => r.hasChildren).map((r) => r.id);

  const flip = () => {
    // rows ⇄ columns: the column grouping becomes the rows and the first row grouping the columns
    if (q.col) go({ g: q.col, c: q.groups[0] ?? null });
    else if (q.groups[0]) go({ g: q.groups[1] ?? "-", c: q.groups[0] });
  };

  const download = () => {
    const head = ["Group", ...(hasCols ? data.cols.flatMap((c) => ms.map((m) => `${c.label} · ${MEASURES[m].short}`)) : []), ...ms.map((m) => `Total · ${MEASURES[m].short}`)];
    const val = (m: MeasureKey, v: number) => (MEASURES[m].kind === "money" ? (v / 100).toFixed(2) : MEASURES[m].kind === "pct" ? v.toFixed(1) : String(v));
    const line = (label: string, cells: Totals[], values: Totals) => [label, ...cells.flatMap((c) => ms.map((m) => val(m, c[m]))), ...ms.map((m) => val(m, values[m]))];
    const rows = [head, line("Total", data.colTotals, data.total), ...data.rows.map((r) => line(`${r.depth ? "    " : ""}${r.label}`, r.cells, r.values))];
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replaceAll('"', '""')}"` : c)).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `sales-analysis-${q.from}-to-${q.to}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const rowHead = (label: React.ReactNode, depth: number, toggle?: () => void, open?: boolean, bold?: boolean) => (
    <th scope="row" className={`sticky left-0 z-[1] min-w-[180px] max-w-[320px] whitespace-nowrap bg-surface ${bold ? "o-total" : ""}`} style={{ paddingLeft: `${12 + depth * 20}px` }}>
      {toggle ? (
        <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center text-left hover:text-accent">
          <span className="o-expander" aria-hidden>{open ? "▾" : "▸"}</span><span className="truncate">{label}</span>
        </button>
      ) : (
        <span className="flex items-center"><span className="o-expander invisible" aria-hidden>▸</span><span className="truncate">{label}</span></span>
      )}
    </th>
  );

  return (
    <div>
      <div className="o-chart-toolbar print:hidden">
        <MeasuresMenu q={q} />
        <button type="button" className="o-btn" onClick={flip} disabled={!q.col && !q.groups[0]} title="Flip axis">⇄ <span className="hidden sm:inline">Flip axis</span></button>
        <button type="button" className="o-btn" onClick={() => { setClosed(new Set()); setRootOpen(true); }} title="Expand all">⊞ <span className="hidden sm:inline">Expand all</span></button>
        <button type="button" className="o-btn" onClick={() => setClosed(new Set(parents))} disabled={!parents.length} title="Collapse all">⊟ <span className="hidden sm:inline">Collapse all</span></button>
        <button type="button" className="o-btn" onClick={download} title="Download CSV">⤓ <span className="hidden sm:inline">Download</span></button>
      </div>
      <div className="o-list-scroll overflow-x-auto rounded-md border border-line bg-surface">
        <table className="o-pivot w-max min-w-full">
          <thead>
            <tr>
              <th rowSpan={hasCols ? 3 : 2} className="sticky left-0 z-[2] bg-surface-2" />
              <th colSpan={(data.cols.length + 1) * ms.length} className="!text-left">
                <Dropdown align="left" title="Group columns by" label={<span className="font-semibold"><span className="o-expander" aria-hidden>{hasCols ? "▾" : "▸"}</span>Total{q.col ? ` · by ${GROUP_LABEL[q.col]}` : ""}</span>}>
                  {(close) => <GroupMenu current={q.col} exclude={q.groups} onPick={(g) => { go({ c: g }); close(); }} onClear={() => { go({ c: null }); close(); }} />}
                </Dropdown>
              </th>
            </tr>
            {hasCols && (
              <tr>
                {data.cols.map((c) => <th key={c.key} colSpan={ms.length} className="whitespace-nowrap">{c.label}</th>)}
                <th colSpan={ms.length}>Total</th>
              </tr>
            )}
            <tr>
              {[...data.cols, null].flatMap((c, i) => ms.map((m) => <th key={`${i}-${m}`} className="whitespace-nowrap !text-right text-xs">{MEASURES[m].short}</th>))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {rowHead(q.groups[0] ? "Total" : "Total", 0, q.groups[0] ? () => setRootOpen((v) => !v) : undefined, rootOpen, true)}
              {data.colTotals.flatMap((c, i) => ms.map((m) => <td key={`${i}-${m}`} className="o-total">{fmt(m, c[m])}</td>))}
              {ms.map((m) => <td key={m} className="o-total">{fmt(m, data.total[m])}</td>)}
            </tr>
            {visible.map((r) => (
              <tr key={r.id}>
                {rowHead(r.label, r.depth + 1, r.hasChildren ? () => setClosed((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; }) : undefined, !closed.has(r.id), r.hasChildren)}
                {r.cells.flatMap((c, i) => ms.map((m) => <td key={`${i}-${m}`} className={r.hasChildren ? "font-semibold" : ""}>{c.orders ? fmt(m, c[m]) : ""}</td>))}
                {ms.map((m) => <td key={m} className={`font-semibold ${hasCols ? "bg-surface-2" : ""}`}>{fmt(m, r.values[m])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        Rows: {q.groups.length ? q.groups.map((g) => GROUP_LABEL[g]).join(" › ") : "none"}{data.colsCut ? ` · columns show the top ${data.cols.length}, ${data.colsCut} more are in the totals` : ""}.
        {(ms.includes("cost") || ms.includes("profit") || ms.includes("margin")) && " Est. cost uses sample food-cost % per menu section until recipe costs are loaded."}
      </p>
    </div>
  );
}
