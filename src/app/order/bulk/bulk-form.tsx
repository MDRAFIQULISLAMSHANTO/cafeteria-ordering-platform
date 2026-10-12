"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { placeBulkOrderAction } from "@/app/actions";
import { MenuCard } from "@/components/food/menu-card";
import { useResult, useToast } from "@/components/toast";
import { cardLine } from "@/lib/card-lines";
import { foodLook } from "@/lib/food-kind";
import { money, price } from "@/lib/rules";
import { at, formatDay, time12 } from "@/lib/time";
import type { MenuPayload } from "../order-screen";

type Props = {
  initial: MenuPayload;
  coordinator: { name: string; costCentre: string; discountEligible: boolean };
  outlet: { name: string; kind: string };
  noticeHours: number;
  maxQty: number;
};

const label = "mb-1.5 block text-sm font-semibold";
const input = "h-11 w-full rounded-lg border border-line-strong bg-so-surface px-3 text-ink focus:border-so-price focus:outline-none focus:ring-3 focus:ring-focus";

export function BulkForm({ initial, coordinator, outlet, noticeHours, maxQty }: Props) {
  const router = useRouter();
  const handle = useResult();
  const { show } = useToast();
  const [data, setData] = useState(initial);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [deliverTo, setDeliverTo] = useState("");
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();

  const load = async (date: string) => {
    const res = await fetch(`/api/menu?date=${date}`, { cache: "no-store" });
    if (!res.ok) return;
    setData((await res.json()) as MenuPayload);
    setSlotId(null);
  };

  const noticeOk = (startsAt: string) => at(data.date, startsAt) - data.now.ms >= noticeHours * 3_600_000;
  const menu = useMemo(
    () => data.menu.filter((p) => p.available && p.price != null && (!query || p.name.toLowerCase().includes(query.toLowerCase()))),
    [data.menu, query],
  );
  // the menu in its sections, as on the order page
  const sections = useMemo(() => {
    const by = new Map<string, typeof menu>();
    for (const p of menu) (by.get(p.category) ?? by.set(p.category, []).get(p.category)!).push(p);
    return [...by];
  }, [menu]);
  const lines = data.menu.filter((p) => (qty[p.id] ?? 0) > 0 && p.available && p.price != null);
  const totals = price({
    accountType: "employee",
    isParentLounge: outlet.kind === "parent_lounge",
    discountEligible: coordinator.discountEligible,
    lines: lines.map((p) => ({ unitPrice: p.price!, qty: qty[p.id] })),
  });
  const count = lines.reduce((a, p) => a + qty[p.id], 0);
  const set = (id: string, n: number) => setQty((c) => ({ ...c, [id]: Math.max(0, Math.min(maxQty, Math.round(n) || 0)) }));

  const submit = () =>
    start(async () => {
      if (!slotId) return void show({ title: "Choose a delivery time.", rule: `Bulk orders need ${noticeHours} hours' notice`, tone: "danger" });
      const r = await placeBulkOrderAction({ eventName, date: data.date, slotId, deliverTo, notes, lines: lines.map((p) => ({ productId: p.id, qty: qty[p.id] })) });
      if (!handle(r, "Bulk order booked") || !r.ok) return;
      router.push((r.data as { next: string }).next);
    });

  return (
    <div className="mx-auto grid max-w-[1180px] items-start gap-5 px-4 py-5 md:py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <span className="kicker">Coordinator · bulk order</span>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">Food for a meeting or event</h1>
          <p className="mt-1 text-muted">
            Delivered to your room by the {outlet.name} team and billed to cost centre <b className="text-ink">{coordinator.costCentre}</b> on the monthly invoice.
            Book at least {noticeHours} hours ahead.
          </p>
        </div>

        <section className="rounded-2xl bg-so-surface p-4 shadow-o-sm md:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="event" className={label}>Meeting or event</label>
              <input id="event" className={input} value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Board meeting — Q3 review" />
            </div>
            <div>
              <label htmlFor="room" className={label}>Deliver to</label>
              <input id="room" className={input} value={deliverTo} onChange={(e) => setDeliverTo(e.target.value)} placeholder="e.g. Room 302, 3rd floor" />
            </div>
          </div>

          <div className="mt-4">
            <div className={label}>Day</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="radiogroup" aria-label="Delivery day">
              {data.dates.map((d) => (
                <button
                  key={d.date}
                  role="radio"
                  aria-checked={d.date === data.date}
                  disabled={!d.open}
                  onClick={() => load(d.date)}
                  className={`min-w-15 flex-none rounded-lg border px-2 py-1.5 text-center leading-tight disabled:opacity-40 ${d.date === data.date ? "border-primary bg-so-bg text-so-price" : "border-line bg-so-surface"}`}
                >
                  <small className="block text-2xs uppercase text-muted">{d.date === data.now.date ? "Today" : d.weekday}</small>
                  <b className="text-lg">{Number(d.date.slice(8))}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className={label}>Delivery time · {formatDay(data.date, data.now.date)}</div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3" role="radiogroup" aria-label="Delivery time">
              {data.slots.length === 0 && <p className="o-hint col-span-full">No delivery times on this day.</p>}
              {data.slots.map((s) => {
                const ok = noticeOk(s.startsAt);
                return (
                  <button
                    key={s.id}
                    role="radio"
                    aria-checked={s.id === slotId}
                    disabled={!ok}
                    onClick={() => setSlotId(s.id)}
                    className={`rounded-lg border px-3 py-2 text-left disabled:opacity-45 ${s.id === slotId ? "border-primary bg-so-bg" : "border-line bg-so-surface"}`}
                  >
                    <b className="block">{time12(s.startsAt)}</b>
                    <small className="text-muted">{ok ? "Available" : `Under ${noticeHours} h notice`}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="notes" className={label}>Notes for the kitchen <span className="font-normal text-muted">(optional)</span></label>
            <input id="notes" className={input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 3 vegetarian, serve at 10:45" />
          </div>
        </section>

        <section className="rounded-2xl bg-so-surface p-4 shadow-o-sm md:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Items <small className="text-xs font-normal text-muted">up to {maxQty} each</small></h2>
            <input type="search" aria-label="Search items" placeholder="Search items" className={`${input} h-10 md:w-64`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {menu.length === 0 && <p className="o-hint">Nothing matches “{query}”.</p>}
          {sections.map(([name, items]) => (
            <div key={name} className="mt-4 first:mt-0">
              <h3 className="mb-2 flex items-baseline gap-2 font-display text-base font-bold text-sts-accent">
                {name} <small className="font-sans text-xs font-medium text-muted">{items.length}</small>
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((p) => (
                  <MenuCard
                    key={p.id}
                    compact
                    item={{ id: p.id, name: p.name, price: p.price, description: cardLine(p), look: foodLook(p.name, p.category), unit: p.unit, photos: p.photos }}
                    onAdd={() => set(p.id, (qty[p.id] ?? 0) + 1)}
                    qty={qty[p.id] ?? 0}
                    onQty={(n) => set(p.id, n)}
                    max={maxQty}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      <aside className="rounded-2xl bg-so-surface p-4 shadow-o-sm lg:sticky lg:top-21">
        <h2 className="text-lg font-bold">Summary</h2>
        <p className="text-sm text-muted">{count} item{count === 1 ? "" : "s"} · {coordinator.name}</p>
        <ul className="my-3 flex max-h-60 flex-col gap-1 overflow-y-auto text-sm">
          {lines.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">{qty[p.id]}× {p.name}</span>
              <button type="button" aria-label={`Remove ${p.name}`} onClick={() => set(p.id, 0)} className="flex-none rounded px-1.5 text-muted hover:bg-surface-3 hover:text-danger">✕</button>
            </li>
          ))}
          {lines.length === 0 && <li className="text-muted">No items yet.</li>}
        </ul>
        <div className="flex flex-col gap-0.5 border-t border-line pt-3 text-sm tabular-nums">
          <div className="flex justify-between"><span className="text-muted">Items (excl. VAT)</span><span>{money(totals.subtotal)}</span></div>
          {totals.discount > 0 && <div className="flex justify-between text-success"><span>{totals.discountRule}</span><span>−{money(totals.discount)}</span></div>}
          <div className="flex justify-between text-muted"><span>{totals.vatRule}</span><span>{money(0)}</span></div>
          <div className="mt-1.5 flex justify-between text-xl font-bold"><span>Total</span><span className="text-so-price">{money(totals.total)}</span></div>
        </div>
        <p className="mt-2 rounded-lg bg-so-bg px-3 py-2 text-xs text-muted">No payment now — billed to <b className="text-ink">{coordinator.costCentre}</b> on the monthly cost-centre invoice.</p>
        <button className="o-so-btn o-so-btn-primary mt-3 w-full disabled:opacity-50" disabled={pending || lines.length === 0} onClick={submit}>
          {pending ? "Booking…" : `Book bulk order · ${money(totals.total)}`}
        </button>
      </aside>
    </div>
  );
}
