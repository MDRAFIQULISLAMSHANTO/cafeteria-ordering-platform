"use client";

import { MotionConfig } from "framer-motion";
import { useRef } from "react";
import type { LandingData } from "@/lib/landing-data";
import { Faq, Footer } from "./faq-footer";
import { BalancedTray } from "./game/balanced-tray";
import { LandingHeader } from "./header";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { MenuShowcase } from "./menu-showcase";
import { useLandingMotion, useLite } from "./motion";
import { Outlets } from "./outlets";
import { SpecialCountdown } from "./special-countdown";

export function LandingPage({ data, visitorName }: { data: LandingData; visitorName: string | null }) {
  const root = useRef<HTMLDivElement>(null);
  const lite = useLite();
  useLandingMotion(root, lite);
  // guests sign in first; the order page picks up anything they added here
  const orderHref = visitorName ? "/order" : "/login?next=/order";

  return (
    <MotionConfig reducedMotion="user">
      <div ref={root} className="min-h-dvh bg-sts-cream-2 text-sts-ink">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-60 focus:rounded-lg focus:bg-sts-white focus:px-4 focus:py-2">Skip to content</a>
        <LandingHeader signedIn={Boolean(visitorName)} orderHref={orderHref} />
        <main id="main">
          <Hero data={data} visitorName={visitorName} orderHref={orderHref} lite={lite} />
          <MenuShowcase data={data} orderHref={orderHref} />
          <SpecialCountdown data={data} orderHref={orderHref} />
          <HowItWorks lite={lite} />
          <Outlets data={data} />
          <BalancedTray data={data} orderHref={orderHref} />
          <Faq />
        </main>
        <Footer orderHref={orderHref} />
      </div>
    </MotionConfig>
  );
}
