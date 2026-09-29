"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registerAction } from "@/app/actions";
import Link from "next/link";
import { Field, FormError, SandboxNote, Segmented } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";

export function RegisterForm({ phone, outlets }: { phone: string; outlets: { id: string; label: string }[] }) {
  const router = useRouter();
  const [accountType, setType] = useState<"parent" | "student">("parent");
  const [name, setName] = useState("");
  const [outletId, setOutlet] = useState("");
  const [classGrade, setClass] = useState("");
  const [section, setSection] = useState("");
  const [error, setError] = useState<{ msg: string; rule?: string } | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const r = await registerAction({ name, accountType, outletId, classGrade, section });
      if (!r.ok) return setError({ msg: r.error, rule: r.rule });
      router.push((r.data as { next: string }).next);
      router.refresh();
    });

  return (
    <AuthShell signup>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-sts-purple">One last step</span>
        <h1 className="mb-3 text-2xl font-bold">Make yourself at home.</h1>
        <p className="mb-4 leading-6 text-muted">Create your account so we can show the right cafeteria and pickup times for you.</p>
        <p className="mb-6 rounded-xl bg-success-bg px-4 py-3 text-sm text-success">✓ Mobile verified <b>{phone}</b></p>
        {error && <FormError msg={error.msg} rule={error.rule} />}
        <div className="mb-4">
          <div className="mb-1.5 text-sm font-semibold">I am a</div>
          <Segmented label="Account type" value={accountType} onChange={setType} options={[{ id: "parent", label: "Parent" }, { id: "student", label: "Student" }]} />
        </div>
        <Field label="Full name" htmlFor="name">
          <input id="name" required minLength={2} placeholder="Your full name" className="so-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
        </Field>
        <Field label="Campus" htmlFor="campus">
          <select id="campus" required className="so-input" value={outletId} onChange={(e) => setOutlet(e.target.value)}>
            <option value="" disabled>Select your campus / cafeteria</option>
            {outlets.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Field>
        {accountType === "student" && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Class" htmlFor="class">
              <input id="class" required className="so-input" value={classGrade} onChange={(e) => setClass(e.target.value)} placeholder="e.g. 8" />
            </Field>
            <Field label="Section" htmlFor="section">
              <input id="section" required className="so-input" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. B" />
            </Field>
          </div>
        )}
        <button type="submit" className="o-so-btn w-full" disabled={pending}>{pending ? "Creating…" : "Create account & explore menu →"}</button>
        <p className="mt-4 text-center text-sm"><Link href="/login" className="font-semibold text-sts-purple">Use a different mobile number</Link></p>
        <SandboxNote>STS staff don&apos;t register here: staff numbers are recognised from the HR list automatically.</SandboxNote>
      </form>
    </AuthShell>
  );
}
