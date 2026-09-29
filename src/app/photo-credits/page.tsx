import Image from "next/image";
import Link from "next/link";
import credits from "@/lib/menu-photo-credits.json";

export const metadata = { title: "Food photo credits — STS Group" };

export default function PhotoCreditsPage() {
  return (
    <main className="min-h-screen bg-page px-4 py-10 text-ink">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="underline">← Back to cafeteria</Link>
        <h1 className="mt-6 text-3xl font-bold">Food photo credits</h1>
        <p className="mt-3 max-w-2xl text-muted">These real food photographs illustrate the menu. They are not photographs of STS meals; ingredients, presentation and portions may vary. Outlet-uploaded photographs take priority.</p>
        <p className="mt-3 text-sm text-muted">Photos are resized and converted to WebP, with display cropping. Each photo retains its original license, including ShareAlike terms where applicable.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {credits.map(photo => (
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
