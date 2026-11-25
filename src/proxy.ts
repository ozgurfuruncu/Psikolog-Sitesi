import { NextResponse, type NextRequest } from "next/server";
import { isIsolatedTest } from "./lib/env";

export function proxy(request: NextRequest) {
  if (
    process.env.NODE_ENV !== "production" ||
    isIsolatedTest() ||
    request.nextUrl.pathname === "/api/health"
  )
    return NextResponse.next();
  const canonical = new URL(process.env.APP_URL!);
  const host = request.headers.get("host");
  // Only Render's managed ingress may supply proxy headers; do not enable arbitrary auth proxies.
  const protocol =
    process.env.RENDER === "true"
      ? request.headers.get("x-forwarded-proto")
      : request.nextUrl.protocol.replace(":", "");
  if (host !== canonical.host || protocol !== "https") {
    if (!["GET", "HEAD"].includes(request.method))
      return Response.json({ error: "Güvenli site adresinden tekrar deneyin." }, { status: 400 });
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname + request.nextUrl.search, canonical),
      308,
    );
  }
  return NextResponse.next();
}
