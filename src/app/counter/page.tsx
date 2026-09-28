import type { Metadata } from "next";
import { getDb } from "@/db/client";
import { ToastProvider } from "@/components/toast";
import { listOutlets } from "@/lib/orders";
import { CounterScreen } from "./counter-screen";

export const metadata: Metadata = { title: "Counter — STS Café" };

export default async function CounterPage({ searchParams }: PageProps<"/counter">) {
  const outlets = await listOutlets(await getDb());
  const q = (await searchParams).outlet;
  const outletId = typeof q === "string" && outlets.some((o) => o.id === q) ? q : "ISD-CAF";
  return (
    <ToastProvider>
      <CounterScreen outletId={outletId} outlets={outlets.map((o) => ({ id: o.id, name: o.name }))} />
    </ToastProvider>
  );
}
