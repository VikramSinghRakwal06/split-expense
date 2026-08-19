"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/server-api";
import type { ActionState } from "@/lib/actions/state";
import type { MarkAllReadResponse, NotificationResponse } from "@/lib/types";

export async function markNotificationReadAction(
  notificationId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const result = await authedFetch<NotificationResponse>(
    `/api/v1/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );

  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }

  revalidatePath("/notifications");
  return { status: "idle" };
}

export async function markAllNotificationsReadAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const result = await authedFetch<MarkAllReadResponse>("/api/v1/notifications/me/read-all", {
    method: "PATCH",
  });

  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }

  revalidatePath("/notifications");
  return { status: "idle" };
}
