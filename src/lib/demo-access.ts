// Presenter access for the staff and demo screens (kitchen, counter, TV,
// operations, demo hub, sandbox inbox) and their actions.
//
// - DEMO_KEY unset in development: everything is open, for local work.
// - DEMO_KEY unset in production: closed (fail safe).
// - DEMO_KEY set: open any staff link once with ?key=<DEMO_KEY>; that sets an
//   httpOnly cookie holding a hash of the key, valid for 30 days.
//
// Customer screens are never gated here; they have their own OTP login.

export const DEMO_COOKIE = "sts_demo";
export const DEMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function demoKey(): string | null {
  return process.env.DEMO_KEY || null;
}

export function openWithoutKey(): boolean {
  return process.env.NODE_ENV !== "production";
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
