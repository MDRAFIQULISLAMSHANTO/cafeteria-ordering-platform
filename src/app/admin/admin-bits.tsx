"use client";

import { useRouter } from "next/navigation";
import { Fragment, useTransition } from "react";
import { toggleAvailabilityAction } from "@/app/actions";
import { useResult } from "@/components/toast";
import { money } from "@/lib/rules";

export function AdminOutletSelect({ outlets, value }: { outlets: { id: string; name: string }[]; value: string }) {
  const router = useRouter();
  return (
    <select className="o-select w-60" value={value} aria-label="Outlet" onChange={(e) => router.push(`/admin?outlet=${e.target.value}`)}>
      {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

type Item = { id: string; name: string; category: string; price: number | null; available: boolean; reason: string | null };

export function AvailabilityList({ outletId, items }: { outletId: string; items: Item[] }) {
  const router = useRouter();
  const handle = useResult();
  const [pending, start] = useTransition();
  const toggle = (it: Item) =>
    start(async () => {
      if (handle(await toggleAvailabilityAction(outletId, it.id), it.available ? `${it.name} marked sold out — hidden from customers` : `${it.name} back on the menu`)) router.refresh();
    });
  return (
    <table className="w-full">
      <thead><tr><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">Item</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold text-right">Price</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">Available</th></tr></thead>
      <tbody>
        {items.map((it, i) => {
          const header = i === 0 || items[i - 1].category !== it.category;
          return (
            <Fragment key={it.id}>
              {header && <tr><td colSpan={3} className="bg-surface-2 px-3 py-1.5 font-semibold">{it.category}</td></tr>}
              <tr>
                <td className="border-b border-line px-3 py-1.5">{it.name}{it.reason && !it.available && <span className="o-hint"> · {it.reason}</span>}</td>
                <td className="border-b border-line px-3 py-1.5 text-right tabular-nums">{it.price != null ? money(it.price) : "—"}</td>
                <td className="border-b border-line px-3 py-1.5">
                  <button
                    className={`relative h-5.5 w-9.5 rounded-full border transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-surface after:shadow-o-sm after:transition-[left] disabled:opacity-40 ${it.available ? "border-accent bg-accent after:left-4.5" : "border-line-strong bg-surface-3"}`}
                    role="switch"
                    aria-checked={it.available}
                    aria-label={`${it.name} available`}
                    disabled={pending || it.price == null}
                    onClick={() => toggle(it)}
                  />
                </td>
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
