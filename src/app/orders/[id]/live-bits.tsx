"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cancelOrderAction, resolveSubstitutionAction } from "@/app/actions";
import { useLive } from "@/components/live";
import { useResult } from "@/components/toast";
import { money } from "@/lib/rules";

type LiveOrder = { state: string; kitchenState: string; total: number; pending: number };

/** Re-renders the tracking page when the kitchen, counter or a substitution changes the order. */
export function LiveRefresh({ orderId, signature }: { orderId: string; signature: string }) {
  const router = useRouter();
  const { data } = useLive<LiveOrder>(`/api/live/order/${orderId}`, 2500);
  useEffect(() => {
    if (data && `${data.state}|${data.kitchenState}|${data.total}|${data.pending}` !== signature) router.refresh();
  }, [data, signature, router]);
  return null;
}

const btn = "o-so-btn inline-grid h-11.5 place-items-center border border-line text-base";

export function CancelButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const handle = useResult();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  if (!confirming) return <button className={btn} onClick={() => setConfirming(true)}>Cancel order</button>;
  return (
    <span className="flex items-center gap-2">
      <button className={btn} onClick={() => setConfirming(false)}>Keep it</button>
      <button
        className={`${btn} o-so-btn-primary`}
        disabled={pending}
        onClick={() => start(async () => { if (handle(await cancelOrderAction(orderId), "Order cancelled")) router.refresh(); })}
      >
        {pending ? "Cancelling…" : "Yes, cancel"}
      </button>
    </span>
  );
}

type Offer = { id: string; name: string; price: number };

/**
 * C8 §6: an ordered item sold out. The customer picks a substitute or a
 * refund; the countdown shows how long until it is refunded automatically.
 */
export function SubstitutionPrompt({ id, item, originalPrice, options, remainingMs }: { id: string; item: string; originalPrice: number; options: Offer[]; remainingMs: number }) {
  const router = useRouter();
  const handle = useResult();
  const [pending, start] = useTransition();
  const [deadline] = useState(() => Date.now() + remainingMs);
  const [left, setLeft] = useState(remainingMs);

  useEffect(() => {
    const t = setInterval(() => {
      const ms = deadline - Date.now();
      setLeft(ms);
      if (ms <= -1500) { clearInterval(t); router.refresh(); }
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, router]);

  const choose = (choice: string, label: string) =>
    start(async () => {
      if (handle(await resolveSubstitutionAction(id, choice), label)) router.refresh();
    });

  const secs = Math.max(0, Math.ceil(left / 1000));
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, "0");
  const urgent = secs <= 60;

  return (
    <div role="region" aria-label={`${item} sold out`} className="rounded-2xl border-2 border-warning/40 bg-warning-bg p-4 text-left">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <b className="block text-base text-ink">{item} has just sold out</b>
          <p className="text-sm text-muted">Pick a substitute or a refund. No answer and it&apos;s refunded automatically.</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${urgent ? "bg-danger text-primary-ink" : "bg-surface text-warning"}`} aria-live="polite" aria-label={`${mm} minutes ${ss} seconds left`}>
          ⏱ {mm}:{ss}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.id}
            disabled={pending || secs === 0}
            onClick={() => choose(o.id, `Swapped for ${o.name}`)}
            className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-left hover:border-so-price disabled:opacity-50"
          >
            <span className="min-w-0"><b className="block truncate text-sm">{o.name}</b><small className="text-muted">{o.price < originalPrice ? `${money(originalPrice - o.price)} cheaper — difference refunded` : "Same price"}</small></span>
            <span className="font-bold tabular-nums text-so-price">{money(o.price)}</span>
          </button>
        ))}
        <button
          disabled={pending || secs === 0}
          onClick={() => choose("refund", `${item} refunded`)}
          className="rounded-xl border border-dashed border-line-strong bg-surface px-3 py-2.5 text-left text-sm font-semibold hover:border-danger disabled:opacity-50"
        >
          Refund this item instead
        </button>
      </div>
      {options.length === 0 && <p className="mt-2 text-xs text-muted">Nothing similar is available right now, so a refund is the only option.</p>}
    </div>
  );
}
