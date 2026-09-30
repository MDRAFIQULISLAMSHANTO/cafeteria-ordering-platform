"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import type { FoodLook } from "@/lib/food-kind";
import { isCutout } from "@/lib/food-photos";
import { money } from "@/lib/rules";
import { FoodArt } from "./food-art";

export type CardItem = { id: string; name: string; price: number | null; description?: string | null; look: FoodLook; unit?: string; photos?: string[] | null };

/**
 * One menu item: photo (or the drawn plate until the outlet adds one), name,
 * price and a round add button that turns into a tick. Used on the landing
 * page and the /order menu.
 */
export function MenuCard({ item, onAdd, onOpen, disabled, badges, note, compact }: {
  item: CardItem;
  onAdd?: () => void;
  onOpen?: () => void;
  disabled?: boolean;
  badges?: ReactNode;
  note?: ReactNode;
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const [added, setAdded] = useState(0);
  const add = () => {
    onAdd?.();
    setAdded((n) => n + 1);
    setTimeout(() => setAdded((n) => Math.max(0, n - 1)), 1100);
  };
  const photos = item.photos?.slice(0, 2) ?? [];
  // names wrap to at most two lines and always take two, so every card is the same height
  const title = "line-clamp-2 text-sm font-bold leading-snug text-sts-ink md:text-[15px]";
  const Art = (
    <div className="relative grid aspect-[5/4] place-items-center overflow-hidden rounded-t-[1.35rem] bg-[radial-gradient(circle_at_50%_60%,var(--sts-orange-soft)_0%,var(--sts-cream-2)_70%)]">
      {photos.length === 1 && isCutout(photos[0]) ? (
        <motion.div whileHover={reduce ? undefined : { rotate: -4, scale: 1.05 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="absolute inset-[7%]">
          <Image src={photos[0]} alt={item.name} fill sizes="(max-width: 640px) 45vw, (max-width: 1100px) 30vw, 300px" className="object-contain drop-shadow-[0_12px_12px_var(--sts-drop)]" />
        </motion.div>
      ) : photos.length ? (
        <div className={`absolute inset-0 grid bg-sts-white ${photos.length > 1 ? "grid-cols-2 gap-px" : ""}`}>
          {photos.map((src) => (
            <div key={src} className="relative overflow-hidden">
              <Image src={src} alt={photos.length > 1 ? `${item.name} — photo ${photos.indexOf(src) + 1}` : item.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 320px" className="object-cover object-center transition-transform duration-500 motion-safe:group-hover:scale-[1.025]" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div whileHover={reduce ? undefined : { rotate: -8, scale: 1.05 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="w-[72%]">
          <FoodArt kind={item.look.kind} tint={item.look.tint} steam={false} className="w-full drop-shadow-[0_12px_12px_var(--sts-drop)]" />
        </motion.div>
      )}
      {badges && <div className="absolute inset-x-2.5 top-2.5 flex flex-wrap gap-1 text-2xs">{badges}</div>}
    </div>
  );
  return (
    <motion.article
      layout={!reduce}
      whileHover={reduce || disabled ? undefined : { y: -4 }}
      className={`group flex h-full flex-col overflow-hidden rounded-[1.4rem] bg-sts-white text-left shadow-[0_0_0_1px_var(--sts-hairline)] transition-shadow hover:shadow-sts-card ${disabled ? "opacity-60" : ""}`}
    >
      {onOpen ? <button type="button" onClick={onOpen} aria-label={`Details for ${item.name}`} className="block w-full">{Art}</button> : Art}
      <div className={`flex flex-1 flex-col gap-1 ${compact ? "px-3 pb-2.5 pt-2.5" : "px-4 pb-3 pt-3"}`}>
        {onOpen ? (
          <button type="button" onClick={onOpen} className="p-0 text-left"><h3 className={title} title={item.name}>{item.name}</h3></button>
        ) : (
          <h3 className={title} title={item.name}>{item.name}</h3>
        )}
        {/* every item has a short line (see lib/card-lines), so cards line up without blank space */}
        {item.description && <p className={`text-xs leading-snug text-muted ${compact ? "line-clamp-1" : "line-clamp-2"}`}>{item.description}</p>}
        {note}
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="font-display text-lg font-bold tabular-nums text-sts-purple">
            {item.price != null ? money(item.price) : "—"}
            {item.unit && item.unit !== "each" && <small className="font-sans text-xs font-normal text-muted"> / {item.unit}</small>}
          </span>
          {onAdd && (
            <motion.button
              type="button"
              aria-label={`Add ${item.name}`}
              disabled={disabled}
              onClick={add}
              whileTap={reduce ? undefined : { scale: 0.86 }}
              className="grid h-10 w-10 place-items-center rounded-full bg-sts-orange text-sts-ink shadow-[var(--sts-action-shadow)] transition-colors hover:bg-sts-orange-deep disabled:cursor-default disabled:bg-sts-ornament disabled:shadow-none"
            >
              <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                {added ? <motion.path initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} d="M5 10.5l3.2 3.2L15 7" /> : <path d="M10 4.5v11M4.5 10h11" />}
              </svg>
            </motion.button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
