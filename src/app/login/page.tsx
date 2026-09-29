import { redirect } from "next/navigation";
import { currentCustomer } from "@/lib/session";
import { LoginForm } from "./login-form";

// Only same-site paths may follow sign-in ("//host" or "/\\host" would leave the site).
function safeNext(v: unknown) {
  return typeof v === "string" && /^\/(?![\/\\])/.test(v) ? v : undefined;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  if (await currentCustomer()) redirect(next ?? "/order");
  return <LoginForm next={next} />;
}
