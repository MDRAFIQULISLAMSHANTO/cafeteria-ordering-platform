import type { LandingData } from "@/lib/landing-data";

const KIND: Record<string, string> = { cafeteria: "Cafeteria", parent_lounge: "Parent Lounge", corporate: "Corporate office" };

export function Outlets({ data }: { data: LandingData }) {
  return (
    <section id="outlets" aria-labelledby="outlets-title" className="bg-sts-white py-16 md:py-24">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div data-reveal className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-sts-orange-text">Find your cafeteria</p>
          <h2 id="outlets-title" className="mt-2 font-display text-[clamp(2rem,3vw+.8rem,3.4rem)] font-extrabold leading-none tracking-[-.03em] text-sts-purple">
            <span data-count={data.outlets.length}>{data.outlets.length}</span> outlets, one app.
          </h2>
          <p className="mt-3 text-sts-ink/75">Parents and students pick their campus when they sign up. Staff are matched to their outlet from the HR list.</p>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.outlets.map((o) => (
            <li key={o.id} data-reveal className="group relative overflow-hidden rounded-3xl bg-sts-cream-2 p-5 shadow-[0_0_0_1px_var(--sts-hairline)] transition-shadow hover:shadow-sts-card">
              <svg aria-hidden viewBox="0 0 40 40" className="absolute -right-3 -top-3 h-24 w-24 text-sts-orange-soft transition-transform duration-500 group-hover:rotate-12">
                <path d="M20 3c7 0 12 5 12 12 0 9-12 22-12 22S8 24 8 15C8 8 13 3 20 3z" fill="currentColor" />
                <circle cx="20" cy="15" r="5" fill="var(--sts-white)" />
              </svg>
              <p className="relative text-2xs font-bold uppercase tracking-wider text-muted">{o.campus}</p>
              <h3 className="relative mt-1 font-display text-xl font-bold text-sts-purple">{o.name}</h3>
              <p className="relative mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-sts-white px-2.5 py-0.5 text-xs font-semibold text-sts-purple">{KIND[o.kind] ?? o.kind}</span>
                <span className="tabular-nums text-sts-ink/80">{o.hours}</span>
                {!o.hoursConfirmed && <span className="pill-pending">hours to be confirmed</span>}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
