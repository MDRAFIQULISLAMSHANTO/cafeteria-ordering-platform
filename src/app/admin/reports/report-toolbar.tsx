"use client";

import { niceDate } from "@/lib/report-meta";
import { useQueryNav } from "./use-query-nav";

type Outlet = { id: string; name: string };
const shift = (d: string, days: number) => new Date(Date.parse(`${d}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Outlet picker shared by the daily and upcoming reports ("" = all outlets). */
function OutletSelect({ outlets, value }: { outlets: Outlet[]; value: string }) {
  const { go } = useQueryNav();
  return (
    <select className="o-select w-44 min-w-0 sm:w-56" aria-label="Outlet" value={value} onChange={(e) => go({ o: e.target.value || null })}>
      <option value="">All outlets</option>
      {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

function SampleToggle({ show, sample }: { show: boolean; sample: boolean }) {
  const { go } = useQueryNav();
  if (!show) return null;
  return (
    <label className="flex items-center gap-1.5 text-sm text-muted">
      <input type="checkbox" checked={!sample} onChange={() => go({ sm: sample ? "0" : null })} /> Hide sample history
    </label>
  );
}

/** Daily report: one day at a time — a step either side and a date field. */
export function DailyToolbar({ date, today, outlets, outlet, sample, hasSample }: { date: string; today: string; outlets: Outlet[]; outlet: string; sample: boolean; hasSample: boolean }) {
  const { go, pending } = useQueryNav();
  const set = (d: string) => go({ d: d === today ? null : d });
  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <div className="o-daterange">
        <button type="button" className="o-daterange-step" aria-label="Previous day" onClick={() => set(shift(date, -1))}>‹</button>
        <label className="o-daterange-pill">
          <span className="font-semibold">{date === today ? "Today" : niceDate(date, true)}</span>
          <input type="date" className="w-[1.4rem] cursor-pointer bg-transparent text-transparent" aria-label="Pick a date" value={date} onChange={(e) => e.target.value && set(e.target.value)} />
        </label>
        <button type="button" className="o-daterange-step" aria-label="Next day" onClick={() => set(shift(date, 1))}>›</button>
      </div>
      <OutletSelect outlets={outlets} value={outlet} />
      <SampleToggle show={hasSample} sample={sample} />
      <button type="button" className="o-btn" onClick={() => window.print()}>Print</button>
    </div>
  );
}

/** Upcoming orders: how far ahead, and which outlet. */
export function UpcomingToolbar({ days, outlets, outlet, sample, hasSample }: { days: number; outlets: Outlet[]; outlet: string; sample: boolean; hasSample: boolean }) {
  const { go, pending } = useQueryNav();
  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <div className="o-switcher" role="group" aria-label="Days ahead">
        {[1, 3, 7, 14].map((n) => (
          <button key={n} type="button" aria-pressed={days === n} className="!w-auto px-3 text-sm" onClick={() => go({ days: n === 7 ? null : String(n) })}>
            {n === 1 ? "Today + 1" : `${n} days`}
          </button>
        ))}
      </div>
      <OutletSelect outlets={outlets} value={outlet} />
      <SampleToggle show={hasSample} sample={sample} />
      <button type="button" className="o-btn" onClick={() => window.print()}>Print</button>
    </div>
  );
}
