/**
 * The client-side API module — deliberately small now. Reads and mutations for
 * groups, expenses, settlements and notifications run as Server Components and
 * Server Actions (see lib/data/** and lib/actions/**) instead of round-tripping
 * through a client fetch and a same-origin proxy route, so this module is left
 * with only what a genuinely client-side concern still needs:
 *
 *   - auth (login/register/logout must run before any protected Server Component
 *     renders, and set httpOnly cookies a Server Action can't originate from a
 *     pre-navigation form)
 *   - the nav bar's unread-notification badge, which polls on every client-side
 *     navigation and is exactly the "non-mutating request from a Client
 *     Component" case Next's own Server Actions guide carves out for a Route
 *     Handler rather than an action.
 *
 * Every function here can throw ApiError. Callers are expected to catch it and
 * show `error.message` (and `error.validationErrors` on forms) — there is no
 * silent failure path.
 */

import type {
  ErrorResponse,
  LoginRequest,
  RegisterRequest,
  UnreadCountResponse,
  UserResponse,
} from "@/lib/types";

export class ApiError extends Error {
  readonly status: number;
  readonly error: string;
  readonly validationErrors?: Record<string, string>;

  constructor(body: ErrorResponse) {
    super(body.message);
    this.name = "ApiError";
    this.status = body.status;
    this.error = body.error;
    this.validationErrors = body.validationErrors;
  }
}

/**
 * Applies a failed request's field-level validation errors (if any) onto a
 * react-hook-form instance via `setError`, and returns the message to show
 * as the form's general error banner. Forms call this from their catch block
 * so there is one place that knows how to turn an ApiError into UI state.
 */
export function applyValidationErrors(
  error: unknown,
  setFieldError: (field: string, message: string) => void,
): string {
  if (error instanceof ApiError) {
    if (error.validationErrors) {
      for (const [field, message] of Object.entries(error.validationErrors)) {
        setFieldError(field, message);
      }
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    // Network failure (offline, DNS, connection refused) never reaches the
    // backend at all, so there is no ErrorResponse body to parse.
    throw new ApiError({
      timestamp: new Date().toISOString(),
      status: 0,
      error: "Network Error",
      message: "Could not reach the server. Check your connection and try again.",
      path,
    });
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const body = await safeParseError(res, path);

    // Our route handler already tried a refresh-and-retry once (see
    // lib/server-api.ts) before giving up with 401, so a 401 reaching this
    // point means the session is unrecoverable client-side. Centralising the
    // redirect here means individual pages never have to remember to do it.
    // A hard navigation (not next/navigation's router) is deliberate: this
    // runs outside any component, and a full reload guarantees all
    // in-memory client state from the dead session is dropped too.
    if (res.status === 401 && typeof window !== "undefined") {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation, see comment above
      window.location.href = "/login";
    }

    throw new ApiError(body);
  }

  return (await res.json()) as T;
}

async function safeParseError(res: Response, path: string): Promise<ErrorResponse> {
  try {
    return (await res.json()) as ErrorResponse;
  } catch {
    return {
      timestamp: new Date().toISOString(),
      status: res.status,
      error: res.statusText || "Error",
      message: "Something went wrong. Please try again.",
      path,
    };
  }
}

// ---- auth -----------------------------------------------------------

export function login(body: LoginRequest): Promise<UserResponse> {
  return request<UserResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function register(body: RegisterRequest): Promise<UserResponse> {
  return request<UserResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function logout(): Promise<void> {
  return request<void>("/api/auth/logout", { method: "POST" });
}

// ---- notifications -----------------------------------------------------------

export function getUnreadCount(): Promise<UnreadCountResponse> {
  return request<UnreadCountResponse>("/api/notifications/unread-count");
}
