"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cancelOrderAction } from "@/app/actions";
import { useLive } from "@/components/live";
import { useResult } from "@/components/toast";

/** Re-renders the tracking page when the kitchen or counter changes the order. */
export function LiveRefresh({ orderId, signature }: { orderId: string; signature: string }) {
  const router = useRouter();
  const { data } = useLive<{ state: string; kitchenState: string }>(`/api/live/order/${orderId}`, 2500);
  useEffect(() => {
    if (data && `${data.state}|${data.kitchenState}` !== signature) router.refresh();
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
