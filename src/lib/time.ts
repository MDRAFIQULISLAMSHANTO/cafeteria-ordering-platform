// Time for the prototype. Every business rule reads "now" through the demo
// clock (real time + an offset the presenter can move), and every date/time
// is Asia/Dhaka (UTC+6, no daylight saving).
export const TZ = "Asia/Dhaka";
const OFFSET = "+06:00";

export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export function dhakaDate(ms: number): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
}

export function dhakaTime(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ms);
}

export function at(date: string, time: string): number {
  return Date.parse(`${date}T${time}:00${OFFSET}`);
}

export function addDays(date: string, days: number): string {
  return dhakaDate(at(date, "12:00") + days * 86_400_000);
}

export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[new Date(at(date, "12:00")).getUTCDay()];
}

export function daysBetween(from: string, to: string): number {
  return Math.round((at(to, "12:00") - at(from, "12:00")) / 86_400_000);
}

export function formatDay(date: string, today: string): string {
  const d = daysBetween(today, date);
  const label = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(at(date, "12:00"));
  if (d === 0) return `Today · ${label}`;
  if (d === 1) return `Tomorrow · ${label}`;
  return label;
}

export function formatClock(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h12",
  }).format(ms);
}

export function time12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}
