// Landing "+" buttons and the Balanced Tray game hand items to the menu page
// through sessionStorage. The menu applies them once, keeping only items on
// the signed-in account's own outlet menu (it re-checks; the landing may have
// shown a guest sample outlet).

const KEY = "sts-tray-handoff";

export type Handoff = { items: { id: string; name: string; qty: number }[]; at: number };

export function handOff(items: { id: string; name: string }[]) {
  let cur: Handoff = { items: [], at: Date.now() };
  try { cur = JSON.parse(sessionStorage.getItem(KEY) ?? "") as Handoff; } catch {}
  const merged = [...(cur.items ?? [])];
  for (const it of items) {
    const hit = merged.find((m) => m.id === it.id);
    if (hit) hit.qty += 1;
    else merged.push({ id: it.id, name: it.name, qty: 1 });
  }
  try { sessionStorage.setItem(KEY, JSON.stringify({ items: merged, at: Date.now() })); } catch {}
  return merged.reduce((a, m) => a + m.qty, 0);
}

/** Read and clear the pending handoff (menu page, once). Stale after 2 hours. */
export function takeHandoff(): Handoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const h = JSON.parse(raw) as Handoff;
    return Date.now() - h.at < 2 * 3_600_000 && h.items?.length ? h : null;
  } catch {
    return null;
  }
}

export function pendingCount(): number {
  try { return (JSON.parse(sessionStorage.getItem(KEY) ?? "") as Handoff).items.reduce((a, m) => a + m.qty, 0); } catch { return 0; }
}
