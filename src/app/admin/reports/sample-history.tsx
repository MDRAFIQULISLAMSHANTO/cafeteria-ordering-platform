"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { clearSampleHistoryAction, loadSampleHistoryAction } from "@/app/actions";
import { useResult } from "@/components/toast";

/** Demo only: load or remove two months of sample sales (orders "SIM/…"). */
export function SampleHistoryButton({ mode, className = "o-btn o-btn-primary" }: { mode: "load" | "clear"; className?: string }) {
  const router = useRouter();
  const handle = useResult();
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const r = mode === "load" ? await loadSampleHistoryAction() : await clearSampleHistoryAction();
      if (handle(r, mode === "load" && r.ok ? `Loaded ${(r.data as { orders: number }).orders.toLocaleString("en-IN")} sample orders` : "Sample history removed")) router.refresh();
    });
  return (
    <button type="button" className={className} onClick={run} disabled={pending} aria-busy={pending}>
      {pending ? (mode === "load" ? "Loading sample sales…" : "Removing…") : mode === "load" ? "Load 2 months of sample sales" : "Remove sample history"}
    </button>
  );
}
