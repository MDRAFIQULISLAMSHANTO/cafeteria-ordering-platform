// Balanced Tray — pure game rules (no React, no DOM), so they are easy to test.
// A tray has four compartments; the player fills each from three real menu
// items and tries to stay within a budget that is always achievable.

import type { FoodLook } from "@/lib/food-kind";

export type Group = "main" | "side" | "drink" | "treat";
export const GROUPS: { id: Group; label: string; hint: string }[] = [
  { id: "main", label: "Main", hint: "Something filling" },
  { id: "side", label: "Side", hint: "Something on the side" },
  { id: "drink", label: "Drink", hint: "Something to sip" },
  { id: "treat", label: "Treat", hint: "Something sweet" },
];

// photo: a real photo of the dish; cutout: S Cafe's own transparent photo, when there is one
export type GameItem = { id: string; name: string; price: number; look: FoodLook; group: Group; cutout?: string | null; photo?: string | null };
export type Hand = Record<Group, GameItem[]>;
export type Tray = Partial<Record<Group, GameItem>>;

/** Small seeded PRNG so the first deal is identical on server and browser. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export const BUDGET = 50000; // ৳500 in poisha: fixed, so there is always a target to beat

/** The cheapest full tray this pool allows (one per compartment that has items). */
function cheapestTray(pool: GameItem[]) {
  return GROUPS.reduce((a, g) => {
    const prices = pool.filter((p) => p.group === g.id).map((p) => p.price);
    return a + (prices.length ? Math.min(...prices) : 0);
  }, 0);
}

/**
 * ৳500 when that leaves real choice; otherwise ৳50 above the cheapest full
 * tray, rounded up to ৳100, so there is more than one winning tray.
 */
export function budgetFor(pool: GameItem[]) {
  const floor = cheapestTray(pool);
  return floor + 5000 <= BUDGET ? BUDGET : Math.ceil((floor + 5000) / 10000) * 10000;
}

/**
 * Three distinct items per compartment (fewer if the menu has fewer), with
 * dishes that have S Cafe / 3D images first. One winning tray is always in
 * the hand: a random tray within the budget is picked first, then the rest
 * of each compartment is filled at random.
 */
export function deal(pool: GameItem[], seed: number, budget: number): Hand {
  const r = rng(seed);
  const rank = (x: GameItem) => (x.cutout ? 2 : x.photo ? 1 : 0);
  const shuffled = (g: Group) => {
    const items = pool.filter((p) => p.group === g);
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items.sort((a, b) => rank(b) - rank(a)); // stable: shuffle kept within each rank
  };
  const lists = Object.fromEntries(GROUPS.map((g) => [g.id, shuffled(g.id)])) as Record<Group, GameItem[]>;
  const cheapest = (g: Group) => (lists[g].length ? Math.min(...lists[g].map((p) => p.price)) : 0);

  // the winning tray: per compartment, a random item that still leaves room for the cheapest of the rest
  const win: Partial<Record<Group, GameItem>> = {};
  let left = budget;
  GROUPS.forEach((g, i) => {
    if (!lists[g.id].length) return;
    const reserve = GROUPS.slice(i + 1).reduce((a, x) => a + cheapest(x.id), 0);
    const fits = lists[g.id].filter((p) => p.price <= left - reserve);
    const pick = fits[0] ?? lists[g.id].reduce((a, b) => (b.price < a.price ? b : a));
    win[g.id] = pick;
    left -= pick.price;
  });

  const hand = {} as Hand;
  for (const g of GROUPS) {
    const w = win[g.id];
    const rest = lists[g.id].filter((p) => p !== w).slice(0, w ? 2 : 3);
    const three = w ? [w, ...rest] : rest;
    // the winning item takes a random place, so it is not always the first card
    for (let i = three.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [three[i], three[j]] = [three[j], three[i]];
    }
    hand[g.id] = three;
  }
  return hand;
}

export const total = (tray: Tray) => GROUPS.reduce((a, g) => a + (tray[g.id]?.price ?? 0), 0);
export const filled = (tray: Tray, hand: Hand) => GROUPS.filter((g) => hand[g.id].length > 0).every((g) => tray[g.id]);

export type Star = { label: string; earned: boolean };

export function stars(tray: Tray, hand: Hand, budget: number, challenge: boolean, beatBell: boolean): Star[] {
  const out: Star[] = [
    { label: "A full tray — one from each compartment", earned: filled(tray, hand) },
    { label: "Within the budget", earned: filled(tray, hand) && total(tray) <= budget },
  ];
  if (challenge) out.push({ label: "Done before the bell", earned: filled(tray, hand) && beatBell });
  return out;
}
