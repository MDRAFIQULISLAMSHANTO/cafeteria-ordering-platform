import "server-only";
import { cookies } from "next/headers";
import { DEMO_COOKIE, hasDemoAccess } from "./demo-access";
import { isPersonaId } from "./demo-personas";

/** Whether to show the "Demo as" switcher, and whether staff screens are unlocked. */
export async function demoContext(customerId?: string | null) {
  const staffUnlocked = await hasDemoAccess((await cookies()).get(DEMO_COOKIE)?.value);
  const isPersona = isPersonaId(customerId);
  return { staffUnlocked, isPersona, show: isPersona || staffUnlocked };
}

export type DemoContext = Awaited<ReturnType<typeof demoContext>>;
