"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="hidden min-h-10 items-center rounded-full px-4 text-sm font-bold text-sts-purple hover:bg-sts-purple-soft sm:inline-flex">
      Print / PDF
    </button>
  );
}
