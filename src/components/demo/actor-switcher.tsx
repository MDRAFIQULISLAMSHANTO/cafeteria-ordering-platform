"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
 * "Demo as" — switch actor without logging in again. Prototype affordance,
 * not an Odoo component: remove before anything is presented as production.
 */
export function ActorSwitcher({ personaId, staffScreen, outletId, staffUnlocked, tone = "customer", className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [askKey, setAskKey] = useState<StaffScreenId | null>(null);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const value = staffScreen ? `staff:${staffScreen}` : personaId ? `persona:${personaId}` : "";

  const openStaff = (id: StaffScreenId) => {
    const screen = STAFF_SCREENS.find((s) => s.id === id)!;
    router.push(`${screen.path}?outlet=${outletId}`);
  };

  const onChange = (next: string) => {
    setError(null);
    const [kind, id] = next.split(":");
    if (kind === "staff") {
      if (staffUnlocked) openStaff(id as StaffScreenId);
      else setAskKey(id as StaffScreenId);
      return;
    }
    start(async () => {
      const r = await switchPersonaAction(id as PersonaId, staffScreen ? "/order" : pathname);
      if (!r.ok) return setError(r.error);
      router.push((r.data as { next: string }).next);
      router.refresh();
    });
  };

  const unlock = () =>
    start(async () => {
      const r = await unlockStaffAction(key);
      if (!r.ok) return setError(r.error);
      const id = askKey!;
      setAskKey(null);
      setKey("");
      router.refresh();
      openStaff(id);
    });

  const box =
    tone === "staff"
      ? "border-line bg-kds-bar text-ink"
      : "border-sts-orange/40 bg-sts-cream text-sts-purple";

  return (
    <div className={`relative ${className}`}>
      <label className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold ${box}`}>
        <span className="rounded-full bg-sts-orange px-1.5 py-px text-2xs font-bold tracking-wide text-sts-ink">DEMO</span>
        <span className="hidden sm:inline">as</span>
        <select
          aria-label="Demo as — switch actor"
          className="min-w-0 flex-1 cursor-pointer truncate bg-transparent font-semibold outline-none md:max-w-64"
          value={value}
          disabled={pending}
          onChange={(e) => onChange(e.target.value)}
        >
          {!value && <option value="">Choose actor…</option>}
          <optgroup label="Customers">
            {PERSONAS.map((p) => (
              <option key={p.id} value={`persona:${p.id}`}>{p.actor}</option>
            ))}
          </optgroup>
          <optgroup label={staffUnlocked ? "Staff screens" : "Staff screens (presenter key)"}>
            {STAFF_SCREENS.map((s) => (
              <option key={s.id} value={`staff:${s.id}`}>{s.actor}</option>
            ))}
          </optgroup>
        </select>
      </label>

      {error && !askKey && (
        <div role="alert" className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md bg-danger-bg px-3 py-2 text-xs text-danger shadow-o-md">{error}</div>
      )}

      {askKey && (
        <form
          onSubmit={(e) => { e.preventDefault(); unlock(); }}
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-line bg-surface p-3 text-ink shadow-o-pop"
        >
          <b className="block text-sm">Presenter key</b>
          <p className="mb-2 mt-1 text-xs text-muted">Staff screens show customer names and the SMS inbox, so they need the presenter key once on this browser.</p>
          <input
            autoFocus
            type="password"
            className="o-input mb-2"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            aria-label="Presenter key"
          />
          {error && <p role="alert" className="mb-2 text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button className="o-btn o-btn-primary" disabled={pending || !key}>Unlock</button>
            <button type="button" className="o-btn o-btn-link" onClick={() => { setAskKey(null); setError(null); }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
