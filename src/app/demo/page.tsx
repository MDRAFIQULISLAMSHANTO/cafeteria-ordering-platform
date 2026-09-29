import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { ToastProvider } from "@/components/toast";
import { TEST_PHONES } from "@/db/seed";
import { demoNow, listOutlets } from "@/lib/orders";
import { formatClock } from "@/lib/time";
import { ClockControls, Inbox, ResetButton } from "./demo-bits";

export const metadata: Metadata = { title: "Demo hub — STS Café prototype" };

export default async function DemoHub() {
  const db = await getDb();
  const [outlets, now] = await Promise.all([listOutlets(db), demoNow(db)]);
  const screens = [
    { href: "/", title: "Customer — web & phone", sub: "Landing → sign in → order → pay → track" },
    { href: "/kds?outlet=ISD-CAF", title: "Kitchen display", sub: "ISD Cafeteria · bump, recall, reject" },
    { href: "/counter?outlet=ISD-CAF", title: "Counter", sub: "Accept pay-at-counter · QR + name collection" },
    { href: "/status?outlet=ISD-CAF", title: "Pickup TV", sub: "Preparing / Ready numbers" },
    { href: "/admin?outlet=ISD-CAF", title: "Operations", sub: "Availability · today · production list" },
    { href: "/kds?outlet=ISD-PL", title: "Kitchen · Parent Lounge", sub: "For the employee story" },
    { href: "/counter?outlet=ISD-PL", title: "Counter · Parent Lounge", sub: "Accept Farhana's order" },
  ];
  return (
    <ToastProvider>
      <div className="min-h-screen bg-page text-ink">
        <div className="flex h-(--o-h-navbar) items-center gap-4 border-b border-line bg-navbar px-4">
          <b className="text-sm">STS Café · Demo hub</b>
          <span className="pill-sandbox">PROTOTYPE — payment, SMS and HR list are sandbox</span>
          <span className="o-hint ml-auto hidden md:inline">Production system: Odoo</span>
        </div>
        <div className="mx-auto grid max-w-[1240px] items-start gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
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
              <h2 className="mb-2 flex items-center justify-between gap-2 text-base font-semibold">Reset</h2>
              <p className="mb-3 text-muted">Wipes all orders and restores the {outlets.length} outlets, both menus, slots, HR list and the four demo customers.</p>
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
