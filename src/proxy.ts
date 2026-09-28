import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, DEMO_COOKIE_MAX_AGE, demoKey, demoToken, hasDemoAccess, openWithoutKey } from "@/lib/demo-access";

// Optimistic gate for the staff and demo screens and their live APIs. The
// server actions behind these screens re-check access themselves
// (requireDemoAccess), because actions can be posted to any path.
export async function proxy(req: NextRequest) {
  const key = demoKey();
  const isApi = req.nextUrl.pathname.startsWith("/api/");

  if (!key && openWithoutKey()) return NextResponse.next();

  // Server Action posts authorise themselves (requireDemoAccess / customer
  // session) and answer with a refusal that names the rule; blocking them
  // here would only turn that into a silent failure on screen.
  if (req.method === "POST" && req.headers.has("next-action")) return NextResponse.next();

  // ?key=… grants presenter access, then drops the key from the address bar
  const given = req.nextUrl.searchParams.get("key");
  if (key && given !== null) {
    if (given === key) {
      const clean = req.nextUrl.clone();
      clean.searchParams.delete("key");
      const res = NextResponse.redirect(clean);
      res.cookies.set(DEMO_COOKIE, await demoToken(key), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: DEMO_COOKIE_MAX_AGE,
      });
      return res;
    }
  }

  if (await hasDemoAccess(req.cookies.get(DEMO_COOKIE)?.value)) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: "Presenter access required" }, { status: 401 });
  const message = key
    ? "This is a staff / presenter screen. Open the link you were given (it ends in ?key=…)."
    : "Staff screens are disabled: DEMO_KEY is not configured on this deployment.";
  return new NextResponse(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Presenter access</title>` +
      `<body style="font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0">` +
      `<div style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:20px">Presenter access required</h1>` +
      `<p>${message}</p><p><a href="/">Go to ordering</a></p></div></body>`,
    { status: key ? 401 : 503, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const config = {
  matcher: [
    "/demo",
    "/kds",
    "/counter",
    "/status",
    "/admin",
    "/api/live/kitchen",
    "/api/live/counter",
    "/api/live/status",
    "/api/live/inbox",
  ],
};
