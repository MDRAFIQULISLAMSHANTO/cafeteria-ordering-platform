"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { bumpAction, recallAction, rejectAction } from "@/app/actions";
import { ActorSwitcher } from "@/components/demo/actor-switcher";
import { useLive } from "@/components/live";
import { Clock, OutletSelect, ThemeToggle, type OutletOpt } from "@/components/staff";
import { useResult } from "@/components/toast";
import { ACCOUNT_LABEL, type AccountType } from "@/lib/rules";
import { time12 } from "@/lib/time";

type Ticket = {
  id: string;
  minutes: number;
  late: boolean;
  order: { id: string; tracking: string; kitchenState: string; accountType: string; paymentMode: string; channel: string; eventName: string | null; deliverTo: string | null };
  customer: { name: string; classGrade: string | null; section: string | null };
  slot: { label: string; startsAt: string };
  lines: { id: string; name: string; qty: number; state: string }[];
};
type Board = { outlet: { name: string }; now: { ms: number }; tickets: Ticket[] };

const TABS = [
  { id: "all", label: "All" },
  { id: "to_cook", label: "To cook", count: "o-kds-count-tocook" },
  { id: "preparing", label: "Preparing", count: "o-kds-count-ready" },
  { id: "ready", label: "Ready", count: "o-kds-count-done" },
  { id: "completed", label: "Completed" },
] as const;

const STATE_LABEL: Record<string, [string, string]> = {
  to_cook: ["To cook", "o-kds-state-tocook"],
  preparing: ["Preparing", "o-kds-state-preparing"],
  ready: ["Ready", "o-kds-state-done"],
  completed: ["Collected", "o-kds-state-done"],
};

const REASONS = ["Item out of stock", "Kitchen closing early", "Duplicate order", "Customer request"];

