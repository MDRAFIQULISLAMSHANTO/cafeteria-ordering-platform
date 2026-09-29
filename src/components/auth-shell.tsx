import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./auth-shell.module.css";

export function AuthShell({ children, signup = false }: { children: ReactNode; signup?: boolean }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="STS Group home"><Image src="/branding/sts-group-logo.png" alt="STS Group" width={112} height={48} priority /></Link>
        <Link href="/">← Back to home</Link>
      </header>
      <main className={styles.layout}>
        <aside className={styles.story}>
          <span className={styles.eyebrow}>A little break. A good meal.</span>
          <h2>Your next meal,<br /><em>one step closer.</em></h2>
          <p>Make time for your day. Choose your favourites, pick a collection time and leave the rest to your cafeteria.</p>
          <div className={styles.food}>
            <div className={styles.photo} role="img" aria-label="Chocolate-drizzled pastry and blueberries from the supplied cafeteria banner" />
            <span className={styles.foodTag}>Something to look forward to.</span>
          </div>
          <div className={styles.benefits}><span>01 <b>Choose your meal</b></span><span>02 <b>Pick your time</b></span><span>03 <b>Collect with QR</b></span></div>
        </aside>
        <section className={styles.formArea} aria-label={signup ? "Create your cafeteria account" : "Sign in to your cafeteria account"}>
          <div className={styles.steps} aria-label="Account setup progress"><span className={!signup ? styles.current : ""}>01 · Verify mobile</span><i /><span className={signup ? styles.current : ""}>02 · Your profile</span></div>
          <div className={styles.form}>{children}</div>
          <p className={styles.footer}>STS Group · Your campus. Your cafeteria.</p>
        </section>
      </main>
    </div>
  );
}
