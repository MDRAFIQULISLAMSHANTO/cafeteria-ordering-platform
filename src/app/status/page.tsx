import type { Metadata } from "next";
import { StatusBoard } from "./status-board";

export const metadata: Metadata = { title: "Order status — STS Café" };

export default async function StatusPage({ searchParams }: PageProps<"/status">) {
  const q = (await searchParams).outlet;
  return <StatusBoard outletId={typeof q === "string" ? q : "ISD-CAF"} />;
}
