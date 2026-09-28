import { redirect } from "next/navigation";
import { currentCustomer } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = (await searchParams).next;
  if (await currentCustomer()) redirect(typeof next === "string" ? next : "/order");
  return (
    <div className="min-h-screen bg-so-bg text-ink">
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </div>
  );
}
