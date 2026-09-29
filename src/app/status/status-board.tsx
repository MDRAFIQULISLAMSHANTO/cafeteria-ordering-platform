"use client";

import { useEffect } from "react";
import { useLive } from "@/components/live";

type Board = { outlet: { name: string }; now: { ms: number }; preparing: string[]; ready: string[] };

const num = "min-w-[2.6em] text-[clamp(2.5rem,6vw,5rem)] font-bold tabular-nums";

// Pickup-area TV: order numbers only, never names.
export function StatusBoard({ outletId }: { outletId: string }) {
  const { data } = useLive<Board>(`/api/live/status?outlet=${outletId}`, 2000);
  useEffect(() => { document.documentElement.dataset.theme = "dark"; }, []);
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] bg-pos-bg text-pos-ink">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-pos-bar px-4 py-3 sm:px-6 sm:py-4">
        <b className="text-xl sm:text-2xl">{data?.outlet.name ?? "…"}</b>
        <span className="text-xl tabular-nums text-pos-ink-dim sm:text-2xl">
          {data ? new Date(data.now.ms).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" }) : ""}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr]">
        <section className="p-4 sm:p-6">
          <h2 className="mb-5 text-2xl uppercase tracking-wider text-pos-ink-dim sm:text-3xl">Preparing</h2>
          <div className="flex flex-wrap gap-4">{data?.preparing.map((n) => <span key={n} className={num}>{n}</span>)}</div>
        </section>
        <section className="border-t border-pos-line p-4 sm:p-6 md:border-l md:border-t-0">
          <h2 className="mb-5 text-2xl uppercase tracking-wider text-pos-ok sm:text-3xl">Ready — please collect</h2>
          <div className="flex flex-wrap gap-4">{data?.ready.map((n) => <span key={n} className={`${num} text-pos-ok`}>{n}</span>)}</div>
        </section>
      </div>
    </div>
  );
}
