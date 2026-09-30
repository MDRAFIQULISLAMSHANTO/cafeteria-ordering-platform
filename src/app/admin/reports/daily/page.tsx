import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { ActorSwitcher } from "@/components/demo/actor-switcher";
import { OpsNav } from "@/components/ops/ops-nav";
import { ToastProvider } from "@/components/toast";
import { ACCOUNT_LABEL, PAYMENT_LABEL, STATE_LABEL } from "@/lib/report-meta";
import { dailyReport, reportContext } from "@/lib/reports";
import { money } from "@/lib/rules";
import { currentCustomer } from "@/lib/session";
import { addDays, time12 } from "@/lib/time";
import { Kpi } from "../kpi";
import { RankTable } from "../rank-table";
import { DailyToolbar } from "../report-toolbar";

export const metadata: Metadata = { title: "Daily Sales Report — S Cafe" };

const longDate = (d: string) => new Date(`${d}T12:00:00+06:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });

function Block({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="min-w-0 break-inside-avoid">
      <div className="o-dash-head"><h2 className="o-dash-title !text-lg">{title}</h2>{note && <span className="o-dash-tools text-xs text-muted">{note}</span>}</div>
      {children}
    </section>
  );
}

// The day's Z report: what was sold, how it was paid, VAT, refunds and what was
// lost, for one outlet or all of them. Pickup date basis, like the kitchen.
export default async function DailyReportPage({ searchParams }: PageProps<"/admin/reports/daily">) {
  const sp = await searchParams;
  const db = await getDb();
  const ctx = await reportContext(db);
  const date = typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : ctx.today;
  const outlet = typeof sp.o === "string" && ctx.outlets.some((o) => o.id === sp.o) ? sp.o : "";
  const sample = sp.sm !== "0";
  const [r, prev] = await Promise.all([
    dailyReport(db, date, outlet ? [outlet] : [], sample),
    dailyReport(db, addDays(date, -7), outlet ? [outlet] : [], sample),
  ]);
  const t = r.totals;
  const outletName = outlet ? ctx.outlets.find((o) => o.id === outlet)!.name : "All outlets";
  const persona = (await currentCustomer())?.id ?? null;
  const analysis = (extra: string) => `/admin/reports?p=custom&from=${date}&to=${date}${outlet ? `&o=${outlet}` : ""}${sample ? "" : "&sm=0"}${extra}`;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-page text-ink print:bg-surface">
        <OpsNav right={<><span className="o-hint hidden md:inline">Demo clock {ctx.now.date} {ctx.now.time}</span><ActorSwitcher tone="staff" staffScreen="admin" personaId={persona} outletId={outlet || "ISD-CAF"} staffUnlocked /></>} />
        <div className="o-cp flex-wrap !gap-y-2 print:hidden">
          <div className="o-cp-left">
            <div className="o-cp-titlewrap">
              <div className="o-breadcrumb">Reporting</div>
              <h1 className="m-0 text-lg font-semibold leading-tight">Daily Sales Report</h1>
            </div>
          </div>
          <div className="o-cp-right"><DailyToolbar date={date} today={ctx.today} outlets={ctx.outlets} outlet={outlet} sample={sample} hasSample={ctx.sampleOrders > 0} /></div>
        </div>

        <main className="mx-auto max-w-[1200px] p-3 sm:p-5 print:p-0">
          <article className="rounded-md border border-line bg-surface p-4 sm:p-6 print:border-0 print:p-0">
            <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">S Cafe · Daily sales report (Z report)</p>
                <h2 className="mt-1 text-2xl font-bold">{longDate(date)}</h2>
                <p className="text-sm text-muted">{outletName} · by pickup date · sales = confirmed and collected orders</p>
              </div>
              <p className="text-right text-xs text-muted">
                Printed {ctx.now.date} {ctx.now.time} (demo clock)
                <br />Compared with the same weekday last week ({addDays(date, -7)})
                {date > ctx.today && <><br /><b className="text-warning">A future day: these are pre-orders, not sales yet.</b></>}
              </p>
            </header>

            <section aria-label="Key figures" className="o-kpis mt-5">
              <Kpi label="Sales" m="revenue" cur={t} prev={prev.totals} tone="money" />
              <Kpi label="Orders" m="orders" cur={t} prev={prev.totals} />
              <Kpi label="Average order" m="aov" cur={t} prev={prev.totals} tone="money" />
              <Kpi label="Items sold" m="qty" cur={t} prev={prev.totals} tone="stock" />
              <Kpi label="Est. gross profit" m="profit" cur={t} prev={prev.totals} tone="best" />
            </section>

            <div className="o-dash-grid mt-6 !gap-x-8 !gap-y-7">
              <Block title="Payments" note={`${r.byPayment.length} methods`}>
                <RankTable
                  head={["Method", "Orders", "Amount"]}
                  rows={r.byPayment.map((g) => ({ key: g.key, label: PAYMENT_LABEL[g.key] ?? g.key, bar: g.totals.revenue, cells: [g.totals.orders, money(g.totals.revenue)] }))}
                  total={["Total collected", t.orders, money(t.revenue)]}
                />
                <p className="mt-2 text-xs text-muted">Refunds today: <b className="text-ink">{money(r.refunds)}</b> in {r.refundCount} refund{r.refundCount === 1 ? "" : "s"} (cancelled, rejected, substituted or edited orders). Online payments are sandbox.</p>
              </Block>

              <Block title="Taxes and discounts">
                <table className="o-rank">
                  <tbody>
                    <tr><td>Parent and student sales (VAT 5% included)</td><td className="o-num">{money(r.vat.gross)}</td></tr>
                    <tr><td className="pl-6 text-muted">of which net of VAT</td><td className="o-num">{money(r.vat.base)}</td></tr>
                    <tr><td className="pl-6 text-muted">of which VAT 5%</td><td className="o-num font-semibold">{money(r.vat.amount)}</td></tr>
                    <tr><td>Employee sales (VAT-free)</td><td className="o-num">{money(r.vat.exempt)}</td></tr>
                    <tr><td>Employee discount given (Parent Lounge, 20%)</td><td className="o-num">{money(t.discount)}</td></tr>
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-muted">VAT treatment as confirmed by STS (C8); BIN and invoice numbering pending STS Finance.</p>
              </Block>

              <Block title="Sales by category" note="est. profit uses sample food-cost %">
                <RankTable
                  head={["Category", "Items", "Sales", "Est. profit"]}
                  rows={r.byCategory.map((g) => ({ key: g.key, label: g.label, bar: g.totals.revenue, cells: [g.totals.qty, money(g.totals.revenue), money(g.totals.profit)] }))}
                  total={["Total", t.qty, money(t.revenue), money(t.profit)]}
                />
              </Block>

              <Block title="Top 10 products">
                <RankTable
                  cool
                  head={["Product", "Qty", "Sales"]}
                  rows={r.topProducts.map((g) => ({ key: g.key, label: g.label, bar: g.totals.qty, cells: [g.totals.qty, money(g.totals.revenue)] }))}
                />
                <p className="mt-2 text-xs"><Link href={analysis("&g=product&m=qty,revenue,profit")}>All products in Sales Analysis →</Link></p>
              </Block>

              <Block title="By pickup time">
                <RankTable
                  keep
                  head={["Pickup", "Orders", "Sales"]}
                  rows={r.bySlot.map((g) => ({ key: g.key, label: `${time12(g.key)} · ${g.facts[0]?.slotLabel ?? ""}`, bar: g.totals.revenue, cells: [g.totals.orders, money(g.totals.revenue)] }))}
                />
              </Block>

              <Block title={outlet ? "By customer type" : "By outlet and customer type"}>
                {!outlet && (
                  <RankTable
                    head={["Outlet", "Orders", "Sales"]}
                    rows={r.byOutlet.map((g) => ({ key: g.key, label: g.label, bar: g.totals.revenue, cells: [g.totals.orders, money(g.totals.revenue)] }))}
                  />
                )}
                <div className={outlet ? "" : "mt-4"}>
                  <RankTable
                    cool
                    head={["Customer type", "Orders", "Sales"]}
                    rows={r.byAccount.map((g) => ({ key: g.key, label: ACCOUNT_LABEL[g.key] ?? g.key, bar: g.totals.revenue, cells: [g.totals.orders, money(g.totals.revenue)] }))}
                  />
                </div>
              </Block>

              <Block title="Cost-centre (bulk) orders" note="invoiced monthly, VAT-free">
                <RankTable
                  head={["Coordinator", "Orders", "Amount"]}
                  rows={r.bulk.map((g) => ({ key: g.key, label: g.label, bar: g.totals.revenue, cells: [g.totals.orders, money(g.totals.revenue)] }))}
                />
              </Block>

              <Block title="Cancelled and rejected" note={`${r.lost.length} order${r.lost.length === 1 ? "" : "s"}`}>
                <table className="o-rank">
                  <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th className="o-num">Refunded</th></tr></thead>
                  <tbody>
                    {r.lost.length === 0 && <tr><td colSpan={4} className="text-muted">None on this day.</td></tr>}
                    {r.lost.slice(0, 12).map((l) => (
                      <tr key={l.ref}><td>{l.tracking} <span className="text-2xs text-muted">{l.outlet}</span></td><td>{l.customer}</td><td>{STATE_LABEL[l.state] ?? l.state}</td><td className="o-num">{money(l.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
                {r.lost.length > 12 && <p className="mt-2 text-xs"><Link href={analysis("&st=all&v=list&g=status")}>All {r.lost.length} in Sales Analysis →</Link></p>}
              </Block>
            </div>

            <p className="mt-6 border-t border-line pt-3 text-xs text-muted">
              Est. food cost and profit use sample cost percentages per menu section until recipe costs are loaded. Figures include demo sample history (orders “SIM/…”) unless hidden.
            </p>
          </article>
        </main>
      </div>
    </ToastProvider>
  );
}
