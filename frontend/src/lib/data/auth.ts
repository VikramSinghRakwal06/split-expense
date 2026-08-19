import "server-only";

import { authedFetch } from "@/lib/server-api";
import type { PublicProfileResponse, UserResponse } from "@/lib/types";

/**
 * Who the caller is, resolved server-side from the session cookie via
 * `GET /api/v1/auth/me`. Every page that needs to know "is this me" (owner
 * controls, defaulting a payer to the current user, and so on) calls this
 * rather than trying to decode the JWT itself — the cookie is httpOnly and
 * this app never holds the shared signing secret to verify it locally anyway.
 */
export const getCurrentUser = () => authedFetch<UserResponse>("/api/v1/auth/me");

/**
 * Resolves a batch of account ids to display names, so a group's member list —
 * which is nothing but ids everywhere it crosses a service boundary — can show
 * "Priya" instead of a UUID fragment. See `PublicProfileResponse`'s javadoc on
 * the backend for why this is a separate, narrower endpoint than `getCurrentUser`.
 *
 * @param ids account ids to resolve; an empty list skips the call entirely
 * @returns a map from id to display name, missing an entry for any id that
 *          didn't resolve (a deleted account, most plausibly) — callers fall
 *          back to the id itself in that case, not to a thrown error
 */
export async function getDisplayNames(ids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) {
    return new Map();
  }

  const result = await authedFetch<PublicProfileResponse[]>(
    `/api/v1/auth/users?ids=${unique.join(",")}`,
  );

  if (!result.ok) {
    // Names are a display nicety, not load-bearing data — a failed lookup falls
    // back to showing ids rather than failing the whole page.
    return new Map();
  }

  return new Map(result.data.map((profile) => [profile.id, profile.fullName]));
}
