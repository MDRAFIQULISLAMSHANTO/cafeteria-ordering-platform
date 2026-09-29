"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetDemoAction, setSubstitutionTimeoutAction, shiftClockAction } from "@/app/actions";
import { useLive } from "@/components/live";
import { useResult } from "@/components/toast";

export function ClockControls() {
  const router = useRouter();
  const handle = useResult();
  const [pending, start] = useTransition();
  const shift = (m: number | "reset") =>
    start(async () => {
      if (handle(await shiftClockAction(m))) router.refresh();
    });
  return (
    <div className="flex flex-wrap gap-1.5">
      <button className="o-btn" disabled={pending} onClick={() => shift(-60)}>−1 hour</button>
      <button className="o-btn" disabled={pending} onClick={() => shift(30)}>+30 min</button>
      <button className="o-btn" disabled={pending} onClick={() => shift(60)}>+1 hour</button>
      <button className="o-btn" disabled={pending} onClick={() => shift(24 * 60)}>+1 day</button>
      <button className="o-btn o-btn-link" disabled={pending} onClick={() => shift("reset")}>Back to real time</button>
    </div>
  );
}

export function SubstitutionTimer({ seconds }: { seconds: number }) {
  const router = useRouter();
  const handle = useResult();
  const [pending, start] = useTransition();
  const set = (s: 60 | 900) => start(async () => { if (handle(await setSubstitutionTimeoutAction(s), s === 60 ? "Substitution timer: 60 seconds" : "Substitution timer: 15 minutes")) router.refresh(); });
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Substitution timer">
      <button role="radio" aria-checked={seconds === 900} className={`o-btn ${seconds === 900 ? "o-btn-primary" : ""}`} disabled={pending} onClick={() => set(900)}>15 minutes (STS rule)</button>
      <button role="radio" aria-checked={seconds === 60} className={`o-btn ${seconds === 60 ? "o-btn-primary" : ""}`} disabled={pending} onClick={() => set(60)}>60 seconds (demo)</button>
    </div>
  );
}

export function ResetButton() {
  const router = useRouter();
  const handle = useResult();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (!confirm) return <button className="o-btn o-btn-primary" onClick={() => setConfirm(true)}>Reset demo data…</button>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span>All orders will be deleted. Continue?</span>
      <button
        className="o-btn o-btn-danger"
        disabled={pending}
        onClick={() => start(async () => {
          if (handle(await resetDemoAction(), "Demo data reset")) { setConfirm(false); router.refresh(); }
        })}
      >
        {pending ? "Resetting…" : "Yes, reset"}
      </button>
      <button className="o-btn o-btn-link" onClick={() => setConfirm(false)}>Cancel</button>
    </div>
  );
}

type Msg = { id: string; phone: string; text: string; createdAt: string };

export function Inbox() {
  const { data } = useLive<{ messages: Msg[] }>("/api/live/inbox", 2000);
  if (!data) return <div className="o-hint">Loading…</div>;
  if (data.messages.length === 0) return <div className="o-hint">No messages yet. OTP codes and order updates appear here.</div>;
  return (
    <div className="flex max-h-[70vh] flex-col gap-1.5 overflow-y-auto">
      {data.messages.map((m) => (
        <div key={m.id} className="rounded-lg border border-line px-3 py-2 text-sm">
          <small className="mb-1 flex justify-between text-muted"><b className="tabular-nums">{m.phone}</b><span>{new Date(m.createdAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span></small>
          {m.text}
        </div>
      ))}
    </div>
  );
}
