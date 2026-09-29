// Presenter access for the staff and demo screens (kitchen, counter, TV,
// operations, demo hub, sandbox inbox) and their actions.
//
// Open by default (user decision, 29 Sep 2026: "I don't need any security
// here"). Anyone with the link can use the staff screens, read the sandbox
// SMS inbox (it shows login codes) and reset the demo data.
//
// To lock it again, set DEMO_LOCK=1 together with DEMO_KEY:
// - open any staff link once with ?key=<DEMO_KEY>, or enter the key in the
//   DEMO menu; that sets an httpOnly cookie holding a hash of the key (30 days).
// - DEMO_LOCK=1 without DEMO_KEY keeps everything closed (fail safe).
//
// Customer screens are never gated here; they have their own OTP login.

export const DEMO_COOKIE = "sts_demo";
export const DEMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** The presenter lock is opt-in: DEMO_LOCK=1 (or true/yes) turns it on. */
export function demoLocked(): boolean {
  return /^(1|true|yes)$/i.test(process.env.DEMO_LOCK?.trim() ?? "");
}

export function demoKey(): string | null {
  return demoLocked() ? process.env.DEMO_KEY || null : null;
}

export function openWithoutKey(): boolean {
  return !demoLocked();
}

export async function demoToken(key: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`sts-demo:${key}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison of two equal-length hex strings. */
export function sameToken(a: string | undefined, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hasDemoAccess(cookieValue: string | undefined): Promise<boolean> {
  const key = demoKey();
  if (!key) return openWithoutKey();
  return sameToken(cookieValue, await demoToken(key));
}
