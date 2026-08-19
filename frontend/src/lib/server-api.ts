import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AuthResponse, ErrorResponse, UserResponse } from "@/lib/types";

/**
 * Server-only gateway client. Used exclusively by Route Handlers under
 * src/app/api/** — never imported by a Client Component (the `server-only`
 * import above makes that a build error if it ever happens by accident).
 *
 * This is the one place that reads the session cookie, attaches
 * `Authorization: Bearer <token>` and talks to the real SplitExpense gateway.
 */

export const ACCESS_COOKIE = "splitexpense_access_token";
export const REFRESH_COOKIE = "splitexpense_refresh_token";

// auth-service's default refresh-token TTL (JWT_REFRESH_TTL=7d). AuthResponse
// only reports the access token's lifetime (`expiresIn`), so the refresh
// cookie's maxAge is this fixed estimate rather than a value from the
// response. If it's wrong the cookie simply expires a bit early or late —
// the backend's own verification of the token is what actually matters for
// security, this only controls when the browser stops bothering to send it.
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function gatewayUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  return `${base}${path}`;
}

/** Result of a raw gateway call: either parsed JSON, or the parsed ErrorResponse. */
type GatewayResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ErrorResponse };

async function gatewayFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<GatewayResult<T>> {
  let res: Response;
  try {
    res = await fetch(gatewayUrl(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      status: 503,
      error: {
        timestamp: new Date().toISOString(),
        status: 503,
        error: "Service Unavailable",
        message: "Could not reach the SplitExpense API gateway.",
        path,
      },
    };
  }

  if (res.status === 204) {
    return { ok: true, status: 204, data: undefined as T };
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: (body as ErrorResponse) ?? {
        timestamp: new Date().toISOString(),
        status: res.status,
        error: res.statusText || "Error",
        message: "Something went wrong. Please try again.",
        path,
      },
    };
  }

  return { ok: true, status: res.status, data: body as T };
}

async function setAuthCookies(auth: AuthResponse): Promise<void> {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";

  store.set(ACCESS_COOKIE, auth.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: auth.expiresIn,
  });
  store.set(REFRESH_COOKIE, auth.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
}

async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

/** POST /api/v1/auth/login. Sets both cookies on success. */
export async function login(
  email: string,
  password: string,
): Promise<GatewayResult<AuthResponse>> {
  const result = await gatewayFetch<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (result.ok) await setAuthCookies(result.data);
  return result;
}

/** POST /api/v1/auth/register. Does not log the user in — no cookies set. */
export function register(body: {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}): Promise<GatewayResult<UserResponse>> {
  return gatewayFetch<UserResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Exchanges the refresh cookie for a new token pair. Called both by the
 * standalone /api/auth/refresh route and internally by `authedFetch` below
 * when a request comes back 401.
 */
export async function performRefresh(): Promise<boolean> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return false;

  const result = await gatewayFetch<AuthResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });

  if (!result.ok) {
    await clearAuthCookies();
    return false;
  }

  await setAuthCookies(result.data);
  return true;
}

/** POST /api/v1/auth/logout, then clears cookies regardless of the outcome. */
export async function logout(): Promise<void> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (accessToken && refreshToken) {
    await gatewayFetch("/api/v1/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ refreshToken }),
    });
  }

  await clearAuthCookies();
}

/**
 * Authenticated call to the gateway on behalf of the current session.
 *
 * On 401 (expired access token) it attempts exactly one refresh, then
 * retries the original request once with the new token. If there is no
 * session, or the refresh itself fails, cookies are cleared and the original
 * 401 is returned — the client-side API module (lib/api.ts) treats any 401
 * reaching the browser as "session over" and redirects to /login.
 */
export async function authedFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<GatewayResult<T>> {
  const notSignedIn = (): GatewayResult<T> => ({
    ok: false,
    status: 401,
    error: {
      timestamp: new Date().toISOString(),
      status: 401,
      error: "Unauthorized",
      message: "Not signed in.",
      path,
    },
  });

  const store = await cookies();
  let accessToken = store.get(ACCESS_COOKIE)?.value;

  // The access cookie's own Max-Age (900s) means the browser simply stops
  // sending it once it expires — this is the ordinary case of a session
  // that's been open longer than 15 minutes, not a signed-out user, so it
  // must attempt a refresh here too, not just on a 401 from the gateway
  // below (which only fires for a token that was sent but rejected).
  if (!accessToken) {
    if (!store.get(REFRESH_COOKIE)?.value) return notSignedIn();
    if (!(await performRefresh())) return notSignedIn();
    accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
    if (!accessToken) return notSignedIn();
  }

  const withAuth = (token: string): RequestInit => ({
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });

  const first = await gatewayFetch<T>(path, withAuth(accessToken));
  if (first.status !== 401) return first;

  const refreshed = await performRefresh();
  if (!refreshed) return first;

  const newToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!newToken) return first;

  return gatewayFetch<T>(path, withAuth(newToken));
}

/** Turns a GatewayResult into the NextResponse a thin proxy route returns. */
export function toResponse<T>(result: GatewayResult<T>): NextResponse {
  if (!result.ok) {
    return NextResponse.json(result.error, { status: result.status });
  }
  if (result.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(result.data, { status: result.status });
}
