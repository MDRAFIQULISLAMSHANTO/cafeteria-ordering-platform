# STS Café — online ordering prototype

A working prototype of STS Group's online cafeteria ordering: customers order
on the web or a phone, pay (sandbox), the kitchen display picks the order up,
staff hand it over after a QR + name check, and a pickup TV shows ready numbers.

**Prototype only.** Payment, SMS and the HR staff list are simulated and marked
*sandbox* on screen. The production system is planned on Odoo; this app is
shaped like Odoo's POS self-order / kitchen display so it can be pointed at Odoo
later.

## Screens

| Route | Who | What |
|---|---|---|
| `/` | Customer | Landing |
| `/login`, `/register` | Customer | Mobile OTP sign-in; parent/student registration; staff are recognised from the HR list |
| `/order` | Customer (web + phone) | Campus menu, pickup day (≤ 7 days) and slot, cart, VAT/discount, checkout |
| `/pay/[id]` | Customer | Sandbox payment (bKash / Nagad / card, success or failure) |
| `/orders`, `/orders/[id]` | Customer | My Orders, live tracking, QR, cancel before cut-off, receipt |
| `/kds?outlet=` | Kitchen | To cook → Preparing → Ready, late timer, recall, reject with reason |
| `/counter?outlet=` | Counter | Accept pay-at-counter orders; collect by QR or number + name check |
| `/status?outlet=` | Pickup TV | Preparing / Ready numbers (no names) |
| `/admin?outlet=` | Supervisor | Sold-out switches, today's orders, pre-order production list |
| `/demo` | Presenter | Links, demo logins, demo clock, reset, sandbox SMS inbox |

Demo logins: `01700000001` parent · `01700000002` student · `01700000003`
employee (Parent Lounge, 20% off, VAT-free) · `01700000004` coordinator. OTP
`123456`.

## Business rules

All rules live in `src/lib/orders.ts` and `src/lib/rules.ts`; screens never
write tables directly. Each refusal names the rule it enforces. Assumptions
awaiting STS confirmation (cut-offs, VAT-inclusive prices, sample slots, the
menu→outlet assignment) are labelled *pending* in the UI.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 on the Odoo 19/20 design
tokens (`src/styles/tokens.css`, `odoo19.css`) · Drizzle ORM · Postgres
(Supabase in the cloud, PGlite locally) · Vercel.

## Run locally

```bash
pnpm install
pnpm dev            # http://localhost:3000 — embedded database, auto-seeded
```

Open `/demo` for everything else. Delete `./.data` to start from scratch, or use
**Reset** on `/demo`.

## Supabase + Vercel

1. Set `DATABASE_URL` (Supabase transaction-pooler URI, port 6543),
   `SESSION_SECRET` and `DEMO_KEY` — see `.env.example`.
2. `pnpm db:migrate` applies `./drizzle` (already applied to the
   `sts-online-ordering-demo` project).
3. Deploy to Vercel with the same three environment variables. The first request
   seeds the demo data.

Row-level security is on for every table with no policies: only the app's own
server connection can read or write.

## Presenter access

Staff and demo screens (`/demo`, `/kds`, `/counter`, `/status`, `/admin`), their
live APIs, the sandbox SMS inbox and all staff/demo actions require the
`DEMO_KEY`. Open any of them once as `/demo?key=<DEMO_KEY>`; the key is swapped
for a 30-day httpOnly cookie. Without `DEMO_KEY` they are open in development
and **closed in production**. The inbox shows OTP codes, so never deploy it
ungated.
