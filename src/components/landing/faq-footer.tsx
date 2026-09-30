import Image from "next/image";
import Link from "next/link";

// Answers follow STS's own replies to the online-ordering questionnaire (C8).
const FAQ = [
  ["Who can order online?", "Registered parents and students (mobile number + code), and staff on the HR list. Each person has their own account; there is no guest ordering."],
  ["How far ahead can I order?", "Today or up to 7 days ahead, for a break or lunch slot. Each slot shows its order-by time — the cut-offs are still being confirmed with STS."],
  ["How do I pay?", "bKash, Nagad or card (Visa, Mastercard, Amex) in the app. Staff can also pay cash or card at the counter. The payment screen here is a sandbox — no money moves."],
  ["Can I change or cancel?", "Yes, until the cut-off and before the kitchen starts. If the total changes, you pay the difference or get it back to the same payment method."],
  ["What if something sells out?", "You choose a substitute or a refund in the app. If there's no answer within 15 minutes, that item is refunded automatically."],
  ["How do I collect?", "When the screen says Ready, show your QR code at the counter. Staff scan it and check your name before handing over."],
];

export function Faq() {
  return (
    <section id="help" aria-labelledby="help-title" className="bg-sts-cream-2 py-16 md:py-24">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <div data-reveal>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-sts-orange-text">Help</p>
          <h2 id="help-title" className="mt-2 font-display text-[clamp(2rem,3vw+.8rem,3.4rem)] font-extrabold leading-none tracking-[-.03em] text-sts-purple">Good to know</h2>
          <p className="mt-3 max-w-sm text-sts-ink/75">Short answers to what parents, students and staff ask first.</p>
        </div>
        <div className="flex flex-col gap-2.5">
          {FAQ.map(([q, a]) => (
            <details key={q} data-reveal className="group rounded-2xl bg-sts-white px-5 py-4 shadow-[0_0_0_1px_var(--sts-hairline)] open:shadow-sts-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold text-sts-purple [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden className="grid h-8 w-8 flex-none place-items-center rounded-full bg-sts-purple-soft transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sts-ink/80">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer({ orderHref }: { orderHref: string }) {
  return (
    <footer className="relative overflow-hidden bg-sts-purple-deep text-sts-white">
      <div className="mx-auto max-w-[1240px] px-4 pb-8 pt-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="inline-block rounded-xl bg-sts-white px-3 py-2 leading-none"><Image src="/branding/scafe-logo.png" alt="S Cafe" width={120} height={62} /></span>
            <p className="mt-4 max-w-sm text-sts-white/70">S Cafe online ordering for STS Group campus cafeterias — order ahead, pick up on time.</p>
          </div>
          <Link href={orderHref} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-sts-action px-6 font-bold text-sts-ink hover:no-underline">Start an order <span aria-hidden>→</span></Link>
        </div>
        <p aria-hidden className="pointer-events-none mt-10 select-none font-display text-[clamp(3.5rem,13vw,11rem)] font-extrabold leading-[.8] tracking-[-.05em] text-sts-white/8">S Cafe</p>
        <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-sts-white/15 pt-5 text-xs text-sts-white/60">
          <span>© STS Group · Prototype by Invento</span>
          <span className="flex gap-4">
            <Link href="/guide" className="underline hover:text-sts-white">How it works — demo guide</Link>
            <Link href="/photo-credits" className="underline hover:text-sts-white">Food photo credits</Link>
          </span>
          <span>Working prototype — payment, SMS and HR list are sandbox</span>
        </div>
      </div>
    </footer>
  );
}
