"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestOtpAction, verifyOtpAction } from "@/app/actions";
import { CenterCard, Field, FormError, SandboxNote } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<{ msg: string; rule?: string } | null>(null);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      const r = await requestOtpAction(phone);
      if (!r.ok) return setError({ msg: r.error, rule: r.rule });
      setError(null);
      setSentTo(r.data as string);
    });

  const verify = () =>
    start(async () => {
      const r = await verifyOtpAction(sentTo!, code);
      if (!r.ok) return setError({ msg: r.error, rule: r.rule });
      const target = r.data!.next === "/order" && next ? next : r.data!.next;
      router.push(target);
      router.refresh();
    });

  return (
    <CenterCard>
      <Link href="/" aria-label="Home">
        <Image src="/branding/sts-group-logo.png" alt="STS Group" width={110} height={47} className="mb-4" />
      </Link>
      <h1 className="mb-1.5 text-2xl font-bold">{sentTo ? "Enter your code" : "Sign in with your mobile"}</h1>
      <p className="mb-5 text-muted">
        {sentTo ? `We sent a 6-digit code to ${sentTo}.` : "Parents, students and STS staff sign in with their mobile number. No password needed."}
      </p>

      {error && <FormError msg={error.msg} rule={error.rule} />}

      {!sentTo ? (
        <form onSubmit={(e) => { e.preventDefault(); send(); }}>
          <Field label="Mobile number" htmlFor="phone">
            <input id="phone" className="so-input" inputMode="tel" autoComplete="tel" placeholder="01712 345678" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
          </Field>
          <button className="o-so-btn o-so-btn-primary w-full" disabled={pending || phone.trim().length < 10}>{pending ? "Sending…" : "Send code"}</button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); verify(); }}>
          <Field label="6-digit code" htmlFor="code">
            <input
              id="code"
              className="so-input text-center text-2xl tracking-[.5em] tabular-nums"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </Field>
          <button className="o-so-btn o-so-btn-primary w-full" disabled={pending || code.length !== 6}>{pending ? "Checking…" : "Verify and continue"}</button>
          <p className="mt-4 text-center">
            <button type="button" className="font-semibold text-so-price" onClick={() => { setSentTo(null); setCode(""); setError(null); }}>Use a different number</button>
            {" · "}
            <button type="button" className="font-semibold text-so-price" onClick={send} disabled={pending}>Resend code</button>
          </p>
        </form>
      )}

      <SandboxNote>
        <b>Sandbox:</b> codes appear in the <Link href="/demo" target="_blank" className="underline">demo inbox</Link> instead of an SMS. Demo numbers
        01700000001–04 always use code <b>123456</b>.
      </SandboxNote>
    </CenterCard>
  );
}
