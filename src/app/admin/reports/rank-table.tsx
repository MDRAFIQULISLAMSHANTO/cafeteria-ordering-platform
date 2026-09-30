import type { ReactNode } from "react";

/** Odoo ranked table: the first cell carries its own bar, scaled to the largest row. */
export function RankTable({ head, rows, total, keep = false, cool = false }: {
  head: string[];
  rows: { key: string; label: ReactNode; bar: number; cells: ReactNode[] }[];
  total?: ReactNode[];
  keep?: boolean; // keep the given order (e.g. by time) rather than the bar size
  cool?: boolean;
}) {
  const top = Math.max(1, ...rows.map((r) => r.bar));
  const list = keep ? rows : [...rows].sort((a, b) => b.bar - a.bar);
  return (
    <table className={`o-rank ${cool ? "o-rank-cool" : ""}`}>
      <thead>
        <tr>{head.map((h, i) => <th key={h} className={i ? "o-num" : ""}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {list.length === 0 && <tr><td colSpan={head.length} className="text-muted">Nothing on this day.</td></tr>}
        {list.map((r) => (
          <tr key={r.key}>
            <td className="o-rank-label">
              <span aria-hidden className="o-rank-bar" style={{ width: `${Math.max(1, (r.bar / top) * 100)}%` }} />
              <span>{r.label}</span>
            </td>
            {r.cells.map((c, i) => <td key={i} className="o-num">{c}</td>)}
          </tr>
        ))}
      </tbody>
      {total && list.length > 0 && (
        <tfoot>
          <tr className="font-semibold">{total.map((c, i) => <td key={i} className={`border-t border-line-strong px-3 py-2 ${i ? "o-num" : ""}`}>{c}</td>)}</tr>
        </tfoot>
      )}
    </table>
  );
}
