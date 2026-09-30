import Image from "next/image";
import Link from "next/link";
import { BUNDLED_PHOTOS, SCAFE_CUTOUTS } from "@/lib/food-photos";
import credits from "@/lib/menu-photo-credits.json";

// stock photos still on the menu (S Cafe's own photos replace some)
const inUse = new Set(Object.entries(BUNDLED_PHOTOS).filter(([id]) => !SCAFE_CUTOUTS[id]).flatMap(([, files]) => files));
const own = [...new Set(Object.values(SCAFE_CUTOUTS))];

export const metadata = { title: "Food photo credits — S Cafe" };

export default function PhotoCreditsPage() {
  return (
    <main className="min-h-screen bg-page px-4 py-10 text-ink">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="underline">← Back to cafeteria</Link>
        <h1 className="mt-6 text-3xl font-bold">Food photo credits</h1>
        <h2 className="mt-8 text-xl font-bold">S Cafe&apos;s own photos</h2>
        <p className="mt-2 max-w-2xl text-muted">Supplied by S Cafe for these dishes. Servings may vary.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {own.map((file) => (
            <Image key={file} src={file} alt={file.split("/").pop()!.replace(".webp", "").replaceAll("-", " ")} width={96} height={96} className="h-24 w-24 rounded-lg bg-surface object-contain p-1" />
          ))}
        </div>
        <h2 className="mt-10 text-xl font-bold">Stock photos</h2>
        <p className="mt-2 max-w-2xl text-muted">These real food photographs illustrate the rest of the menu. They are not photographs of S Cafe meals; ingredients, presentation and portions may vary. Outlet-uploaded photographs take priority.</p>
        <p className="mt-3 text-sm text-muted">Photos are resized and converted to WebP, with display cropping. Each photo retains its original license, including ShareAlike terms where applicable.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {credits.filter((photo) => inUse.has(photo.file)).map(photo => (
            <article key={photo.key} className="flex gap-4 rounded-xl border border-line bg-surface p-4">
              <Image src={photo.file} alt={photo.key.replaceAll("-", " ")} width={96} height={96} className="h-24 w-24 flex-none rounded-lg object-cover" />
              <div className="min-w-0 break-words text-sm">
                <h2 className="font-bold">{photo.key.replaceAll("-", " ")}</h2>
                <p className="mt-1">{photo.author}</p>
                <a className="mt-1 block underline" href={photo.source} target="_blank" rel="noreferrer">Original photograph</a>
                {photo.licenseUrl ? <a className="underline" href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a> : <span>{photo.license}</span>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
