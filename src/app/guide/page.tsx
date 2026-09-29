import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PrintButton } from "./print-button";
import { FLOW } from "./flow-data";
import { Swimlane } from "./swimlane";

export const metadata: Metadata = { title: "Demo guide — STS Group online ordering" };

// A plain-language guide for STS: how one order flows, and a 10-minute
// script to show every rule from STS's own answers (C8) in the prototype.

const DEMO_LOGIN = "01700000001";

type Step = { do: string; see: string; open?: { href: string; label: string } };
type Story = { n: number; title: string; who: string; minutes: string; steps: Step[] };

const STORIES: Story[] = [
  {
    n: 1, title: "A parent orders lunch", who: "Parent — Nusrat", minutes: "3 min",
    steps: [
      { do: `Sign in with ${DEMO_LOGIN}, code 123456.`, see: "No password — mobile number and a one-time code.", open: { href: "/login", label: "Sign in" } },
      { do: "Add a lunch item and pick today's Lunch slot.", see: "Each slot shows its order-by time; full or closed slots can't be picked. VAT 5% is shown as included." },
      { do: "Checkout → pay with bKash.", see: "Order number (e.g. S1) and a collection QR code. Payment is a sandbox — no money moves." },
      { do: "DEMO ▾ → Kitchen. Tap Start, then Ready.", see: "The ticket arrives on its own; the kitchen moves it To cook → Preparing → Ready.", open: { href: "/kds?outlet=ISD-CAF", label: "Kitchen" } },
      { do: "DEMO ▾ → Pickup TV.", see: "The number moves to Ready — please collect.", open: { href: "/status?outlet=ISD-CAF", label: "Pickup TV" } },
      { do: "DEMO ▾ → Counter. Type the number, tick the name check, hand over.", see: "Collection needs the QR or number plus the customer's name.", open: { href: "/counter?outlet=ISD-CAF", label: "Counter" } },
    ],
  },
  {
    n: 2, title: "A student pre-orders for tomorrow", who: "Student — Arif (8B)", minutes: "1 min",
    steps: [
      { do: "DEMO ▾ → Student. Pick tomorrow, a slot, and pay.", see: "Class and section print on the ticket and receipt." },
      { do: "Open Operations.", see: "The order waits in the production list — it joins the kitchen on its day.", open: { href: "/admin?outlet=ISD-CAF", label: "Operations" } },
    ],
  },
  {
    n: 3, title: "An employee at the Parent Lounge", who: "Employee — Farhana", minutes: "2 min",
    steps: [
      { do: "DEMO ▾ → Employee — Farhana. Add an item.", see: "20% staff discount (Parent Lounge only) and VAT 0% — employees are VAT-free." },
      { do: "Choose Pay at counter and place the order.", see: "It waits for the counter — it doesn't reach the kitchen yet." },
      { do: "DEMO ▾ → Counter → Card.", see: "Accepted and sent to the kitchen. The receipt shows the discount line and VAT 0%." },
      { do: "Optional: DEMO ▾ → Employee — Sabbir (Cafeteria).", see: "VAT 0% too, but the discount line explains it's Parent Lounge only." },
    ],
  },
  {
    n: 4, title: "Changes and a sold-out item", who: "Parent — Nusrat", minutes: "2 min",
    steps: [
      { do: "Open the order → Edit order → add an item → Save.", see: "Pay only the difference. Removing an item refunds the difference instead. Edits close at the cut-off or once cooking starts." },
      { do: "On the demo hub, set the substitution timer to 60 seconds.", see: "STS's rule is 15 minutes; 60 s is just for the demo.", open: { href: "/demo", label: "Demo hub" } },
      { do: "Operations → switch that item off (sold out).", see: "The customer is offered up to three similar items or a refund, with a countdown. No answer = automatic refund." },
    ],
  },
  {
    n: 5, title: "A coordinator books a meeting", who: "Coordinator — Tanvir", minutes: "1 min",
    steps: [
      { do: "DEMO ▾ → Coordinator → Bulk order.", see: "Needs 24 hours' notice; times sooner than that are blocked. Delivered to a room, no payment now." },
      { do: "Operations → Cost-centre invoices.", see: "Bulk orders are billed to the cost centre on a monthly invoice." },
    ],
  },
  {
    n: 6, title: "The back office", who: "Operations", minutes: "1 min",
    steps: [
      { do: "Operations → HR staff list → Import sample list.", see: "Joiners added, a leaver deactivated — their number can no longer sign in.", open: { href: "/admin/hr", label: "HR list" } },
      { do: "Operations → Menu → Upload a photo on any item.", see: "The outlet's own photo replaces the sample photo straight away." },
    ],
  },
];

