import Link from "next/link";
import { Fragment } from "react";
import { ACCOUNT_LABEL, GROUP_LABEL, MEASURES, PAYMENT_LABEL, STATE_LABEL, formatMeasure, niceDate, type MeasureKey, type Query } from "@/lib/report-meta";
import type { ListLine, Totals, buildList } from "@/lib/reports";
import { LIST_PAGE } from "@/lib/reports";
import { money } from "@/lib/rules";
import { MeasuresMenu } from "./pivot-view";

type Params = Record<string, string | string[] | undefined>;

/** Link to the same report with some parameters changed (null removes one). */
export function reportHref(path: string, sp: Params, patch: Record<string, string | null>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && !(k in patch)) next.set(k, v);
  for (const [k, v] of Object.entries(patch)) if (v != null) next.set(k, v);
  const qs = next.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Sums in whole taka, as in the pivot; single lines keep their exact price. */
const whole = (poisha: number) => formatMeasure("money", poisha);

const badge = (state: string) =>
  state === "collected" ? "o-badge-success" : state === "confirmed" ? "o-badge-info" : state === "cancelled" || state === "rejected" ? "o-badge-danger" : "o-badge-warning";

function Lines({ lines }: { lines: ListLine[] }) {
  return lines.map((l, i) => (
    <tr key={`${l.orderId}-${l.product}-${i}`}>
      <td className="tabular-nums">{niceDate(l.date)} <span className="text-muted">{l.slotStart}</span></td>
      <td><Link href={`/orders/${l.orderId}`} className="o-record-link">{l.tracking}</Link> <span className="text-2xs text-muted">{l.ref}</span></td>
      <td>{l.customer} <span className="text-2xs text-muted">{ACCOUNT_LABEL[l.account] ?? l.account}</span></td>
      <td>{l.outlet}</td>
      <td>{l.product}</td>
      <td className="text-muted">{l.category}</td>
      <td className="o-num">{l.qty}</td>
      <td className="o-num">{money(l.revenue)}</td>
      <td className="o-num">{money(l.profit)}</td>
      <td>{PAYMENT_LABEL[l.payment] ?? l.payment}</td>
      <td><span className={`o-badge ${badge(l.state)}`}>{STATE_LABEL[l.state] ?? l.state}</span></td>
    </tr>
  ));
}

const HEAD = ["Pickup", "Order", "Customer", "Outlet", "Product", "Category", "Qty", "Sales", "Est. profit", "Payment", "Status"];
const NUM = new Set(["Qty", "Sales", "Est. profit"]);

function Sums({ t, colSpanLead }: { t: Totals; colSpanLead: number }) {
  return (
    <>
      <td colSpan={colSpanLead} />
      <td className="o-num">{t.qty.toLocaleString("en-IN")}</td>
      <td className="o-num">{whole(t.revenue)}</td>
      <td className="o-num">{whole(t.profit)}</td>
      <td colSpan={2} />
    </>
  );
}

function Pager({ page, count, href }: { page: number; count: number; href: (p: number) => string }) {
  const last = Math.max(1, Math.ceil(count / LIST_PAGE));
  const from = count ? (page - 1) * LIST_PAGE + 1 : 0;
  const to = Math.min(count, page * LIST_PAGE);
  return (
    <span className="o-pager">
      <span className="tabular-nums">{from}-{to} / {count.toLocaleString("en-IN")}</span>
      {page > 1 ? <Link href={href(page - 1)} aria-label="Previous page" className="rounded px-2 py-1 hover:bg-surface-3">‹</Link> : <span className="px-2 opacity-35">‹</span>}
      {page < last ? <Link href={href(page + 1)} aria-label="Next page" className="rounded px-2 py-1 hover:bg-surface-3">›</Link> : <span className="px-2 opacity-35">›</span>}
    </span>
  );
}

export function ListView({ q, data, sp }: { q: Query; data: ReturnType<typeof buildList>; sp: Params }) {
  const path = "/admin/reports";
  const m: MeasureKey = q.measures[0];
  return (
    <div>
      <div className="o-chart-toolbar print:hidden">
        <MeasuresMenu q={q} single />
        <span className="text-sm text-muted">
          {data.grouped ? `Grouped by ${GROUP_LABEL[data.by]} · sorted by ${MEASURES[m].short} · open a group to see its lines` : "Order lines, newest first"}
        </span>
        {!data.grouped && <span className="ml-auto"><Pager page={q.page} count={data.count} href={(p) => reportHref(path, sp, { pg: String(p) })} /></span>}
      </div>
      <div className="o-list">
        <div className="o-list-scroll">
          <table>
            <thead>
              <tr>{HEAD.map((h) => <th key={h} className={NUM.has(h) ? "o-num" : ""}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {!data.grouped && <Lines lines={data.lines} />}
              {data.grouped &&
                data.groups.map((g) => {
                  const open = g.key === q.open;
                  return (
                    <Fragment key={g.key}>
                      <tr className="o-group">
                        <td colSpan={6}>
                          <Link href={reportHref(path, sp, { open: open ? null : g.key, pg: null })} scroll={false} aria-expanded={open} className="flex items-center gap-1 text-ink hover:no-underline">
                            <span className="o-expander" aria-hidden>{open ? "▾" : "▸"}</span>{g.label} <span className="font-normal text-muted">({g.count} lines · {g.totals.orders} orders · {MEASURES[m].short} {formatMeasure(MEASURES[m].kind, g.totals[m])})</span>
                          </Link>
                        </td>
                        <td className="o-num">{g.totals.qty.toLocaleString("en-IN")}</td>
                        <td className="o-num">{whole(g.totals.revenue)}</td>
                        <td className="o-num">{whole(g.totals.profit)}</td>
                        <td colSpan={2} />
                      </tr>
                      {open && g.lines && <Lines lines={g.lines} />}
                      {open && g.count > LIST_PAGE && (
                        <tr><td colSpan={11} className="text-right"><Pager page={q.page} count={g.count} href={(p) => reportHref(path, sp, { open: g.key, pg: String(p) })} /></td></tr>
                      )}
                    </Fragment>
                  );
                })}
              {data.count === 0 && <tr><td colSpan={11} className="text-muted">No lines match.</td></tr>}
            </tbody>
            <tfoot>
              <tr><Sums t={data.total} colSpanLead={6} /></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
