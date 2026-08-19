import { NextResponse } from "next/server";
import { performRefresh } from "@/lib/server-api";

/**
 * Standalone refresh endpoint. Not called by lib/api.ts under normal use —
 * `authedFetch` in lib/server-api.ts already refreshes automatically on a
 * 401 from any proxied call. Exposed as its own route per the spec, and
 * usable for an explicit "keep my session alive" ping if ever needed.
 */
export async function POST() {
  const ok = await performRefresh();
  if (!ok) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 401,
        error: "Unauthorized",
        message: "Session could not be refreshed. Please sign in again.",
        path: "/api/auth/refresh",
      },
      { status: 401 },
    );
  }
  return new NextResponse(null, { status: 204 });
}