export function KitchenDisplay({ outletId, outlets, personaId }: { outletId: string; outlets: OutletOpt[]; personaId: string | null }) {
  const { data, refresh } = useLive<Board>(`/api/live/kitchen?outlet=${outletId}`, 2000);
  const handle = useResult();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [rejecting, setRejecting] = useState<Ticket | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const tickets = data?.tickets ?? [];
  const shown = tickets.filter((t) => (tab === "all" ? t.order.kitchenState !== "completed" : t.order.kitchenState === tab));
  const count = (s: string) => tickets.filter((t) => t.order.kitchenState === s).length;

  const act = (fn: () => Promise<{ ok: boolean; error?: string; rule?: string }>) =>
    start(async () => {
      handle((await fn()) as Parameters<typeof handle>[0]);
      await refresh();
    });

  return (
    <div className="o-kds">
      <header className="o-kds-bar">
        <div className="o-kds-bar-left">
          <Link className="o-kds-iconbtn" href="/demo" title="Demo hub">☰</Link>
          <ThemeToggle />
          <OutletSelect outlets={outlets} value={outletId} path="/kds" />
        </div>
        <nav className="o-kds-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`o-kds-tab${tab === t.id ? " o-active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label} {"count" in t && <span className={`o-kds-count ${t.count}`}>{count(t.id)}</span>}
            </button>
          ))}
        </nav>
        <div className="o-kds-bar-right">
          <ActorSwitcher tone="staff" staffScreen="kds" personaId={personaId} outletId={outletId} staffUnlocked />
          <Clock ms={data?.now.ms} />
          <button className="o-kds-close" disabled={pending} onClick={() => act(() => recallAction(outletId))}>↶ Recall</button>
        </div>
      </header>

      <main className="o-kds-grid">
        {!data && <div className="col-span-full p-8 text-center text-lg text-muted">Loading kitchen…</div>}
        {data && shown.length === 0 && <div className="col-span-full p-8 text-center text-lg text-muted">No tickets {tab === "all" ? "in the queue" : `in ${TABS.find((t) => t.id === tab)!.label}`}. Paid orders for today appear here within seconds.</div>}
        {shown.map((t) => {
          const [label, cls] = STATE_LABEL[t.order.kitchenState] ?? ["", ""];
          const canBump = t.order.kitchenState === "to_cook" || t.order.kitchenState === "preparing";
          return (
            <article
              key={t.id}
              className={`o-kds-ticket${t.late ? " o-late" : ""}`}
              onClick={() => canBump && !pending && act(() => bumpAction(t.order.id))}
              title={canBump ? "Tap to move to the next stage" : undefined}
            >
              <div className="o-kds-ticket-head">
                {t.order.tracking} — {t.customer.name}
                <span className="o-kds-guests">{t.customer.classGrade ? `${t.customer.classGrade}${t.customer.section}` : ""}</span>
              </div>
              <div className="o-kds-ticket-meta">
                {tab === "all" && <span className={`o-kds-state ${cls}`}>{label}</span>}
                <span className={`o-kds-preset o-kds-acct-${t.order.accountType}`}>{ACCOUNT_LABEL[t.order.accountType as AccountType]}</span>
                <span className={`o-kds-timer${t.late ? " o-late" : ""}`}>◷ {t.minutes}`</span>
              </div>
              {t.order.channel === "bulk" ? (
                <div className="mx-3 mt-2 rounded-md bg-info-bg px-2 py-1.5 text-xs text-info">
                  <b>BULK · deliver {time12(t.slot.startsAt)}</b> to {t.order.deliverTo}
                  {t.order.eventName && <span className="block opacity-80">{t.order.eventName}</span>}
                </div>
              ) : (
                <div className="px-3 pt-2 text-xs text-muted">{t.slot.label} · {time12(t.slot.startsAt)}{t.order.paymentMode === "counter" ? " · paid at counter" : ""}</div>
              )}
              <div className="o-kds-lines">
                {t.lines.map((l) => (
                  <div key={l.id} className={`o-kds-line${l.state === "refunded" ? " line-through opacity-50" : ""}`}>
                    <span className="o-kds-qty">{l.qty}x</span>
                    <span>
                      {l.name}
                      {l.state === "waiting" && <small className="ml-1.5 rounded bg-warning-bg px-1.5 text-2xs font-semibold text-warning">HOLD · customer choosing</small>}
                      {l.state === "substituted" && <small className="ml-1.5 rounded bg-info-bg px-1.5 text-2xs font-semibold text-info">SUBSTITUTE</small>}
                      {l.state === "refunded" && <small className="ml-1.5 text-2xs font-semibold">refunded — don&apos;t make</small>}
                    </span>
                  </div>
                ))}
              </div>
              {t.order.kitchenState === "ready" && <div className="px-3 pb-3 text-xs text-muted">{t.order.channel === "bulk" ? "Waiting for delivery" : "Waiting for collection at the counter"}</div>}
              {canBump && (
                <div className="flex gap-1.5 px-3 pb-3 *:flex-1" onClick={(e) => e.stopPropagation()}>
                  <button className="o-kds-btn o-strong" disabled={pending} onClick={() => act(() => bumpAction(t.order.id))}>
                    {t.order.kitchenState === "to_cook" ? "Start ▸" : "Ready ✓"}
                  </button>
                  {t.order.kitchenState === "to_cook" && (
                    <button className="o-kds-btn" disabled={pending} onClick={() => { setRejecting(t); setReason(""); }}>Reject</button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </main>

      {rejecting && (
        <div className="o-modal-backdrop" role="dialog" aria-modal="true" aria-label="Reject order">
          <div className="o-modal max-w-120">
            <div className="o-modal-head"><div className="o-modal-title">Reject order {rejecting.order.tracking}</div></div>
            <div className="o-modal-body">
              <p className="o-hint mb-2">The customer sees this reason. A paid order is refunded automatically (sandbox).</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {REASONS.map((r) => <button key={r} className="o-btn o-btn-sm" onClick={() => setReason(r)}>{r}</button>)}
              </div>
              <label className="o-hint" htmlFor="reason">Reason (required)</label>
              <input id="reason" className="o-input" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </div>
            <div className="o-modal-foot">
              <button
                className="o-btn o-btn-primary"
                disabled={pending}
                onClick={() => act(async () => {
                  const r = await rejectAction(rejecting.order.id, reason, "kitchen");
                  if (r.ok) setRejecting(null);
                  return r;
                })}
              >
                Reject order
              </button>
              <button className="o-btn o-btn-link" onClick={() => setRejecting(null)}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
