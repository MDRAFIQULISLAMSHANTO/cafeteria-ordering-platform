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
          <div className="mt-1 border-t border-line px-2.5 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wider text-muted">
            Staff screens{staffUnlocked ? "" : " · presenter key"}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {STAFF_SCREENS.map((s) => {
              const on = s.id === staffScreen;
              return (
                <button key={s.id} role="menuitemradio" aria-checked={on} disabled={pending} className={`${item} items-center ${on ? "bg-surface-2" : ""}`} onClick={() => (on ? close() : pickStaff(s.id))}>
                  <span aria-hidden className={`h-2 w-2 flex-none rounded-full ${on ? "bg-sts-orange" : "bg-line-strong"}`} />
                  <b className="text-13">{s.actor}</b>
                </button>
              );
            })}
          </div>

          {askKey && (
            <form onSubmit={(e) => { e.preventDefault(); unlock(); }} className="mt-1.5 rounded-lg bg-surface-2 p-2.5">
              <label htmlFor="presenter-key" className="block text-xs font-semibold">Presenter key</label>
              <p className="mb-2 mt-0.5 text-2xs text-muted">Staff screens show customer names and the SMS inbox, so they need the key once on this browser.</p>
              <div className="flex gap-1.5">
                <input id="presenter-key" autoFocus type="password" className="o-input min-w-0 flex-1" value={key} onChange={(e) => setKey(e.target.value)} />
                <button className="o-btn o-btn-primary" disabled={pending || !key}>Unlock</button>
              </div>
            </form>
          )}
          {error && <p role="alert" className="mx-1 mt-1.5 rounded-md bg-danger-bg px-2.5 py-1.5 text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
