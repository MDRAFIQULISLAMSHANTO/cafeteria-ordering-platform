"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLive } from "./live";

type Msg = { id: string; orderId: string; text: string; createdAt: string };

const seenKey = (who: string) => `sts-bell-seen-${who}`;
const pushedKey = (who: string) => `sts-bell-pushed-${who}`;
const read = (k: string) => { try { return Number(localStorage.getItem(k) ?? 0); } catch { return 0; } };
const write = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch {} };

const noop = () => () => {};
function usePermission() {
  return useSyncExternalStore(noop, () => ("Notification" in window ? Notification.permission : "unsupported"), () => "default");
}

/**
 * In-app notifications plus browser push while the app is open (sandbox).
 * C8 §11 asks for push, SMS and live status; real push needs a service
 * worker and the delivery channel STS chooses — this shows the experience.
 */
export function NotificationBell({ who }: { who: string }) {
  const { data } = useLive<{ messages: Msg[] }>("/api/me/notifications", 4000);
  const [open, setOpen] = useState(false);
  // messages load after mount, so reading the saved value here can't mismatch the server render
  const [seen, setSeen] = useState(() => (typeof window === "undefined" ? 0 : read(seenKey(who))));
  const permission = usePermission();
  const [, force] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const messages = useMemo(() => data?.messages ?? [], [data]);

  // browser push for messages newer than the last one pushed
  useEffect(() => {
    if (!messages.length || permission !== "granted") return;
    const last = read(pushedKey(who));
    const fresh = messages.filter((m) => new Date(m.createdAt).getTime() > last);
    if (last > 0) for (const m of fresh.slice(0, 3).reverse()) new Notification("S Cafe", { body: m.text.replace(/^STS:\s*/, ""), tag: m.id });
    write(pushedKey(who), new Date(messages[0].createdAt).getTime());
  }, [messages, permission, who]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const unread = messages.filter((m) => new Date(m.createdAt).getTime() > seen).length;

  const toggle = () => {
    if (!open && messages.length) {
      const t = new Date(messages[0].createdAt).getTime();
      write(seenKey(who), t);
      setSeen(t);
    }
    setOpen((o) => !o);
  };

  const enablePush = async () => {
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
    if (messages.length) write(pushedKey(who), new Date(messages[0].createdAt).getTime());
    force((n) => n + 1);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
        className="relative grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-3"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-sts-orange px-1 text-2xs font-bold text-sts-ink">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-full z-60 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface text-ink shadow-o-pop">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <b className="text-sm">Notifications</b>
            <span className="pill-sandbox">sandbox</span>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {messages.length === 0 && <li className="px-3 py-4 text-sm text-muted">Order updates appear here and as SMS.</li>}
            {messages.map((m) => (
              <li key={m.id} className="border-b border-line last:border-b-0">
                <Link href={`/orders/${m.orderId}`} onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm text-ink hover:bg-surface-2 hover:no-underline">
                  {m.text.replace(/^STS:\s*/, "")}
                  <small className="mt-0.5 block text-2xs text-muted">{new Date(m.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-line bg-surface-2 px-3 py-2 text-xs text-muted">
            {permission === "granted" ? (
              "Browser push is on for this device (sandbox, while the app is open)."
            ) : permission === "denied" ? (
              "Browser notifications are blocked in this browser's settings."
            ) : permission === "unsupported" ? (
              "This browser doesn't support notifications."
            ) : (
              <button className="font-semibold text-so-price" onClick={enablePush}>Turn on push notifications (sandbox)</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
