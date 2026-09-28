"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registerAction } from "@/app/actions";
import { CenterCard, Field, FormError, SandboxNote, Segmented } from "@/components/ui";

export function RegisterForm({ phone, outlets }: { phone: string; outlets: { id: string; label: string }[] }) {
  const router = useRouter();
  const [accountType, setType] = useState<"parent" | "student">("parent");
  const [name, setName] = useState("");
  const [outletId, setOutlet] = useState(outlets[0]?.id ?? "");
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
    <CenterCard>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <h1 className="mb-1.5 text-2xl font-bold">Create your account</h1>
        <p className="mb-5 text-muted">Verified mobile: <b className="text-ink">{phone}</b>. One account per person.</p>
        {error && <FormError msg={error.msg} rule={error.rule} />}
        <div className="mb-4">
          <div className="mb-1.5 text-sm font-semibold">I am a</div>
          <Segmented label="Account type" value={accountType} onChange={setType} options={[{ id: "parent", label: "Parent" }, { id: "student", label: "Student" }]} />
        </div>
        <Field label="Full name" htmlFor="name">
          <input id="name" className="so-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
        </Field>
        <Field label="Campus" htmlFor="campus">
          <select id="campus" className="so-input" value={outletId} onChange={(e) => setOutlet(e.target.value)}>
            {outlets.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Field>
        {accountType === "student" && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Class" htmlFor="class">
              <input id="class" className="so-input" value={classGrade} onChange={(e) => setClass(e.target.value)} placeholder="e.g. 8" />
            </Field>
            <Field label="Section" htmlFor="section">
              <input id="section" className="so-input" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. B" />
            </Field>
          </div>
        )}
        <button className="o-so-btn o-so-btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
        <SandboxNote>STS staff don&apos;t register here: staff numbers are recognised from the HR list automatically.</SandboxNote>
      </form>
    </CenterCard>
  );
}
