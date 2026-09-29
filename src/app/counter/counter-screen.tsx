"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { acceptAction, collectAction, lookupAction, rejectAction } from "@/app/actions";
import { ActorSwitcher } from "@/components/demo/actor-switcher";
import { useLive } from "@/components/live";
import { Clock, OutletSelect, ThemeToggle, type OutletOpt } from "@/components/staff";
import { useResult, useToast } from "@/components/toast";
import { StateBadge } from "@/components/ui";
import { ACCOUNT_LABEL, money, type AccountType } from "@/lib/rules";
import { time12 } from "@/lib/time";

const cardTitle = "mb-3 flex items-center justify-between text-lg font-bold";
const qItem = "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-line bg-surface p-3 [&_small]:block [&_small]:text-muted";

type Row = {
  id: string;
  order: { id: string; tracking: string; total: number; pickupDate: string; kitchenState: string; accountType: string; collectedAt: string | null; collectedBy: string | null };
  customer: { name: string; employeeId: string | null; costCentre: string | null };
  slot: { label: string; startsAt: string };
  lines: { id: string; name: string; qty: number }[];
};
type Board = { now: { ms: number; date: string }; awaiting: Row[]; ready: Row[]; collected: Row[] };
type Found = {
  via: "qr" | "lookup";
  order: { id: string; tracking: string; state: string; kitchenState: string; total: number; collectedAt: string | null; pickupDate: string };
  customer: { name: string; accountType: string; classGrade: string | null; section: string | null; phoneTail: string };
  lines: { name: string; qty: number }[];
};

