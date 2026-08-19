import { authedFetch, toResponse } from "@/lib/server-api";
import type { UnreadCountResponse } from "@/lib/types";

export async function GET() {
  return toResponse(
    await authedFetch<UnreadCountResponse>("/api/v1/notifications/me/unread-count"),
  );
}