const ROLES = [
  { who: "Parents & students", what: "Register with a mobile number, choose a campus, order up to 7 days ahead, pay online, track the order and collect with a QR code." },
  { who: "Employees", what: "Recognised from the HR list. Their outlet and cost centre come from HR. VAT-free; 20% off at the Parent Lounge; may pay online or at the counter." },
  { who: "Coordinators", what: "Book food for meetings and events with 24 hours' notice, delivered to a room and billed to their cost centre monthly." },
  { who: "Kitchen", what: "Sees today's paid orders appear automatically, moves them to Ready, can reject with a reason (refunds are automatic)." },
  { who: "Counter & pickup TV", what: "Accepts pay-at-counter orders, hands over after QR + name check, marks bulk orders delivered. The TV shows ready numbers." },
  { who: "Operations (F&B)", what: "Switches items off, adds menu photos, sees the production list and daily sales, cost-centre invoices and the monthly HR list." },
];

const RULES: [string, string][] = [
  ["Who can order", "Registered parents and students, and staff on the HR list. No guest orders."],
  ["How far ahead", "Today or up to 7 days, in break-time pickup slots."],
  ["Cut-off", "8 PM the day before; same day, 60 minutes before the slot (to be confirmed by STS)."],
  ["Payment", "Parents and students pay online (bKash, Nagad, card). Staff may also pay at the counter."],
  ["VAT", "5% included for parents and students; employee orders are VAT-free."],
  ["Staff discount", "20% at the Parent Lounge only, for staff eligible on the HR list."],
  ["Changes", "Edit or cancel until the cut-off, before cooking starts. Refunds go back to the same method."],
  ["Sold out", "Customer chooses a substitute or refund; no answer in 15 minutes = automatic refund."],
  ["Collection", "QR code or order number, plus the customer's name."],
  ["Bulk orders", "Coordinators only, 24 hours' notice, room delivery, monthly cost-centre invoice."],
];

const btn = "inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold hover:no-underline";

