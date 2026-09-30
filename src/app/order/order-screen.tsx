"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState, useTransition } from "react";
import { FoodArt } from "@/components/food/food-art";
import { MenuCard } from "@/components/food/menu-card";
import { cardLine } from "@/lib/card-lines";
import { foodLook } from "@/lib/food-kind";
import { takeHandoff } from "@/lib/tray-handoff";
import Image from "next/image";
import Link from "next/link";
import { editOrderAction, placeOrderAction } from "@/app/actions";
import { useLocalState } from "@/components/local-store";
import { useResult, useToast } from "@/components/toast";
import { PENDING, RULES, money, price } from "@/lib/rules";
import { formatDay, time12 } from "@/lib/time";

type Product = {
  id: string; category: string; name: string; description: string | null; price: number | null; unit: string;
  weekday: string | null; comboItems: string[] | null; flags: string[] | null; available: boolean; reason: string | null;
  photos: string[] | null;
};
type Slot = { id: string; label: string; startsAt: string; endsAt: string; capacity: number; remaining: number; open: boolean; reason: string | null; cutoffMs: number; cutoffRule: string };
type DateOpt = { date: string; weekday: string; open: boolean; reason: string | null };
/** An existing order opened for changes (until cut-off). */
export type Editing = { id: string; tracking: string; slotId: string; lines: Record<string, number>; held: number; paid: boolean };
export type MenuPayload = { now: { ms: number; date: string; time: string; offsetMinutes: number }; date: string; dates: DateOpt[]; menu: Product[]; slots: Slot[] };

