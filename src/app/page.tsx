import { LandingExperience } from "@/components/landing-experience";
import { getDb } from "@/db/client";
import { getOutlet } from "@/lib/orders";
import { currentCustomer } from "@/lib/session";

export default async function Home() {
  const cust = await currentCustomer();
  const outlet = cust ? await getOutlet(await getDb(), cust.outletId) : null;
  const visitor = cust && outlet ? { name: cust.name, accountType: cust.accountType, outletName: outlet.name, campus: outlet.campus } : null;
  return <LandingExperience visitor={visitor} />;
}
