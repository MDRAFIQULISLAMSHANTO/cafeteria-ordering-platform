"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { switchPersonaAction, unlockStaffAction } from "@/app/actions";
import { PERSONAS, STAFF_SCREENS, type PersonaId, type StaffScreenId } from "@/lib/demo-personas";

type Props = {
  /** The persona currently signed in (customer screens), if any. */
  personaId?: string | null;
  /** The staff screen currently shown (staff screens), if any. */
  staffScreen?: StaffScreenId;
  /** Outlet the staff screens should open for. */
  outletId: string;
  staffUnlocked: boolean;
  /** Visual variant: light header (customer) or staff bar. */
  tone?: "customer" | "staff";
  className?: string;
};

/**
 * "Demo as" — one small DEMO button that opens a menu of actors, so the
 * presenter switches without logging in again. Prototype affordance, not an
 * Odoo component: remove before anything is presented as production.
 */
function LockIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="10" height="7" rx="1.6" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

/** Small line icons for the four staff screens. */
function StaffIcon({ id }: { id: StaffScreenId }) {
  const common = { viewBox: "0 0 20 20", className: "h-4.5 w-4.5", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (id === "kds") return <svg {...common}><path d="M5 9a3 3 0 0 1 1-5.8A4 4 0 0 1 14 3.2 3 3 0 0 1 15 9v6H5z" /><path d="M5 12h10" /></svg>;
  if (id === "counter") return <svg {...common}><rect x="3" y="3" width="5" height="5" rx="1" /><rect x="12" y="3" width="5" height="5" rx="1" /><rect x="3" y="12" width="5" height="5" rx="1" /><path d="M12 12h2v2M17 12v5h-5v-2" /></svg>;
  if (id === "status") return <svg {...common}><rect x="2.5" y="3.5" width="15" height="10" rx="1.6" /><path d="M7 17h6M10 13.5V17" /></svg>;
  return <svg {...common}><path d="M3 17h14M5 14V9M10 14V5M15 14v-3" /></svg>;
}

export function ActorSwitcher({ personaId, staffScreen, outletId, staffUnlocked, tone = "customer", className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [askKey, setAskKey] = useState<StaffScreenId | null>(null);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const current = staffScreen ? STAFF_SCREENS.find((s) => s.id === staffScreen)?.actor : PERSONAS.find((p) => p.id === personaId)?.actor;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function close() {
    setOpen(false);
    setAskKey(null);
    setError(null);
    setKey("");
  }

  const openStaff = (id: StaffScreenId) => {
    const screen = STAFF_SCREENS.find((s) => s.id === id)!;
    close();
    router.push(`${screen.path}?outlet=${outletId}`);
  };

  const pickPersona = (id: PersonaId) =>
    start(async () => {
      setError(null);
      const r = await switchPersonaAction(id, staffScreen ? "/order" : pathname);
      if (!r.ok) return setError(r.error);
      close();
      router.push((r.data as { next: string }).next);
      router.refresh();
    });

  const pickStaff = (id: StaffScreenId) => {
    setError(null);
    if (staffUnlocked) openStaff(id);
    else setAskKey(id);
  };

  const unlock = () =>
    start(async () => {
      const r = await unlockStaffAction(key);
      if (!r.ok) return setError(r.error);
      const id = askKey!;
      router.refresh();
      openStaff(id);
    });

  const button =
    tone === "staff"
      ? "border-line bg-kds-bar text-ink"
      : "border-sts-orange/50 bg-sts-cream text-sts-purple";
  const item = "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-surface-3 disabled:opacity-50";
  const asking = STAFF_SCREENS.find((s) => s.id === askKey);

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Demo as ${current ?? "…"} — switch actor`}
        title={`Demo as ${current ?? "…"}`}
        onClick={() => (open ? close() : setOpen(true))}
        className={`inline-flex h-8 items-center gap-1 rounded-full border px-1 pr-1.5 text-xs font-semibold ${button}`}
      >
        <span className="rounded-full bg-sts-orange px-2 py-0.5 text-2xs font-bold tracking-wide text-sts-ink">DEMO</span>
        <svg aria-hidden viewBox="0 0 16 16" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && (
        <div role="menu" aria-label="Demo as" className="absolute right-0 top-full z-60 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-1.5 text-ink shadow-o-pop">
          <div className="px-2.5 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-wider text-muted">Demo as · customers</div>
          {PERSONAS.map((p) => {
            const on = !staffScreen && p.id === personaId;
            return (
              <button key={p.id} role="menuitemradio" aria-checked={on} disabled={pending} className={`${item} ${on ? "bg-surface-2" : ""}`} onClick={() => (on ? close() : pickPersona(p.id))}>
                <span aria-hidden className={`mt-1 h-2 w-2 flex-none rounded-full ${on ? "bg-sts-orange" : "bg-line-strong"}`} />
                <span className="min-w-0">
                  <b className="block text-13">{p.actor}</b>
                  <small className="block text-2xs leading-snug text-muted">{p.who}</small>
                </span>
              </button>
            );
          })}
          <div className="mt-1 flex items-center justify-between border-t border-line px-2.5 pb-1.5 pt-2 text-2xs font-semibold uppercase tracking-wider text-muted">
            Staff screens
            {!staffUnlocked && (
              <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                <LockIcon /> presenter key
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 px-1">
            {STAFF_SCREENS.map((s) => {
              const on = s.id === staffScreen;
              const picked = s.id === askKey;
              return (
                <button
                  key={s.id}
                  role="menuitemradio"
                  aria-checked={on}
                  disabled={pending}
                  onClick={() => (on ? close() : pickStaff(s.id))}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors disabled:opacity-50 ${on || picked ? "border-sts-orange bg-sts-orange-soft/60" : "border-line hover:border-sts-purple/30 hover:bg-surface-2"}`}
                >
                  <span aria-hidden className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${on || picked ? "bg-sts-orange text-sts-ink" : "bg-sts-purple-soft text-sts-purple"}`}>
                    <StaffIcon id={s.id} />
                  </span>
                  <b className="min-w-0 truncate text-13">{s.actor}</b>
                </button>
              );
            })}
          </div>

          {asking && (
            <form onSubmit={(e) => { e.preventDefault(); unlock(); }} className="mx-1 mt-2 rounded-xl border border-sts-orange/40 bg-sts-cream-2 p-3">
              <label htmlFor="presenter-key" className="flex items-center gap-1.5 text-13 font-bold text-sts-purple">
                <LockIcon /> Unlock {asking.actor}
              </label>
              <p className="mb-2.5 mt-1 text-2xs leading-snug text-muted">
                Staff screens show customer names and the SMS inbox, so they need the presenter key once on this browser.
              </p>
              <div className="flex gap-1.5">
                <input
                  id="presenter-key"
                  autoFocus
                  type="password"
                  autoComplete="off"
                  placeholder="Presenter key"
                  aria-invalid={Boolean(error)}
                  className={`h-10 min-w-0 flex-1 rounded-lg border bg-sts-white px-3 text-sm text-sts-ink focus:border-sts-purple focus:outline-none focus:ring-3 focus:ring-sts-purple/20 ${error ? "border-danger" : "border-line-strong"}`}
                  value={key}
                  onChange={(e) => { setKey(e.target.value); setError(null); }}
                />
                <button className="h-10 flex-none rounded-lg bg-sts-action px-4 text-sm font-bold text-sts-ink shadow-[var(--sts-action-shadow)] disabled:opacity-50 disabled:shadow-none" disabled={pending || !key}>
                  {pending ? "…" : "Unlock"}
                </button>
              </div>
              {error && <p role="alert" className="mt-2 text-xs font-semibold text-danger">{error}</p>}
            </form>
          )}
          {error && !asking && <p role="alert" className="mx-1 mt-1.5 rounded-md bg-danger-bg px-2.5 py-1.5 text-xs text-danger">{error}</p>}
          <a href="/guide" target="_blank" className="mx-1 mt-2 flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-sts-purple hover:bg-surface-2 hover:no-underline">
            Demo guide — flow and script <span aria-hidden>↗</span>
          </a>
        </div>
      )}
    </div>
  );
}
