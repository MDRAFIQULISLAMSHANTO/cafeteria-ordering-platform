import "server-only";
import { getDb } from "@/db/client";
import { foodLook, type FoodLook } from "./food-kind";
import { demoNow, firstOrderableDate, listOutlets, menuFor, slotsFor } from "./orders";
import { PENDING } from "./rules";
import { formatDay, time12 } from "./time";

// Everything the landing page shows comes from the same data the app uses:
// the visitor's outlet (or ISD Cafeteria as a labelled sample for guests),
// its real menu, the next open pickup slot and its real cut-off.

export type LandingItem = { id: string; name: string; section: string; price: number; description: string | null; look: FoodLook; special: boolean; photos: string[] | null };
export type TrayGroup = "main" | "side" | "drink" | "treat";

const SIDE_WORDS = ["fries", "wedges", "singara", "spring roll", "cheese ball", "salad", "soup"];

function trayGroup(item: LandingItem): TrayGroup | null {
  const n = item.name.toLowerCase();
  if (item.look.kind === "combo" || item.special) return null;
  if (item.look.kind === "hot" || item.look.kind === "cold") return "drink";
  if (["cake", "cookie", "waffle"].includes(item.look.kind)) return "treat";
  if (SIDE_WORDS.some((w) => n.includes(w))) return "side";
  return "main";
}

export async function landingData(outletId?: string) {
  const db = await getDb();
  const [outlets, now] = await Promise.all([listOutlets(db), demoNow(db)]);
  const outlet = outlets.find((o) => o.id === outletId) ?? outlets.find((o) => o.id === "ISD-CAF")!;
  const date = await firstOrderableDate(db, outlet.id, now);
  const [menu, slots] = await Promise.all([menuFor(db, outlet.id, date), slotsFor(db, outlet.id, date, now)]);

  const items: LandingItem[] = menu
    .filter((p) => p.available && p.price != null && p.unit === "each")
    .map((p) => ({ id: p.id, name: p.name, section: p.category, price: p.price!, description: p.description, look: foodLook(p.name, p.category), special: Boolean(p.weekday), photos: p.photos }));

  const sections = [...new Set(items.map((i) => i.section))].map((name) => ({ name, count: items.filter((i) => i.section === name).length, look: items.find((i) => i.section === name)!.look }));
  const next = slots.find((s) => s.open) ?? null;
  const special = items.find((i) => i.special) ?? null;
  const game = items
    .filter((i) => !(i.look.kind === "cold" && i.price > 200))
    .map((i) => ({ ...i, group: trayGroup(i) }))
    .filter((i): i is LandingItem & { group: TrayGroup } => i.group != null && !menu.find((m) => m.id === i.id)?.flags?.length);

  return {
    guest: !outletId,
    now: { ms: now.ms, date: now.date },
    outlet: { id: outlet.id, name: outlet.name, campus: outlet.campus, menuConfirmed: outlet.menuAssignmentConfirmed },
    day: formatDay(date, now.date),
    next: next ? { label: next.label, time: time12(next.startsAt), cutoffMs: next.cutoffMs, cutoffRule: next.cutoffRule, remaining: next.remaining } : null,
    items,
    sections,
    special,
    game,
    outlets: outlets.map((o) => ({ id: o.id, name: o.name, campus: o.campus, kind: o.kind, hours: `${time12(o.opensAt)} – ${time12(o.closesAt)}`, hoursConfirmed: o.hoursConfirmed })),
    pending: { slots: PENDING.slots, menu: PENDING.menu, gateway: PENDING.gateway },
  };
}

export type LandingData = Awaited<ReturnType<typeof landingData>>;
