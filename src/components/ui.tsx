import type { ReactNode } from "react";

// Small shared layout pieces for the customer screens (Tailwind).

export function CenterCard({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="grid place-items-start justify-center px-4 py-8">
      <div className={`${wide ? "w-[min(520px,100%)]" : "w-[min(460px,100%)]"} rounded-2xl bg-so-surface p-6 shadow-o-md`}>{children}</div>
    </div>
  );
}

export function FormError({ msg, rule }: { msg: string; rule?: string }) {
  return (
    <div role="alert" className="mb-4 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
      {msg}
      {rule && <small className="mt-0.5 block opacity-85">Rule: {rule}</small>}
    </div>
  );
}

export function SandboxNote({ children }: { children: ReactNode }) {
  return <div className="mt-4 rounded-md bg-warning-bg px-3 py-2 text-xs text-warning">{children}</div>;
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-12 rounded-so border font-semibold ${value === o.id ? "border-primary bg-so-bg text-so-price" : "border-line-strong"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const stateBadge = {
  paid: "bg-so-paid text-so-paid-ink",
  wait: "bg-warning-bg text-warning",
  bad: "bg-danger-bg text-danger",
  done: "bg-neutral-bg text-neutral",
  ready: "bg-info-bg text-info",
} as const;

export function StateBadge({ tone, children }: { tone: keyof typeof stateBadge; children: ReactNode }) {
  return <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${stateBadge[tone]}`}>{children}</span>;
}
