import { MEASURES, formatMeasure, type MeasureKey } from "@/lib/report-meta";
import type { Totals } from "@/lib/reports";

/** KPI tile: value for the period and the change against the period before it. */
export function Kpi({ label, m, cur, prev, tone }: { label: string; m: MeasureKey; cur: Totals; prev: Totals | null; tone?: "money" | "best" | "stock" }) {
  const v = cur[m];
  const p = prev?.[m] ?? 0;
  const pct = prev && p ? ((v - p) / Math.abs(p)) * 100 : null;
  const flat = pct != null && Math.abs(pct) < 0.5;
  return (
    <div className={`o-kpi ${tone ? `o-kpi-${tone}` : ""}`}>
      <div className="o-kpi-label">{label}</div>
      <div className="o-kpi-value" title={formatMeasure(MEASURES[m].kind, v)}>{formatMeasure(MEASURES[m].kind, v)}</div>
      {prev && (
        <div className="o-kpi-delta">
          {pct == null ? "no sales before" : flat ? "no change" : <span className={pct > 0 ? "o-up" : "o-down"}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%</span>}
          <span className="text-2xs"> vs {formatMeasure(MEASURES[m].kind, p)}</span>
        </div>
      )}
    </div>
  );
}
