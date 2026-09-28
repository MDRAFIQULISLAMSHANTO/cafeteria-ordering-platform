import Image from "next/image";
import Link from "next/link";
import { currentCustomer } from "@/lib/session";

export default async function Home() {
  const cust = await currentCustomer();
  return (
    <div className="flex min-h-screen flex-col bg-so-hero text-sts-ink">
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-end gap-5 px-5 py-8">
        <div className="w-fit rounded-xl bg-so-surface px-3.5 py-2.5 shadow-o-sm">
          <Image src="/branding/sts-group-logo.png" alt="STS Group" width={160} height={69} priority />
        </div>
        <h1 className="m-0 max-w-[16ch] text-[clamp(2.2rem,5vw,3.6rem)] font-bold leading-[1.05]">Order ahead. Skip the queue.</h1>
        <p className="m-0 max-w-[46ch] text-lg opacity-85">
          Order snacks and lunch from your campus cafeteria — for today or up to a week ahead — pay online and pick up with
          your QR code.
        </p>
        <div className="grid max-w-[760px] grid-cols-1 gap-4 sm:grid-cols-2">
          <Link className="o-so-btn grid h-17 place-items-center text-xl no-underline" href={cust ? "/orders" : "/login?next=/orders"}>My Orders</Link>
          <Link className="o-so-btn o-so-btn-primary grid h-17 place-items-center text-xl no-underline" href={cust ? "/order" : "/login"}>
            {cust ? "Continue ordering" : "Order Now"}
          </Link>
        </div>
        <div className="flex flex-wrap gap-4 text-xs opacity-80">
          <span className="pill-sandbox">PROTOTYPE · payments and SMS are sandbox</span>
          <Link className="text-sts-purple underline" href="/demo">Demo hub</Link>
        </div>
      </div>
    </div>
  );
}
