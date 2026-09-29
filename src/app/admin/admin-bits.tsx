"use client";

import { useRouter } from "next/navigation";
import { Fragment, useTransition } from "react";
import { removePhotoAction, toggleAvailabilityAction, uploadPhotoAction } from "@/app/actions";
import { FoodArt } from "@/components/food/food-art";
import { useResult, useToast } from "@/components/toast";
import { foodLook } from "@/lib/food-kind";
import { money } from "@/lib/rules";

/** Resize in the browser (longest side 900 px) and encode as WebP, or JPEG where WebP isn't supported. */
async function prepare(file: File) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  const encode = (type: string) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, 0.85));
  let blob = await encode("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg");
  if (!blob) throw new Error("Could not read that image.");
  const base64 = await new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] ?? "");
    r.onerror = () => fail(r.error);
    r.readAsDataURL(blob!);
  });
  return { mime: blob.type, base64, width, height };
}

export function AdminOutletSelect({ outlets, value }: { outlets: { id: string; name: string }[]; value: string }) {
  const router = useRouter();
  return (
    <select className="o-select w-40 min-w-0 sm:w-60" value={value} aria-label="Outlet" onChange={(e) => router.push(`/admin?outlet=${e.target.value}`)}>
      {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

type Item = { id: string; name: string; category: string; price: number | null; available: boolean; reason: string | null; photos: string[] | null };

export function AvailabilityList({ outletId, items }: { outletId: string; items: Item[] }) {
  const router = useRouter();
  const handle = useResult();
  const { show } = useToast();
  const [pending, start] = useTransition();
  const upload = (it: Item, file: File | undefined) =>
    file &&
    start(async () => {
      try {
        const p = await prepare(file);
        if (handle(await uploadPhotoAction(it.id, p.mime, p.base64, p.width, p.height), `Photo saved for ${it.name}`)) router.refresh();
      } catch {
        show({ title: "That file couldn't be read as a photo.", rule: "Menu photos: JPEG, PNG or WebP", tone: "danger" });
      }
    });
  const remove = (it: Item) =>
    start(async () => { if (handle(await removePhotoAction(it.id), `Photo removed from ${it.name}`)) router.refresh(); });
  const toggle = (it: Item) =>
    start(async () => {
      const r = await toggleAvailabilityAction(outletId, it.id);
      const offered = r.ok ? (r.data as { offered: number }).offered : 0;
      const msg = !it.available
        ? `${it.name} back on the menu`
        : offered
          ? `${it.name} sold out — ${offered} customer${offered === 1 ? "" : "s"} asked to pick a substitute or refund`
          : `${it.name} marked sold out — hidden from customers`;
      if (handle(r, msg)) router.refresh();
    });
  return (
    <table className="w-full">
      <thead><tr><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">Photo</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">Item</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold text-right">Price</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">Available</th></tr></thead>
      <tbody>
        {items.map((it, i) => {
          const header = i === 0 || items[i - 1].category !== it.category;
          return (
            <Fragment key={it.id}>
              {header && <tr><td colSpan={4} className="bg-surface-2 px-3 py-1.5 font-semibold">{it.category}</td></tr>}
              <tr>
                <td className="border-b border-line px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-lg bg-surface-2">
                      {it.photos
                        ? // eslint-disable-next-line @next/next/no-img-element -- small thumbnail, uploaded or bundled
                          <img src={it.photos[0]} alt="" className="h-full w-full object-cover" />
                        : <FoodArt kind={foodLook(it.name, it.category).kind} tint={foodLook(it.name, it.category).tint} steam={false} className="h-10 w-10" />}
                    </span>
                    <span className="flex flex-col gap-0.5 text-xs">
                      <label className={`cursor-pointer font-semibold text-accent ${pending ? "pointer-events-none opacity-50" : ""}`}>
                        {it.photos?.[0]?.startsWith("/api/") ? "Replace" : "Upload"}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`Photo for ${it.name}`} onChange={(e) => { upload(it, e.target.files?.[0]); e.target.value = ""; }} />
                      </label>
                      {it.photos?.[0]?.startsWith("/api/") && <button type="button" className="text-left text-muted hover:text-danger" disabled={pending} onClick={() => remove(it)}>Remove</button>}
                    </span>
                  </div>
                </td>
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
