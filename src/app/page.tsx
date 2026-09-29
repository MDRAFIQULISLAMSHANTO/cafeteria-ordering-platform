import { LandingPage } from "@/components/landing/landing-page";
import { landingData } from "@/lib/landing-data";
import { currentCustomer } from "@/lib/session";

export default async function Home() {
  const cust = await currentCustomer();
  const data = await landingData(cust?.outletId);
  return <LandingPage data={data} visitorName={cust?.name ?? null} />;
}
