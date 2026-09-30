import type { Stage } from "@/lib/order-stages";

// Order tracker: a vertical timeline on phones, a horizontal one on wider
// screens. Done stages show a tick and their time; the active one (where the
// order is now) is orange and pulses, with a line saying what is happening.
export function OrderStages({ stages }: { stages: Stage[] }) {
  const active = stages.find((s) => s.status === "active");
  return (
    <div className="w-full text-left">
      <ol aria-label="Order stages" className="relative flex flex-col gap-0 sm:grid sm:gap-2" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map((s, i) => {
          const last = i === stages.length - 1;
          const dot =
            s.status === "done" ? "bg-sts-purple text-sts-white" :
            s.status === "active" ? "bg-sts-orange text-sts-ink ring-4 ring-sts-orange-soft" :
            "bg-surface-3 text-faint";
          const line = s.status === "done" ? "bg-sts-purple" : s.status === "active" ? "bg-linear-to-b from-sts-orange to-surface-3 sm:bg-linear-to-r" : "bg-surface-3";
          return (
            <li key={s.key} aria-current={s.status === "active" ? "step" : undefined} className="relative flex gap-3 pb-4 sm:flex-col sm:items-center sm:gap-1.5 sm:pb-0 sm:text-center">
              {!last && <span aria-hidden className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 sm:left-[calc(50%+18px)] sm:top-[15px] sm:h-0.5 sm:w-[calc(100%-36px+0.5rem)] ${line}`} />}
              <span className={`relative z-10 grid h-8 w-8 flex-none place-items-center rounded-full text-sm font-bold ${dot}`}>
                {s.status === "done" ? (
                  <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
                ) : (
                  i + 1
                )}
                {s.status === "active" && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-sts-orange/40 motion-safe-only [animation-duration:2s]" />}
              </span>
              <span className="min-w-0 pt-1 sm:pt-0">
                <b className={`block text-sm leading-tight ${s.status === "todo" ? "text-faint" : "text-ink"}`}>{s.label}</b>
                {s.at && <small className="block text-2xs tabular-nums text-muted">{s.at}</small>}
                {s.note && <small className="mt-0.5 block text-2xs font-semibold text-sts-orange-text sm:hidden">{s.note}</small>}
              </span>
            </li>
          );
        })}
      </ol>
      {active?.note && (
        <p className="mt-3 hidden rounded-xl bg-sts-orange-soft/60 px-3 py-2 text-center text-sm font-semibold text-sts-orange-text sm:block">
          Now: {active.note}
        </p>
      )}
    </div>
  );
}
