"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { payAction } from "@/app/actions";
import { CenterCard, FormError, SandboxNote } from "@/components/ui";
import { money } from "@/lib/rules";

// A sandbox stand-in for the local payment gateway (SSLCommerz / bKash /
// Nagad — to be selected by STS). No money moves; the presenter can choose
// success or failure to show both paths.
const METHODS = [
  { id: "bkash", label: "bKash", hint: "Mobile wallet", mark: "bK" },
  { id: "nagad", label: "Nagad", hint: "Mobile wallet", mark: "N" },
  { id: "card", label: "Card", hint: "Visa · Mastercard · Amex", mark: "▭" },
] as const;

export function PayForm({ orderId, total, tracking, ref_, failedBefore }: { orderId: string; total: number; tracking: string; ref_: string; failedBefore: boolean }) {
  const router = useRouter();
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("bkash");
  const [error, setError] = useState<string | null>(failedBefore ? "The last payment attempt failed. You can try again." : null);
  const [pending, start] = useTransition();

  const pay = (outcome: "success" | "fail") =>
    start(async () => {
      const r = await payAction(orderId, method, outcome);
      if (!r.ok) return setError(r.error);
      const res = r.data as { ok: boolean };
      if (!res.ok) return setError("Payment failed (sandbox). Nothing was charged. Try again or choose another method.");
      router.push(`/orders/${orderId}?paid=1`);
      router.refresh();
    });

  return (
    <CenterCard wide>
      <div className="mb-4 flex items-center justify-between">
        <span className="kicker">Secure checkout</span>
        <span className="pill-sandbox">SANDBOX · no money moves</span>
      </div>
      <div className="text-muted">Order {tracking} · {ref_}</div>
      <div className="mb-4 mt-1 text-4xl font-bold tabular-nums text-so-price">{money(total)}</div>
      {error && <FormError msg={error} />}
      <div className="mb-4 grid gap-2" role="radiogroup" aria-label="Payment method">
        {METHODS.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={method === m.id}
            onClick={() => setMethod(m.id)}
            className={`flex items-center gap-3 rounded-so border p-3 text-left ${method === m.id ? "border-primary bg-so-bg" : "border-line"}`}
          >
            <i aria-hidden className="grid h-10 w-10 place-items-center rounded-xl bg-surface-3 font-bold not-italic">{m.mark}</i>
            <span><b className="block">{m.label}</b><small className="text-muted">{m.hint}</small></span>
          </button>
        ))}
      </div>
      <button className="o-so-btn o-so-btn-primary w-full" disabled={pending} onClick={() => pay("success")}>
        {pending ? "Processing…" : `Pay ${money(total)}`}
      </button>
      <div className="mt-3 flex justify-between text-xs">
        <Link href={`/orders/${orderId}`}>Pay later</Link>
        <button className="font-semibold text-so-price" disabled={pending} onClick={() => pay("fail")}>Simulate a failed payment</button>
      </div>
      <SandboxNote>Gateway not yet selected by STS. In production this page is the gateway&apos;s own hosted checkout.</SandboxNote>
    </CenterCard>
  );
}