export function CounterScreen({ outletId, outlets, personaId }: { outletId: string; outlets: OutletOpt[]; personaId: string | null }) {
  const { data, refresh } = useLive<Board>(`/api/live/counter?outlet=${outletId}`, 2000);
  const handle = useResult();
  const { show } = useToast();
  const [code, setCode] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [nameOk, setNameOk] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const lookup = (value: string) =>
    start(async () => {
      setDone(null);
      setNameOk(false);
      const r = await lookupAction(outletId, value);
      if (!handle(r) || !r.ok) { setFound(null); return; }
      setFound(r.data as Found);
      setCode("");
    });

  const handOver = () =>
    start(async () => {
      if (!found) return;
      const r = await collectAction(found.order.id, found.via, nameOk);
      if (handle(r)) {
        setDone(`${found.order.tracking} handed to ${found.customer.name}.`);
        setFound(null);
        setNameOk(false);
        input.current?.focus();
      }
      await refresh();
    });

  const accept = (row: Row, method: "cash" | "card_terminal") =>
    start(async () => {
      if (handle(await acceptAction(row.order.id, method))) show({ title: `${row.order.tracking} accepted — sent to the kitchen`, tone: "info" });
      await refresh();
    });

  return (
    <div className="min-h-screen bg-kds-bg text-ink">
      <header className="o-kds-bar">
        <div className="o-kds-bar-left">
          <Link className="o-kds-iconbtn" href="/demo" title="Demo hub">☰</Link>
          <ThemeToggle />
          <OutletSelect outlets={outlets} value={outletId} path="/counter" />
        </div>
        <nav className="o-kds-tabs"><b className="text-lg">Counter · collection</b></nav>
        <div className="o-kds-bar-right"><ActorSwitcher tone="staff" staffScreen="counter" personaId={personaId} outletId={outletId} staffUnlocked /><Clock ms={data?.now.ms} /></div>
      </header>

      <div className="grid items-start gap-4 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="staff-card">
          <h2 className={cardTitle}>Scan QR or enter order number</h2>
          <form onSubmit={(e) => { e.preventDefault(); lookup(code); }}>
            <input
              ref={input}
              className="h-15 w-full rounded-lg border-2 border-line-strong bg-surface px-4 text-2xl text-ink focus:border-accent focus:outline-none focus:ring-3 focus:ring-focus"
              placeholder="Scan the customer's QR, or type e.g. S12"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              aria-label="QR code or order number"
            />
          </form>
          <p className="o-hint mt-1.5">A USB or handheld scanner types the code and presses Enter. Order-number lookup is the fallback — both need the name check.</p>

          {done && <div className="mt-4 rounded-lg bg-success-bg p-3 font-semibold text-success">✓ {done}</div>}

          {found && (
            <div className="mt-4 overflow-hidden rounded-lg border border-line">
              <div className="flex items-center justify-between bg-kds-card-head px-4 py-3 text-kds-card-head-ink">
                <b className="text-3xl">{found.order.tracking}</b>
                <span>{found.via === "qr" ? "Found by QR" : "Found by order number"}</span>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div>
                  <div className="o-hint">Customer</div>
                  <div className="text-2xl font-bold">{found.customer.name}</div>
                  <div className="o-hint">
                    {ACCOUNT_LABEL[found.customer.accountType as AccountType]}
                    {found.customer.classGrade ? ` · Class ${found.customer.classGrade}${found.customer.section}` : ""} · mobile ···{found.customer.phoneTail}
                  </div>
                </div>
                <div>{found.lines.map((l, i) => <div key={i}><b>{l.qty}x</b> {l.name}</div>)}</div>
                {found.order.state === "collected" ? (
                  <div className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">Already collected. An order is handed over once.</div>
                ) : found.order.kitchenState !== "ready" ? (
                  <div className="rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
                    Not ready yet — kitchen status: <b>{found.order.kitchenState.replace("_", " ")}</b>
                    {found.order.state !== "confirmed" && <> · order status: <b>{found.order.state.replaceAll("_", " ")}</b></>}
                  </div>
                ) : (
                  <>
                    <label className="flex items-center gap-2 rounded-lg bg-warning-bg p-3 text-base text-warning">
                      <input className="h-5.5 w-5.5" type="checkbox" checked={nameOk} onChange={(e) => setNameOk(e.target.checked)} />
                      I asked the customer&apos;s name and it matches <b>{found.customer.name}</b>
                    </label>
                    <button className="staff-btn-primary" disabled={!nameOk || pending} onClick={handOver}>Hand over order</button>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="staff-card">
            <h2 className={cardTitle}>Awaiting acceptance <span className="o-kds-count o-kds-count-tocook">{data?.awaiting.length ?? 0}</span></h2>
            <p className="o-hint -mt-1.5 mb-3">Employee pay-at-counter orders. They reach the kitchen only after you accept and take payment.</p>
            <div className="flex flex-col gap-2">
              {data?.awaiting.length === 0 && <div className="o-hint">Nothing waiting.</div>}
              {data?.awaiting.map((r) => (
                <div key={r.id} className={qItem}>
                  <span className="min-w-16 text-2xl font-bold">{r.order.tracking}</span>
                  <div>
                    <b>{r.customer.name}</b>
                    <small>{r.slot.label} {time12(r.slot.startsAt)}{r.order.pickupDate !== data.now.date ? ` · ${r.order.pickupDate}` : ""} · {money(r.order.total)} · {r.customer.employeeId}</small>
                    <small>{r.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</small>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button className="staff-btn-primary" disabled={pending} onClick={() => accept(r, "cash")}>Cash</button>
                    <button className="staff-btn" disabled={pending} onClick={() => accept(r, "card_terminal")}>Card</button>
                    <button className="staff-btn text-danger" disabled={pending} onClick={() => { setRejecting(r); setReason(""); }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="staff-card">
            <h2 className={cardTitle}>Ready for pickup <span className="o-kds-count o-kds-count-done">{data?.ready.length ?? 0}</span></h2>
            <div className="flex flex-col gap-2">
              {data?.ready.length === 0 && <div className="o-hint">No orders waiting on the shelf.</div>}
              {data?.ready.map((r) => (
                <button key={r.id} className={`${qItem} text-left`} onClick={() => lookup(r.order.tracking)}>
                  <span className="min-w-16 text-2xl font-bold">{r.order.tracking}</span>
                  <div><b>{r.customer.name}</b><small>{r.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</small></div>
                  <span className="o-hint">Open ›</span>
                </button>
              ))}
            </div>
          </section>

          <section className="staff-card">
            <h2 className={cardTitle}>Collected today</h2>
            <div className="flex flex-col gap-2">
              {data?.collected.length === 0 && <div className="o-hint">None yet.</div>}
              {data?.collected.map((r) => (
                <div key={r.id} className={`${qItem} opacity-75`}>
                  <span className="min-w-16 text-2xl font-bold">{r.order.tracking}</span>
                  <div><b>{r.customer.name}</b><small>by {r.order.collectedBy === "qr" ? "QR" : "order number"} · {r.order.collectedAt ? new Date(r.order.collectedAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" }) : ""}</small></div>
                  <StateBadge tone="done">Collected</StateBadge>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {rejecting && (
        <div className="o-modal-backdrop" role="dialog" aria-modal="true" aria-label="Reject order">
          <div className="o-modal max-w-120">
            <div className="o-modal-head"><div className="o-modal-title">Reject order {rejecting.order.tracking}</div></div>
            <div className="o-modal-body">
              <label className="o-hint" htmlFor="creason">Reason shown to the customer (required)</label>
              <input id="creason" className="o-input" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </div>
            <div className="o-modal-foot">
              <button className="o-btn o-btn-primary" disabled={pending} onClick={() => start(async () => {
                const r = await rejectAction(rejecting.order.id, reason, "counter");
                if (handle(r, "Order rejected; customer notified")) setRejecting(null);
                await refresh();
              })}>Reject order</button>
              <button className="o-btn o-btn-link" onClick={() => setRejecting(null)}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