type Props = {
  initial: MenuPayload;
  customer: { id: string; name: string; accountType: "parent" | "student" | "employee"; discountEligible: boolean };
  outlet: { id: string; name: string; kind: string; menuAssignmentConfirmed: boolean };
  welcome?: string;
  editing?: Editing;
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const EMPTY_CART: Record<string, number> = {};

export function OrderScreen({ initial, customer, outlet, welcome, editing }: Props) {
  const router = useRouter();
  const handle = useResult();
  const { show } = useToast();
  const [data, setData] = useState(initial);
  const [slotId, setSlotId] = useState<string | null>(editing?.slotId ?? null);
  const [payMode, setPayMode] = useState<"online" | "counter">("online");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Product | null>(null);
  const [panelQty, setPanelQty] = useState(1);
  const [drawer, setDrawer] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  // height of the sticky site header, so the category bar and order panel sit just below it
  const [stick, setStick] = useState(60);
  const [pending, start] = useTransition();
  // the cart survives page changes on this device; an edit works on a draft of the order
  const [stored, setStored] = useLocalState(`sts-cart-${customer.id}-${outlet.id}`, EMPTY_CART);
  const [draft, setDraft] = useState<Record<string, number>>(editing?.lines ?? EMPTY_CART);
  const cart = editing ? draft : stored;
  const setCart = editing ? setDraft : setStored;
  // the order's own slot stays selectable while editing, even if it now shows full
  const selectable = (s: Slot) => s.open || (editing != null && s.id === editing.slotId && s.reason === "Full");

  useEffect(() => {
    if (welcome === "employee") show({ title: "Welcome! Your staff account was verified from the HR list.", tone: "info" });
    else if (welcome) show({ title: "Account created. You can order now.", tone: "info" });
  }, [welcome, show]);

  // items sent from the landing page or the Balanced Tray game (once)
  const applyHandoff = useEffectEvent(() => {
    const h = takeHandoff();
    if (!h) return;
    const byId = new Map(initial.menu.map((p) => [p.id, p]));
    const ok = h.items.filter((i) => byId.get(i.id)?.available);
    const skipped = h.items.filter((i) => !byId.get(i.id)?.available);
    if (ok.length) setCart((c) => {
      const next = { ...c };
      for (const i of ok) next[i.id] = Math.min(50, (next[i.id] ?? 0) + i.qty);
      return next;
    });
    if (ok.length) show({ title: `${ok.reduce((a, i) => a + i.qty, 0)} item${ok.length === 1 && ok[0].qty === 1 ? "" : "s"} from your tray added`, tone: "info" });
    if (skipped.length) show({ title: `Not on ${outlet.name}'s menu today: ${skipped.map((i) => i.name).join(", ")}`, rule: "Menu by outlet and day", tone: "danger" });
  });
  useEffect(() => {
    if (!editing) applyHandoff();
  }, [editing]);

  const load = async (date: string) => {
    const res = await fetch(`/api/menu?date=${date}`, { cache: "no-store" });
    if (res.ok) {
      const next = (await res.json()) as MenuPayload;
      setData(next);
      setSlotId((cur) => (next.slots.some((s) => s.id === cur && selectable(s)) ? cur : null));
    }
  };

  // keep slot availability fresh while the page is open
  const poll = useEffectEvent(() => load(data.date));
  useEffect(() => {
    const id = setInterval(() => poll(), 20_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const measure = () => setStick(Math.round(header.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  // highlight the category being read: the last section whose heading has
  // passed under the sticky category bar
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const line = stick + 70;
        const els = [...document.querySelectorAll<HTMLElement>("[data-cat]")];
        let current = els[0]?.dataset.cat ?? null;
        for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.dataset.cat ?? current;
        // at the very bottom, the last section wins
        if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = els.at(-1)?.dataset.cat ?? current;
        setActiveCat(current);
      });
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => { removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [stick, data.menu, query]);

  const goTo = (name: string) => {
    setActiveCat(name);
    document.getElementById(slug(name))?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  const byId = useMemo(() => new Map(data.menu.map((p) => [p.id, p])), [data.menu]);
  const categories = useMemo(() => {
    const out: { name: string; items: Product[] }[] = [];
    for (const p of data.menu) {
      if (query && !`${p.name} ${cardLine(p) ?? ""}`.toLowerCase().includes(query.toLowerCase())) continue;
      let c = out.find((x) => x.name === p.category);
      if (!c) out.push((c = { name: p.category, items: [] }));
      c.items.push(p);
    }
    return out;
  }, [data.menu, query]);

  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ id, qty, p: byId.get(id) }));
  const valid = lines.filter((l) => l.p?.available && l.p.price != null);
  const blocked = lines.filter((l) => !l.p?.available);
  const totals = price({
    accountType: customer.accountType,
    isParentLounge: outlet.kind === "parent_lounge",
    discountEligible: customer.discountEligible,
    lines: valid.map((l) => ({ unitPrice: l.p!.price!, qty: l.qty })),
  });
  const count = valid.reduce((a, l) => a + l.qty, 0);
  const slot = data.slots.find((s) => s.id === slotId) ?? null;

  const setQty = (id: string, qty: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(50, qty)) }));
  const add = (p: Product, qty = 1) => {
    if (!p.available) return;
    setQty(p.id, (cart[p.id] ?? 0) + qty);
    show({ title: `${qty} × ${p.name} added`, tone: "info" });
  };

  const place = () =>
    start(async () => {
      if (!slot) return void show({ title: "Choose a pickup time first.", rule: "Every order needs a pickup slot", tone: "danger" });
      if (editing) {
        const r = await editOrderAction(editing.id, { slotId: slot.id, lines: valid.map((l) => ({ productId: l.id, qty: l.qty })) });
        if (!handle(r, "Order updated") || !r.ok) return void (await load(data.date));
        router.push((r.data as { next: string }).next);
        router.refresh();
        return;
      }
      const r = await placeOrderAction({
        outletId: outlet.id,
        date: data.date,
        slotId: slot.id,
        paymentMode: payMode,
        lines: valid.map((l) => ({ productId: l.id, qty: l.qty })),
      });
      if (!handle(r) || !r.ok) {
        await load(data.date);
        return;
      }
      setCart(EMPTY_CART);
      router.push((r.data as { next: string }).next);
    });

  const section = "text-2xs font-bold uppercase tracking-[.12em] text-muted";
  const openSlots = data.slots.filter((s) => selectable(s));
  const closedSlots = data.slots.length - openSlots.length;
  const cutoffText = (s: Slot) =>
    new Date(s.cutoffMs).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", weekday: data.date === data.now.date ? undefined : "short", hour: "numeric", minute: "2-digit", hour12: true }).replace(" am", " AM").replace(" pm", " PM");

  const cartPanel = (
    <aside
      aria-label="Your order"
      style={{ ["--stick" as string]: `${stick + 16}px` }}
      className={`fixed inset-x-0 bottom-0 z-40 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl bg-so-surface shadow-o-pop transition-transform duration-200 cart:sticky cart:top-(--stick) cart:z-auto cart:max-h-[calc(100dvh-var(--stick)-16px)] cart:translate-y-0 cart:rounded-3xl cart:shadow-[0_0_0_1px_var(--sts-hairline)] ${drawer ? "translate-y-0" : "translate-y-[105%]"}`}
    >
      <div className="flex items-center justify-between px-5 pb-3 pt-4">
        <h2 className="font-display text-xl font-bold text-sts-accent">Your order</h2>
        {drawer ? (
          <button className="rounded-full px-3 py-1 text-sm font-semibold text-muted hover:bg-surface-3" onClick={() => setDrawer(false)}>Close</button>
        ) : (
          <span className="rounded-full bg-so-bg px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted">{count} item{count === 1 ? "" : "s"}</span>
        )}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 pb-3">
        {/* when */}
        <div className="flex items-baseline justify-between">
          <h3 className={section}>Pickup day</h3>
          <span className="text-2xs text-muted">up to {RULES.maxDaysAhead} days ahead</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Pickup day">
          {data.dates.map((d) => {
            const on = d.date === data.date;
            return (
              <button
                key={d.date}
                role="radio"
                aria-checked={on}
                disabled={!d.open}
                title={d.reason ?? undefined}
                onClick={() => load(d.date)}
                className={`rounded-xl py-1.5 text-center leading-tight transition-colors disabled:cursor-default disabled:opacity-35 ${on ? "bg-sts-accent text-sts-accent-ink" : "bg-so-bg text-ink hover:bg-surface-3"}`}
              >
                <small className={`block text-2xs font-semibold uppercase ${on ? "opacity-85" : "text-muted"}`}>{d.date === data.now.date ? "Today" : d.weekday}</small>
                <b className="text-base">{Number(d.date.slice(8))}</b>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-baseline justify-between">
          <h3 className={section}>Pickup time</h3>
          <span className="text-2xs text-muted" title={PENDING.slots}>sample times</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Pickup time">
          {openSlots.map((s) => {
            const on = s.id === slotId;
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={on}
                onClick={() => setSlotId(s.id)}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${on ? "border-sts-accent bg-sts-purple-soft" : "border-line bg-so-surface hover:border-sts-accent/40"}`}
              >
                <b className={`block text-sm ${on ? "text-sts-accent" : "text-ink"}`}>{time12(s.startsAt)}</b>
                <small className="block text-2xs text-muted">{s.label !== "Pickup" && <>{s.label} · </>}order by {cutoffText(s)}</small>
              </button>
            );
          })}
        </div>
        {openSlots.length === 0 && (
          <p className="mt-1 rounded-xl bg-so-bg px-3 py-3 text-center text-sm text-muted">
            {data.slots.length ? "No more pickup times this day — pick another day." : "No pickup on this day."}
          </p>
        )}
        {openSlots.length > 0 && closedSlots > 0 && <p className="mt-1.5 text-2xs text-muted">{closedSlots} earlier time{closedSlots === 1 ? "" : "s"} already closed.</p>}
        {slot && <p className="mt-1.5 text-2xs text-muted" title={PENDING.cutoffs}>{slot.cutoffRule} (to be confirmed).</p>}

        {/* what */}
        <h3 className={`${section} mt-5`}>Items</h3>
        {lines.length === 0 ? (
          <div className="mt-2 flex flex-col items-center gap-1 rounded-2xl border border-dashed border-line py-6 text-center">
            <FoodArt kind="burger" steam={false} className="h-12 w-12 opacity-60" />
            <p className="text-sm text-muted">Your order is empty.<br />Tap <b className="text-ink">+</b> on any item.</p>
          </div>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-line">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{l.p?.name ?? "Unavailable item"}</div>
                  {!l.p?.available ? (
                    <div className="text-xs text-danger">{l.p?.reason ?? "Not on this day's menu"} — remove to continue</div>
                  ) : (
                    <div className="text-xs tabular-nums text-muted">{l.p?.price != null ? money(l.p.price * l.qty) : "—"}</div>
                  )}
                </div>
                <div className="flex items-center rounded-full bg-so-bg">
                  <button aria-label="Less" className="grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-surface-3" onClick={() => setQty(l.id, l.qty - 1)}>−</button>
                  <span className="min-w-5 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                  <button aria-label="More" className="grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-surface-3 disabled:opacity-40" onClick={() => setQty(l.id, l.qty + 1)} disabled={!l.p?.available}>+</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line bg-so-surface px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3 cart:pb-4">
        <dl className="flex flex-col gap-0.5 text-sm tabular-nums">
          <div className="flex justify-between"><dt className="text-muted">Items</dt><dd>{money(totals.subtotal)}</dd></div>
          {totals.discount > 0 && <div className="flex justify-between text-success"><dt>{totals.discountRule}</dt><dd>−{money(totals.discount)}</dd></div>}
          {totals.discountNote && <div className="flex justify-between text-muted"><dt className="truncate pr-2">{totals.discountNote}</dt><dd>৳0</dd></div>}
          <div className="flex justify-between text-muted"><dt>{totals.vatRule}</dt><dd>{money(totals.vat)}</dd></div>
          <div className="mt-1 flex items-baseline justify-between"><dt className="font-bold">Total</dt><dd className="font-display text-2xl font-extrabold text-sts-accent">{money(totals.total)}</dd></div>
        </dl>
        {editing ? (
          <div className="mt-2.5 rounded-xl bg-so-bg px-3 py-2 text-xs text-muted">
            {editing.paid
              ? totals.total > editing.held
                ? <>Paid so far {money(editing.held)}. You&apos;ll pay the <b className="text-ink">{money(totals.total - editing.held)}</b> difference next.</>
                : totals.total < editing.held
                  ? <>Paid so far {money(editing.held)}. <b className="text-ink">{money(editing.held - totals.total)}</b> goes back to your original payment method (sandbox).</>
                  : <>Paid {money(editing.held)} — no change to pay.</>
              : "Payment stays as chosen when you placed the order."}
          </div>
        ) : customer.accountType === "employee" ? (
          <div className="mt-3 grid grid-cols-2 rounded-full bg-so-bg p-1" role="radiogroup" aria-label="Payment">
            {(["online", "counter"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={payMode === m}
                onClick={() => setPayMode(m)}
                className={`rounded-full py-1.5 text-xs font-semibold transition-colors ${payMode === m ? "bg-so-surface text-sts-accent shadow-sm" : "text-muted"}`}
              >
                {m === "online" ? "Pay online" : "Pay at counter"}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">Pay online with bKash, Nagad or card.</p>
        )}
        <button className="o-so-btn o-so-btn-primary mt-3 w-full disabled:cursor-default disabled:opacity-50" disabled={pending || valid.length === 0 || blocked.length > 0 || !slot} onClick={place}>
          {pending ? (editing ? "Saving…" : "Placing order…") : !slot && valid.length > 0 ? "Choose a pickup time" : editing ? `Save changes · ${money(totals.total)}` : payMode === "counter" ? `Place order · ${money(totals.total)}` : `Checkout · ${money(totals.total)}`}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="mx-auto grid max-w-[1380px] grid-cols-[minmax(0,1fr)] items-start gap-6 px-4 pb-28 pt-5 *:min-w-0 sm:px-5 cart:grid-cols-[minmax(0,1fr)_360px] cart:pb-8">
        <section>
          {editing && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-so-price/30 bg-so-surface px-4 py-3 shadow-o-sm">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-so-bg text-lg" aria-hidden>✎</span>
              <div className="min-w-0 flex-1">
                <b className="block">Editing order {editing.tracking}</b>
                <small className="text-muted">Change items or the pickup time until the cut-off. The kitchen sees the new version.</small>
              </div>
              <Link href={`/orders/${editing.id}`} className="o-btn o-btn-sm">Discard changes</Link>
            </div>
          )}

          {/* title + search */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-sts-orange-text">{outlet.name} · menu</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold tracking-[-.02em] text-sts-accent">{formatDay(data.date, data.now.date)}</h1>
            </div>
            <label className="relative w-full sm:w-72">
              <span className="sr-only">Search the menu</span>
              <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="9" r="5.5" /><path d="M13.5 13.5L17 17" /></svg>
              <input
                className="h-11 w-full rounded-full border border-line bg-so-surface pl-10 pr-4 text-sm text-ink focus:border-sts-accent focus:outline-none focus:ring-3 focus:ring-focus"
                type="search"
                placeholder="Search the menu"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search the menu"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted" title={`${PENDING.menu}. ${PENDING.vat}.`}>
            {!outlet.menuAssignmentConfirmed && "Sample menu for this outlet · "}Prices include VAT for parents and students (to be confirmed by STS).
          </p>

          {/* categories: sticky, follows the scroll */}
          <nav
            aria-label="Menu sections"
            style={{ top: stick }}
            className="scrollbar-none sticky z-15 -mx-4 mt-3 flex gap-1.5 overflow-x-auto bg-so-bg/95 px-4 py-2.5 backdrop-blur sm:-mx-5 sm:px-5"
          >
            {categories.map((c) => {
              const on = activeCat === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => goTo(c.name)}
                  className={`flex flex-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${on ? "bg-sts-accent text-sts-accent-ink" : "bg-so-surface text-ink shadow-[0_0_0_1px_var(--sts-hairline)] hover:bg-surface-3"}`}
                >
                  {c.name}
                  <span className={`text-2xs tabular-nums ${on ? "opacity-80" : "text-muted"}`}>{c.items.length}</span>
                </button>
              );
            })}
          </nav>

          {categories.length === 0 && <div className="o-empty mt-6">Nothing matches “{query}”.</div>}
          {categories.map((c) => (
            <div key={c.name} id={slug(c.name)} data-cat={c.name} className="pt-4" style={{ scrollMarginTop: stick + 56 }}>
              <h2 className="mb-3 flex items-baseline gap-2 font-display text-xl font-bold text-sts-accent">
                {c.name} <small className="font-sans text-xs font-medium text-muted">{c.items.length} item{c.items.length === 1 ? "" : "s"}</small>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {c.items.map((p) => (
                  <MenuCard
                    key={p.id}
                    compact
                    item={{ id: p.id, name: p.name, price: p.price, description: cardLine(p), look: foodLook(p.name, p.category), unit: p.unit, photos: p.photos }}
                    disabled={!p.available}
                    onAdd={() => add(p)}
                    onOpen={() => { setOpen(p); setPanelQty(1); }}
                    badges={
                      <>
                        {p.weekday && <span className="rounded-full bg-sts-purple px-2 py-px font-semibold text-sts-white">Day special</span>}
                        {!p.available && <span className="rounded-full bg-sts-white px-2 py-px font-semibold text-sts-ink shadow-sm">{p.reason}</span>}
                        {p.flags && p.available && <span className="pill-confirm" title={p.flags.join("\n")}>to confirm</span>}
                      </>
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </section>

        {cartPanel}
      </div>

      {drawer && <div className="fixed inset-0 z-35 bg-overlay cart:hidden" onClick={() => setDrawer(false)} />}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-line bg-so-surface px-4 pb-[calc(8px+env(safe-area-inset-bottom,0px))] pt-2 shadow-o-md cart:hidden">
        <div>
          <div className="text-xs text-muted">{count} item{count === 1 ? "" : "s"}</div>
          <b className="tabular-nums text-so-price">{money(totals.total)}</b>
        </div>
        <button className="o-so-btn o-so-btn-primary ml-auto h-12" onClick={() => setDrawer(true)}>View order</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4" role="dialog" aria-modal="true" aria-label={open.name} onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="flex max-h-[92vh] w-[min(560px,100%)] flex-col overflow-hidden rounded-2xl bg-so-surface shadow-o-pop">
            <div className="relative bg-[radial-gradient(circle_at_50%_70%,var(--sts-orange-soft)_0%,var(--sts-cream-2)_72%)] px-5 pb-4 pt-4 text-sts-ink">
              <button onClick={() => setOpen(null)} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-sts-white text-lg shadow-sm">✕</button>
              {open.photos?.length ? (
                <div className={`mx-auto mb-3 grid h-44 max-w-sm gap-1 overflow-hidden rounded-2xl sm:h-52 ${open.photos.length > 1 ? "grid-cols-2" : ""}`}>
                  {open.photos.slice(0, 2).map((src) => (
                    <div key={src} className="relative">
                      <Image src={src} alt={open.photos!.length > 1 ? `${open.name} — photo ${open.photos!.indexOf(src) + 1}` : open.name} fill sizes="384px" className="object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <FoodArt kind={foodLook(open.name, open.category).kind} tint={foodLook(open.name, open.category).tint} className="mx-auto h-40 w-auto drop-shadow-[0_16px_16px_var(--sts-drop)] sm:h-48" />
              )}
              <small className="text-2xs font-semibold uppercase tracking-wider text-sts-orange-text">{open.category}</small>
              <h2 className="mt-0.5 font-display text-2xl font-bold text-sts-purple">{open.name}</h2>
              {open.photos?.length ? (
                <p className="mt-2 text-xs text-muted">Representative food photo; actual servings may vary. <Link href="/photo-credits" className="underline">Photo credits</Link></p>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto p-5">
              {cardLine(open) && !open.comboItems && <p className="text-muted">{cardLine(open)}</p>}
              {open.comboItems && <div className="flex flex-wrap gap-1.5">{open.comboItems.map((c) => <span key={c} className="rounded-full bg-so-bg px-3 py-1 text-xs">{c}</span>)}</div>}
              {open.weekday && <p><b>Day special</b> — available on this day only.</p>}
              {open.flags && (
                <div className="rounded-md bg-warning-bg px-3 py-2 text-xs text-warning">
                  <b>To confirm with STS:</b>
                  <ul className="mt-1 list-disc pl-4">{open.flags.map((f) => <li key={f}>{f.replace(/^[a-z_]+: /, "")}</li>)}</ul>
                </div>
              )}
              {!open.available && <div className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{open.reason}</div>}
            </div>
            <div className="flex items-center gap-4 border-t border-line px-5 py-3">
              <div className="so-step">
                <button aria-label="Less" onClick={() => setPanelQty((q) => Math.max(1, q - 1))}>−</button>
                <span>{panelQty}</span>
                <button aria-label="More" onClick={() => setPanelQty((q) => Math.min(50, q + 1))}>+</button>
              </div>
              <span className="text-lg font-bold tabular-nums text-so-price">{open.price != null ? money(open.price * panelQty) : "—"}</span>
              <button className="o-so-btn o-so-btn-primary ml-auto" disabled={!open.available} onClick={() => { add(open, panelQty); setOpen(null); }}>Add to order</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
