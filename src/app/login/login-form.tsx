"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestOtpAction, verifyOtpAction } from "@/app/actions";
import { Field, FormError, SandboxNote } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";

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
    <AuthShell>
      <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-sts-purple">Welcome to your cafeteria</span>
      <h1 className="mb-3 text-2xl font-bold">{sentTo ? "Check your mobile" : "Let’s get you a good meal."}</h1>
      <p className="mb-5 text-muted">
        {sentTo ? `Enter the 6-digit verification code for ${sentTo}.` : "Sign in or create an account with your mobile number. No password to remember."}
      </p>

      {error && <FormError msg={error.msg} rule={error.rule} />}

      {!sentTo ? (
        <form onSubmit={(e) => { e.preventDefault(); send(); }}>
          <Field label="Mobile number" htmlFor="phone">
            <input id="phone" type="tel" required className="so-input" inputMode="tel" autoComplete="tel" placeholder="01712 345678" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
          </Field>
          <button type="submit" className="o-so-btn w-full" disabled={pending || phone.trim().length < 10}>{pending ? "Sending…" : "Continue with mobile →"}</button>
          <p className="mt-4 text-sm leading-6 text-muted">New here? Verify your number and we’ll help you set up your profile. Employees are recognised through the HR list.</p>
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
          <button type="submit" className="o-so-btn w-full" disabled={pending || code.length !== 6}>{pending ? "Checking…" : "Verify and continue →"}</button>
          <p className="mt-4 text-center">
            <button type="button" disabled={pending} className="min-h-11 font-semibold text-so-price" onClick={() => { setSentTo(null); setCode(""); setError(null); }}>Use a different number</button>
            {" · "}
            <button type="button" className="font-semibold text-so-price" onClick={send} disabled={pending}>Resend code</button>
          </p>
        </form>
      )}

      <SandboxNote>
        <b>Sandbox:</b> no SMS is sent — the presenter reads codes from the <Link href="/demo" target="_blank" className="underline">demo inbox</Link>.
        Demo numbers 01700000001–04 always use code <b>123456</b>.
      </SandboxNote>
    </AuthShell>
  );
}
