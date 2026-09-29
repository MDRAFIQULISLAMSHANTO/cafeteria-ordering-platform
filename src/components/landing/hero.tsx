import Link from "next/link";
import type { LandingData } from "@/lib/landing-data";
import { HeroArt } from "./hero-art";

/** Fits one screen on every device: headline, actions and the tray art. */
export function Hero({ data, visitorName, orderHref, lite }: { data: LandingData; visitorName: string | null; orderHref: string; lite: boolean }) {
  return (
    <section data-hero aria-labelledby="hero-title" className="relative -mt-16 overflow-hidden bg-sts-cream-2 pt-16 md:-mt-18 md:pt-18">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-sts-glow" />
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[28px] border-sts-orange-soft/70" />
      <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1240px] grid-rows-[auto_1fr] items-center gap-3 px-4 pb-5 pt-2 sm:gap-4 sm:px-6 sm:pt-4 md:min-h-[calc(100svh-4.5rem)] lg:grid-cols-[1.05fr_.95fr] lg:grid-rows-1 lg:gap-8 lg:py-6">
        <div className="text-center lg:text-left">
          <p data-hero-in className="inline-flex items-center gap-2 rounded-full bg-sts-white px-3 py-1.5 text-2xs font-bold uppercase tracking-[.14em] text-sts-purple shadow-[0_0_0_1px_var(--sts-hairline)] sm:text-xs">
            <span aria-hidden className="h-2 w-2 rounded-full bg-sts-orange" />
            {visitorName ? `Welcome back, ${visitorName.split(" ")[0]}` : "STS Group campus cafeterias"}
          </p>
          <h1 id="hero-title" className="mt-3 font-display text-[clamp(2.2rem,5.2vw+1.2svh,5.2rem)] font-extrabold leading-[.98] tracking-[-.035em] text-sts-purple sm:mt-5">
            Order ahead.
            <br />
            Pick up{" "}
            <span className="relative inline-block whitespace-nowrap text-sts-orange-display">
              on time.
              <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-[.12em] left-0 h-[.2em] w-full">
                <path data-swash d="M4 16C70 6 160 4 296 12" fill="none" stroke="var(--sts-orange)" strokeWidth="7" strokeLinecap="round" strokeDasharray="320" />
              </svg>
            </span>
          </h1>
          <p data-hero-in className="mx-auto mt-2.5 max-w-md text-[clamp(.9rem,.6vw+.7rem,1.15rem)] leading-relaxed text-sts-ink/80 sm:mt-5 lg:mx-0">
            Choose from your campus cafeteria&apos;s menu, pick a break-time slot and collect with a QR code — no queue at the counter.
          </p>
          <div data-hero-in className="mt-3.5 grid grid-cols-2 gap-2 sm:mt-7 sm:flex sm:justify-center sm:gap-3 lg:justify-start">
            <Link href={orderHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sts-action px-5 font-bold text-sts-ink shadow-[var(--sts-action-shadow)] transition-transform hover:-translate-y-0.5 hover:no-underline sm:min-h-14 sm:px-7">
              Order now <span aria-hidden>→</span>
            </Link>
            <a href="#menu" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-sts-white px-5 font-bold text-sts-purple shadow-[0_0_0_1.5px_var(--sts-hairline)] hover:no-underline sm:min-h-14 sm:px-7">
              See the menu
            </a>
          </div>
          <dl data-hero-in className="mx-auto mt-5 hidden max-w-lg grid-cols-3 gap-3 border-t border-sts-hairline pt-4 text-left sm:[@media(min-height:720px)]:grid lg:mx-0">
            <div><dt className="text-2xs font-semibold uppercase tracking-wider text-muted">Outlets</dt><dd className="font-display text-2xl font-bold text-sts-purple"><span data-count={data.outlets.length}>{data.outlets.length}</span></dd></div>
            <div><dt className="text-2xs font-semibold uppercase tracking-wider text-muted">On today&apos;s menu</dt><dd className="font-display text-2xl font-bold text-sts-purple"><span data-count={data.items.length}>{data.items.length}</span> items</dd></div>
            <div><dt className="text-2xs font-semibold uppercase tracking-wider text-muted">Pay with</dt><dd className="pt-1 text-sm font-bold text-sts-purple">bKash · Nagad · Card</dd></div>
          </dl>
        </div>
        <div className="self-stretch">
          <div className="flex h-full items-center justify-center">
            <HeroArt next={data.next ? { label: data.next.label, time: data.next.time } : null} lite={lite} />
          </div>
        </div>
      </div>
    </section>
  );
}
