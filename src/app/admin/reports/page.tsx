import type { Metadata } from "next";
import { getDb } from "@/db/client";
import { ActorSwitcher } from "@/components/demo/actor-switcher";
import { OpsNav } from "@/components/ops/ops-nav";
import { ToastProvider } from "@/components/toast";
import { niceDate } from "@/lib/report-meta";
import { applyFilters, buildGraph, buildList, buildPivot, loadFacts, measure, parseQuery, previousRange, reportContext } from "@/lib/reports";
import { currentCustomer } from "@/lib/session";
import { ControlPanel } from "./control-panel";
import { GraphView } from "./graph-view";
import { Kpi } from "./kpi";
import { ListView } from "./list-view";
import { PivotView } from "./pivot-view";
import { SampleHistoryButton } from "./sample-history";

export const metadata: Metadata = { title: "Sales Analysis — S Cafe" };

export default async function SalesAnalysisPage({ searchParams }: PageProps<"/admin/reports">) {
  const sp = await searchParams;
  const db = await getDb();
  const ctx = await reportContext(db);
  const q = parseQuery(sp, ctx.today);
  const [pf, pt] = previousRange(q.from, q.to);
  const facts = await loadFacts(db, pf, q.to);
  const cur = applyFilters(facts, q);
  const prev = applyFilters(facts, q, [pf, pt]);
  const k = measure(cur);
  const kp = measure(prev);
  const persona = (await currentCustomer())?.id ?? null;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-page text-ink">
        <OpsNav right={<><span className="o-hint hidden md:inline">Demo clock {ctx.now.date} {ctx.now.time}</span><ActorSwitcher tone="staff" staffScreen="admin" personaId={persona} outletId={q.outlets[0] ?? "ISD-CAF"} staffUnlocked /></>} />
        <ControlPanel q={q} outlets={ctx.outlets} sampleOrders={ctx.sampleOrders} />

        <main className="mx-auto flex max-w-[1500px] flex-col gap-5 p-3 sm:p-5">
          <section aria-label="Key figures" className="o-kpis">
            <Kpi label="Sales" m="revenue" cur={k} prev={kp} tone="money" />
            <Kpi label="Orders" m="orders" cur={k} prev={kp} />
            <Kpi label="Average order" m="aov" cur={k} prev={kp} tone="money" />
            <Kpi label="Items sold" m="qty" cur={k} prev={kp} tone="stock" />
            <Kpi label="Est. gross profit" m="profit" cur={k} prev={kp} tone="best" />
          </section>
          <p className="-mt-3 text-xs text-muted">
            {niceDate(q.from, true)} – {niceDate(q.to, true)} · compared with {niceDate(pf)} – {niceDate(pt, true)} · pickup date · est. margin {k.margin.toFixed(1)}%
            {ctx.sampleOrders > 0 && q.sample && <> · includes demo sample history (orders “SIM/…”) <SampleHistoryButton mode="clear" className="o-btn-link ml-1 text-xs underline" /></>}
            {ctx.sampleOrders === 0 && cur.length > 0 && <> · only live demo orders so far <SampleHistoryButton mode="load" className="o-btn-link ml-1 text-xs underline" /></>}
          </p>

          {cur.length === 0 ? (
            <div className="rounded-md border border-line bg-surface px-6 py-12 text-center">
              <p className="text-lg font-semibold">No sales match this period and these filters</p>
              <p className="mx-auto mt-2 max-w-lg text-muted">Change the period or remove a filter.{ctx.sampleOrders === 0 && " The prototype starts with only a few live orders — load sample history to see the reports with two months of trading."}</p>
              {ctx.sampleOrders === 0 && <div className="mt-5"><SampleHistoryButton mode="load" /></div>}
            </div>
          ) : q.view === "graph" ? (
            <GraphView q={q} data={buildGraph(cur, q)} />
          ) : q.view === "list" ? (
            <ListView q={q} data={buildList(cur, q)} sp={sp} />
          ) : (
            <PivotView q={q} data={buildPivot(cur, q)} />
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
