"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeOutletAction, updateClassAction } from "@/app/actions";
import { useResult } from "@/components/toast";

const input = "h-11 w-full rounded-lg border border-line-strong bg-so-surface px-3 text-ink focus:border-so-price focus:outline-none focus:ring-3 focus:ring-focus";

export function CampusForm({ value, outlets }: { value: string; outlets: { id: string; label: string }[] }) {
  const router = useRouter();
  const handle = useResult();
  const [outletId, setOutletId] = useState(value);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => { if (handle(await changeOutletAction(outletId), "Campus changed — your menu is updated")) router.refresh(); });
      }}
    >
      <select aria-label="Campus" className={input} value={outletId} onChange={(e) => setOutletId(e.target.value)}>
        {outlets.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <button className="o-so-btn o-so-btn-primary h-11 flex-none px-5 disabled:opacity-50" disabled={pending || outletId === value}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function ClassForm({ classGrade, section }: { classGrade: string; section: string }) {
  const router = useRouter();
  const handle = useResult();
  const [g, setG] = useState(classGrade);
  const [s, setS] = useState(section);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => { if (handle(await updateClassAction(g, s), "Class updated")) router.refresh(); });
      }}
    >
      <label className="text-sm font-semibold">Class<input className={`${input} mt-1`} value={g} onChange={(e) => setG(e.target.value)} /></label>
      <label className="text-sm font-semibold">Section<input className={`${input} mt-1`} value={s} onChange={(e) => setS(e.target.value)} /></label>
      <button className="o-so-btn o-so-btn-primary col-span-2 h-11 self-end px-5 disabled:opacity-50 sm:col-span-1" disabled={pending || (g === classGrade && s === section)}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
