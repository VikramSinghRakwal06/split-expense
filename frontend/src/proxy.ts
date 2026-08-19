import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE } from "@/lib/server-api";

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (same
// runtime behaviour, new name/export) — see AGENTS.md.

const PROTECTED_ROUTES = ["/groups", "/notifications"];
const AUTH_ROUTES = ["/login", "/register"];

/**
 * Optimistic auth check only: presence of the session cookie, nothing more.
 * It cannot verify the JWT itself (that requires the shared signing secret,
 * which this app never holds) — the gateway and every downstream service
 * re-verify the token independently on every request regardless. This just
 * saves a round trip for the common case of "not signed in at all".
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isSignedIn = request.cookies.has(ACCESS_COOKIE);

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (isProtected && !isSignedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);
  if (isAuthRoute && isSignedIn) {
    return NextResponse.redirect(new URL("/groups", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/groups/:path*", "/notifications/:path*", "/login", "/register"],
};
