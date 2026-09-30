"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

// A refusal names the rule it enforces — that is what makes the prototype
// useful in a requirements review.
type Toast = { id: number; title: string; rule?: string; tone: "danger" | "info" };
type Ctx = { show: (t: Omit<Toast, "id">) => void };

const ToastCtx = createContext<Ctx>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((cur) => [...cur.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), t.tone === "danger" ? 6000 : 2500);
  }, []);
  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {/* bottom-right: the demo guide button lives bottom-left */}
      <div className="fixed bottom-24 right-4 z-90 flex max-w-[min(420px,calc(100vw-32px))] flex-col items-end gap-2 cart:bottom-4" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`o-toast static${t.tone === "danger" ? " o-toast-danger" : ""}`}>
            <div className="o-toast-title">{t.title}</div>
            {t.rule && <div className="o-hint">Rule: {t.rule}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

export type Result = { ok: true; data?: unknown } | { ok: false; error: string; rule?: string };

/** Show a toast for a failed action result; returns true when it succeeded. */
export function useResult() {
  const { show } = useToast();
  return useCallback(
    (r: Result, success?: string) => {
      if (!r.ok) {
        show({ title: r.error, rule: r.rule, tone: "danger" });
        return false;
      }
      if (success) show({ title: success, tone: "info" });
      return true;
    },
    [show],
  );
}
