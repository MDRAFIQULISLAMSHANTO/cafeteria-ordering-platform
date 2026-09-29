"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { importHrAction } from "@/app/actions";
import { useResult } from "@/components/toast";

type Summary = { added: number; updated: number; deactivated: number; leavers: string[]; rows: number };

export function HrImport() {
  const router = useRouter();
  const handle = useResult();
  const file = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [summary, setSummary] = useState<Summary | null>(null);

  const run = (csv: string | null, source: string) =>
    start(async () => {
      const r = await importHrAction(csv, source);
      if (!handle(r, "HR list imported") || !r.ok) return;
      setSummary(r.data as Summary);
      router.refresh();
    });

  const upload = async (f: File | undefined) => {
    if (!f) return;
    run(await f.text(), f.name);
    if (file.current) file.current.value = "";
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button className="o-btn o-btn-primary" disabled={pending} onClick={() => run(null, "sample")}>
          {pending ? "Importing…" : "Import sample October list"}
        </button>
        <label className={`o-btn ${pending ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
          Upload CSV…
          <input ref={file} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      </div>
      {summary && (
        <div role="status" className="mt-3 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
          {summary.rows} staff read · {summary.added} added · {summary.updated} updated · {summary.deactivated} left
          {summary.leavers.length > 0 && <span className="block text-xs">Deactivated: {summary.leavers.join(", ")}</span>}
        </div>
      )}
    </div>
  );
}
