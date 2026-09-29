import type { Metadata } from "next";
import { getDb } from "@/db/client";
import { ToastProvider } from "@/components/toast";
import { listOutlets } from "@/lib/orders";
import { currentCustomer } from "@/lib/session";
import { KitchenDisplay } from "./kitchen-display";

export const metadata: Metadata = { title: "Kitchen Display — STS Café" };

export default async function KdsPage({ searchParams }: PageProps<"/kds">) {
  const outlets = await listOutlets(await getDb());
  const q = (await searchParams).outlet;
  const outletId = typeof q === "string" && outlets.some((o) => o.id === q) ? q : "ISD-CAF";
  return (
    <ToastProvider>
      <KitchenDisplay outletId={outletId} outlets={outlets.map((o) => ({ id: o.id, name: o.name }))} personaId={(await currentCustomer())?.id ?? null} />
    </ToastProvider>
  );
}
