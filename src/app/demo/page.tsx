import type { Metadata } from "next";
import Link from "next/link";
import { eq, like, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { ToastProvider } from "@/components/toast";
import { TEST_PHONES } from "@/db/seed";
import { demoNow, listOutlets } from "@/lib/orders";
import { formatClock } from "@/lib/time";
import { SampleHistoryButton } from "@/app/admin/reports/sample-history";
import { ClockControls, Inbox, ResetButton, SubstitutionTimer } from "./demo-bits";

export const metadata: Metadata = { title: "Demo hub — S Cafe prototype" };

export default async function DemoHub() {
  const db = await getDb();
  const [outlets, now, state, [sim]] = await Promise.all([
    listOutlets(db),
    demoNow(db),
    db.select().from(t.demoState).where(eq(t.demoState.id, 1)),
    db.select({ n: sql<number>`count(*)::int` }).from(t.foodOrder).where(like(t.foodOrder.ref, "SIM/%")),
  ]);
  const sampleOrders = Number(sim?.n ?? 0);
  const subSeconds = state[0]?.substitutionTimeoutSeconds ?? 900;
  // Part 2 of the demo: the real Odoo POS self-order link, when the presenter sets one
  const odooUrl = process.env.NEXT_PUBLIC_ODOO_SELF_ORDER_URL;
  const screens = [
    { href: "/guide", title: "Demo guide", sub: "Swimlane flow · 10-minute script · rules" },
    { href: "/", title: "Customer — web & phone", sub: "Landing → sign in → order → pay → track" },
    { href: "/kds?outlet=ISD-CAF", title: "Kitchen display", sub: "ISD Cafeteria · bump, recall, reject" },
    { href: "/counter?outlet=ISD-CAF", title: "Counter", sub: "Accept pay-at-counter · QR + name collection" },
    { href: "/status?outlet=ISD-CAF", title: "Pickup TV", sub: "Preparing / Ready numbers" },
    { href: "/admin?outlet=ISD-CAF", title: "Operations", sub: "Availability · production list · cost-centre invoices" },
    { href: "/admin/reports", title: "Sales Analysis", sub: "Odoo-style pivot, graph, list · sales and profit" },
    { href: "/admin/reports/daily", title: "Daily Sales Report", sub: "One day, printable · payments, VAT, refunds" },
    { href: "/admin/reports/upcoming", title: "Upcoming Orders", sub: "Pre-orders by day · production quantities" },
    { href: "/admin/hr", title: "HR staff list", sub: "Monthly import · leavers deactivated" },
    { href: "/kds?outlet=ISD-PL", title: "Kitchen · Parent Lounge", sub: "For the employee story" },
    { href: "/counter?outlet=ISD-PL", title: "Counter · Parent Lounge", sub: "Accept Farhana's order" },
  ];
  return (
    <ToastProvider>
      <div className="min-h-screen bg-page text-ink">
        <div className="flex h-(--o-h-navbar) items-center gap-4 border-b border-line bg-navbar px-4">
          <b className="text-sm">S Cafe · Demo hub</b>
          <span className="pill-sandbox hidden sm:inline-flex">PROTOTYPE — payment, SMS and HR list are sandbox</span>
          <span className="pill-sandbox sm:hidden">SANDBOX</span>
          <span className="o-hint ml-auto hidden md:inline">Production system: Odoo</span>
        </div>
        <div className="mx-auto grid max-w-[1240px] items-start gap-4 px-3 py-5 sm:px-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] [&>*]:min-w-0">
          <div>
            <section className="mb-4 rounded-lg border border-line bg-surface p-4">
              <h2 className="mb-2 flex items-center justify-between gap-2 text-base font-semibold">Screens</h2>
              <p className="mb-3 text-muted">Open each on its own device or window. They stay in step through the shared database.</p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                {screens.map((s) => (
                  <Link key={s.href} className="block rounded-lg border border-line p-3 text-ink hover:border-accent hover:no-underline" href={s.href} target="_blank">
                    <b className="mb-0.5 block">{s.title} ↗</b>
                    <small className="text-muted">{s.sub}</small>
                  </Link>
                ))}
              </div>
            </section>

            {odooUrl && (
              <section className="mb-4 rounded-lg border-2 border-accent/40 bg-surface p-4">
                <h2 className="mb-1 text-base font-semibold">Part 2 · Real Odoo POS (production back office)</h2>
                <p className="mb-3 text-muted">The same journey in a live Odoo POS self-ordering screen, with Odoo&apos;s own kitchen display. Not connected to this prototype&apos;s data yet — the API link follows STS approval (Odoo.sh or on-premise).</p>
                <a className="o-btn o-btn-primary" href={odooUrl} target="_blank" rel="noreferrer">Open Odoo self-ordering ↗</a>
              </section>
            )}

            <section className="mb-4 rounded-lg border border-line bg-surface p-4">
              <h2 className="mb-2 text-base font-semibold">Walkthrough · STS rules (C8)</h2>
              <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
                <li><b>Parent</b> orders lunch, pays bKash → kitchen → pickup TV → counter scans QR + checks name.</li>
                <li><b>Student</b> pre-orders for a later day → it waits in the production list and joins the kitchen that morning (use the demo clock).</li>
                <li><b>Parent</b> edits the order before cut-off — adds an item (pays the difference) or removes one (refund).</li>
                <li>In <b>Operations</b>, switch an ordered item off → the customer gets a substitute-or-refund choice with a countdown; no answer refunds it.</li>
                <li><b>Employee — Farhana</b> at the Parent Lounge: 20% off, VAT 0%, pays at the counter; counter accepts. Receipt shows discount and VAT 0%.</li>
                <li><b>Employee — Sabbir</b> at the Cafeteria: VAT 0%, discount line explains “Parent Lounge only”.</li>
                <li><b>Coordinator — Tanvir</b> books a bulk order: refused under 24 h notice, accepted after; kitchen marks Ready, counter marks Delivered; Operations shows the monthly cost-centre invoice.</li>
                <li><b>Profile</b>: a parent changes campus; an employee sees HR-owned details. The bell shows order updates.</li>
                <li><b>HR staff list</b>: import the sample October list → a leaver&apos;s number (01700000006) can no longer sign in.</li>
                <li><b>Reports</b> (Operations → Reporting): Sales Analysis by product, day, pickup time or outlet with profit; the daily sales report; upcoming orders and what to prepare.</li>
              </ol>
            </section>

            <section className="mb-4 rounded-lg border border-line bg-surface p-4">
              <h2 className="mb-2 flex items-center justify-between gap-2 text-base font-semibold">Substitution timer <span className="o-hint">C8: 15 minutes, then automatic refund</span></h2>
              <p className="mb-3 text-muted">Shorten it for a live demo so the automatic refund happens while you watch.</p>
              <SubstitutionTimer seconds={subSeconds} />
            </section>

            <section className="mb-4 rounded-lg border border-line bg-surface p-4">
              <h2 className="mb-2 flex items-center justify-between gap-2 text-base font-semibold">Demo logins <span className="o-hint">OTP is always 123456</span></h2>
              <table className="w-full">
                <thead><tr><th className="border-b border-line px-2 py-1.5 text-left text-sm font-semibold">Mobile</th><th className="border-b border-line px-2 py-1.5 text-left text-sm font-semibold">Who</th><th className="border-b border-line px-2 py-1.5 text-left text-sm font-semibold">Story</th></tr></thead>
                <tbody>
                  {TEST_PHONES.map((p) => (
                    <tr key={p.phone}>
                      <td className="border-b border-line px-2 py-1.5 text-left text-sm tabular-nums"><b>{p.phone}</b></td>
                      <td className="border-b border-line px-2 py-1.5 text-left text-sm">{p.actor}</td>
                      <td className="border-b border-line px-2 py-1.5 text-left text-sm o-hint">
                        {p.who}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="o-hint mt-3">
                Sign in once with any of these, then switch actor from the <b>DEMO</b> menu in the header (no second login). New numbers
                can register as parent or student (code in the inbox). 01700000006 is on the HR list and registers as an employee
                automatically; 01700000009 is a leaver and is refused.
              </p>
            </section>

            <section className="mb-4 rounded-lg border border-line bg-surface p-4">
              <h2 className="mb-2 flex items-center justify-between gap-2 text-base font-semibold">Demo clock <span className="o-hint tabular-nums">{formatClock(now.ms)}{now.offsetMinutes ? ` (shifted ${Math.round(now.offsetMinutes / 60)}h)` : " (real time)"}</span></h2>
              <p className="mb-3 text-muted">Move time to show cut-offs, late tickets and pre-orders joining the kitchen on their day.</p>
              <ClockControls />
            </section>

            <section className="mb-4 rounded-lg border border-line bg-surface p-4">
              <h2 className="mb-2 flex items-center justify-between gap-2 text-base font-semibold">Sample sales history <span className="o-hint tabular-nums">{sampleOrders ? `${sampleOrders.toLocaleString("en-IN")} sample orders loaded` : "none loaded"}</span></h2>
              <p className="mb-3 text-muted">Two months of past sales and a few days of pre-orders across all outlets (orders “SIM/…”, inactive sample customers), so the reports have something to show. Removing it deletes exactly these and nothing else. Today is left to live demo orders.</p>
              <div className="flex flex-wrap gap-2">
                <SampleHistoryButton mode="load" className={sampleOrders ? "o-btn" : "o-btn o-btn-primary"} />
                {sampleOrders > 0 && <SampleHistoryButton mode="clear" className="o-btn" />}
              </div>
            </section>

            <section className="mb-4 rounded-lg border border-line bg-surface p-4">
              <h2 className="mb-2 flex items-center justify-between gap-2 text-base font-semibold">Reset</h2>
              <p className="mb-3 text-muted">Wipes all orders and restores the {outlets.length} outlets, both menus, slots, HR list and the {TEST_PHONES.length} demo customers.</p>
              <ResetButton />
            </section>
          </div>

          <section className="mb-4 rounded-lg border border-line bg-surface p-4">
            <h2 className="mb-2 flex items-center justify-between gap-2 text-base font-semibold">Sandbox SMS inbox <span className="pill-sandbox">not sent</span></h2>
            <Inbox />
          </section>
        </div>
      </div>
    </ToastProvider>
  );
}
