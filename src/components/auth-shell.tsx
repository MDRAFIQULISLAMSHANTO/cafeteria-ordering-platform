import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FoodArt } from "./food/food-art";
import styles from "./auth-shell.module.css";

// Sign-in and sign-up share this frame. It fills exactly one screen: a brand
// panel with drawn food on large screens, a slim header on phones.
export function AuthShell({ children, signup = false }: { children: ReactNode; signup?: boolean }) {
  return (
    <div className={styles.page}>
      <aside className={styles.story} aria-hidden>
        <Link href="/" className={styles.logo} tabIndex={-1}>
          <Image src="/branding/scafe-logo.png" alt="" width={112} height={58} priority />
        </Link>
        <div className={styles.stage}>
          <div className={styles.orbit} />
          <FoodArt kind="burger" className={styles.hero} />
          <FoodArt kind="hot" tint="coffee" className={`${styles.side} ${styles.sideA}`} />
          <FoodArt kind="cookie" className={`${styles.side} ${styles.sideB}`} />
          <FoodArt kind="cold" tint="lemon" className={`${styles.side} ${styles.sideC}`} />
          <div className={`${styles.chip} ${styles.chipA}`}><b>S12</b> Ready for pickup <i>✓</i></div>
          <div className={`${styles.chip} ${styles.chipB}`}>Lunch · <b>12:00 PM</b></div>
        </div>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>A little break. A good meal.</span>
          <h2>Your next meal, <em>one step closer.</em></h2>
          <ol className={styles.benefits}>
            <li><span>01</span> Choose</li>
            <li><span>02</span> Pick a time</li>
            <li><span>03</span> Collect with QR</li>
          </ol>
        </div>
      </aside>

      <section className={styles.formArea} aria-label={signup ? "Create your cafeteria account" : "Sign in to your cafeteria account"}>
        <header className={styles.header}>
          <Link href="/" aria-label="S Cafe home" className={styles.mobileLogo}><Image src="/branding/scafe-logo.png" alt="S Cafe" width={82} height={42} priority /></Link>
          <Link href="/" className={styles.back}>← Home</Link>
        </header>
        <div className={styles.card}>
          <div className={styles.steps} aria-label="Account setup progress">
            <span className={!signup ? styles.current : ""}>01 · Verify mobile</span><i /><span className={signup ? styles.current : ""}>02 · Your profile</span>
          </div>
          <div className={styles.form}>{children}</div>
        </div>
        <p className={styles.footer}>S Cafe · STS Group campus cafeterias</p>
      </section>
    </div>
  );
}
