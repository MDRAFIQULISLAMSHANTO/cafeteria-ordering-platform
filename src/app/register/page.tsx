import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { listOutlets } from "@/lib/orders";
import { getPendingPhone } from "@/lib/session";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const phone = await getPendingPhone();
  if (!phone) redirect("/login");
  const outlets = (await listOutlets(await getDb())).filter((o) => o.kind !== "corporate");
  return <RegisterForm phone={phone} outlets={outlets.map((o) => ({ id: o.id, label: `${o.campus} — ${o.name}` }))} />;
}
