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

export type GameItem = { id: string; name: string; price: number; look: FoodLook; group: Group };
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

/** Three distinct items per compartment (fewer if the menu has fewer). */
export function deal(pool: GameItem[], seed: number): Hand {
  const r = rng(seed);
  const hand = {} as Hand;
  for (const g of GROUPS) {
    const items = pool.filter((p) => p.group === g.id);
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    hand[g.id] = items.slice(0, 3);
  }
  return hand;
}

/** A budget between the cheapest possible tray and a typical one, in whole taka ×10. */
export function budgetFor(hand: Hand) {
  let cheapest = 0;
  let typical = 0;
  for (const g of GROUPS) {
    const prices = hand[g.id].map((i) => i.price).sort((a, b) => a - b);
    if (!prices.length) continue;
    cheapest += prices[0];
    typical += prices[Math.floor(prices.length / 2)];
  }
  const target = cheapest + (typical - cheapest) * 0.6;
  return Math.max(cheapest + 2000, Math.ceil(target / 1000) * 1000); // poisha; at least ৳20 of room
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