export default function GuidePage() {
  return (
    <div className="min-h-dvh bg-sts-cream-2 text-sts-ink">
      <header className="sticky top-0 z-40 border-b border-sts-hairline bg-sts-white/90 backdrop-blur print:static">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="STS Group home"><Image src="/branding/sts-group-logo.png" alt="STS Group" width={96} height={41} className="h-9 w-auto" /></Link>
          <b className="hidden font-display text-lg text-sts-purple sm:inline">Demo guide</b>
          <nav aria-label="Guide sections" className="ml-auto hidden items-center gap-1 text-sm font-semibold md:flex">
            <a href="#flow" className="rounded-full px-3 py-1.5 text-sts-purple hover:bg-sts-purple-soft hover:no-underline">The flow</a>
            <a href="#script" className="rounded-full px-3 py-1.5 text-sts-purple hover:bg-sts-purple-soft hover:no-underline">Demo script</a>
            <a href="#roles" className="rounded-full px-3 py-1.5 text-sts-purple hover:bg-sts-purple-soft hover:no-underline">Who does what</a>
            <a href="#rules" className="rounded-full px-3 py-1.5 text-sts-purple hover:bg-sts-purple-soft hover:no-underline">Rules</a>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-2 print:hidden">
            <PrintButton />
            <Link href="/login" className={`${btn} bg-sts-action text-sts-ink shadow-[var(--sts-action-shadow)]`}>Start the demo →</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pb-20 sm:px-6">
        {/* summary */}
        <section className="grid gap-6 py-10 md:grid-cols-[1.2fr_1fr] md:items-center md:py-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-sts-orange-text">STS Group · online cafeteria ordering</p>
            <h1 className="mt-2 font-display text-[clamp(2.1rem,3.5vw+.6rem,3.6rem)] font-extrabold leading-[1.02] tracking-[-.03em] text-sts-purple">How an order works — from phone to pickup</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-sts-ink/80">
              Parents, students and staff order from their own campus cafeteria on the web or phone, pay in the app and pick a break-time slot.
              The kitchen sees the order at the right time, the pickup TV shows when it&apos;s ready, and the counter hands it over after a QR and name check.
            </p>
          </div>
          <ol className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6 md:grid-cols-3">
            {["Sign in", "Order", "Pay", "Prepare", "Ready", "Collect"].map((s, i) => (
              <li key={s} className="rounded-2xl bg-sts-white p-3 shadow-[0_0_0_1px_var(--sts-hairline)]">
                <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-sts-orange font-display text-sm font-bold">{i + 1}</span>
                <b className="mt-1.5 block text-sm text-sts-purple">{s}</b>
              </li>
            ))}
          </ol>
        </section>

        {/* swimlane */}
        <section id="flow" aria-labelledby="flow-title" className="scroll-mt-20">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="flow-title" className="font-display text-3xl font-extrabold text-sts-purple">The flow at a glance</h2>
              <p className="mt-1 text-sts-ink/75">Each row is a person or system; follow the numbers. Dashed notes are what happens around the main flow.</p>
            </div>
            <p className="text-xs text-muted md:hidden">Swipe sideways to see the whole diagram →</p>
          </div>
          <Swimlane />

          <ol className="mt-8 grid gap-3 md:grid-cols-2">
            {FLOW.map((s) => (
              <li key={s.n} className="flex gap-3 rounded-2xl bg-sts-white p-4 shadow-[0_0_0_1px_var(--sts-hairline)]">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-sts-orange font-display text-sm font-bold">{s.n}</span>
                <span>
                  <b className="block text-sm text-sts-purple">{{ customer: "Customer", app: "STS app", payment: "Payment", kitchen: "Kitchen", counter: "Counter & TV", ops: "Operations" }[s.lane]}</b>
                  <span className="text-sm text-sts-ink/85">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* demo script */}
        <section id="script" aria-labelledby="script-title" className="mt-16 scroll-mt-20">
          <h2 id="script-title" className="font-display text-3xl font-extrabold text-sts-purple">Run the demo in 10 minutes</h2>
          <div className="mt-4 grid gap-3 rounded-3xl bg-sts-purple-deep p-5 text-sts-white sm:grid-cols-3 sm:p-6">
            <div>
              <b className="font-display text-lg text-sts-orange">Before you start</b>
              <p className="mt-1 text-sm text-sts-white/80">On the demo hub press <b>Reset</b>, then use the demo clock so it&apos;s a school morning (e.g. 8:00 AM).</p>
            </div>
            <div>
              <b className="font-display text-lg text-sts-orange">One login</b>
              <p className="mt-1 text-sm text-sts-white/80">Sign in once with <b>{DEMO_LOGIN}</b> and code <b>123456</b>. The <b>DEMO ▾</b> button then switches between people and staff screens.</p>
            </div>
            <div>
              <b className="font-display text-lg text-sts-orange">Screens</b>
              <p className="mt-1 text-sm text-sts-white/80">For a room demo, open Kitchen, Pickup TV and Counter on other devices or tabs — they update by themselves.</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-3">
              <Link href="/demo" className={`${btn} bg-sts-white text-sts-purple`}>Demo hub</Link>
              <Link href="/login" className={`${btn} bg-sts-action text-sts-ink`}>Sign in</Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {STORIES.map((story) => (
              <article key={story.n} className="rounded-3xl bg-sts-white p-5 shadow-[0_0_0_1px_var(--sts-hairline)] sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-sts-purple font-display font-bold text-sts-white">{story.n}</span>
                  <h3 className="font-display text-xl font-bold text-sts-purple">{story.title}</h3>
                  <span className="ml-auto rounded-full bg-sts-orange-soft px-2.5 py-0.5 text-xs font-semibold text-sts-orange-text">{story.minutes}</span>
                </div>
                <p className="mt-1 text-sm text-muted">Demo as: <b className="text-sts-ink">{story.who}</b></p>
                <ol className="mt-4 flex flex-col gap-3">
                  {story.steps.map((s, i) => (
                    <li key={i} className="grid grid-cols-[auto_1fr] gap-3">
                      <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-sts-purple-soft text-xs font-bold text-sts-purple">{i + 1}</span>
                      <div>
                        <b className="block text-sm">{s.do}</b>
                        <span className="text-sm text-sts-ink/75">{s.see}</span>
                        {s.open && <Link href={s.open.href} prefetch={false} target="_blank" className="ml-2 whitespace-nowrap text-sm font-semibold text-sts-purple underline">{s.open.label} ↗</Link>}
                      </div>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>

        {/* roles */}
        <section id="roles" aria-labelledby="roles-title" className="mt-16 scroll-mt-20">
          <h2 id="roles-title" className="font-display text-3xl font-extrabold text-sts-purple">Who does what</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => (
              <li key={r.who} className="rounded-2xl bg-sts-white p-5 shadow-[0_0_0_1px_var(--sts-hairline)]">
                <b className="font-display text-lg text-sts-purple">{r.who}</b>
                <p className="mt-1 text-sm text-sts-ink/80">{r.what}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* rules */}
        <section id="rules" aria-labelledby="rules-title" className="mt-16 scroll-mt-20">
          <h2 id="rules-title" className="font-display text-3xl font-extrabold text-sts-purple">STS rules the prototype follows</h2>
          <p className="mt-1 text-sts-ink/75">From STS&apos;s answers to the online-ordering questionnaire. Items marked “to be confirmed” are still open with STS.</p>
          <div className="mt-4 overflow-hidden rounded-3xl bg-sts-white shadow-[0_0_0_1px_var(--sts-hairline)]">
            <dl className="divide-y divide-sts-hairline">
              {RULES.map(([k, v]) => (
                <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
                  <dt className="font-semibold text-sts-purple">{k}</dt>
                  <dd className="text-sm text-sts-ink/85">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* sandbox vs production */}
        <section aria-labelledby="next-title" className="mt-16 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-sts-white p-6 shadow-[0_0_0_1px_var(--sts-hairline)]">
            <h2 id="next-title" className="font-display text-2xl font-extrabold text-sts-purple">In this prototype</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-sts-ink/85">
              <li>Payments, SMS and the HR list are sandboxes — nothing is charged or sent.</li>
              <li>Menu photos are representative samples; outlets can upload their own.</li>
              <li>Menus per outlet, pickup slots and cut-off times are samples until STS confirms them.</li>
            </ul>
          </div>
          <div className="rounded-3xl bg-sts-white p-6 shadow-[0_0_0_1px_var(--sts-hairline)]">
            <h2 className="font-display text-2xl font-extrabold text-sts-purple">In production</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-sts-ink/85">
              <li>Orders go into Odoo POS and its kitchen display at each outlet.</li>
              <li>A real payment gateway (e.g. SSLCommerz, bKash, Nagad) and SMS provider.</li>
              <li>The HR list and reports connect to STS&apos;s systems.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
