import "server-only";

import { authedFetch } from "@/lib/server-api";
import type { NotificationResponse, PageResponse, UnreadCountResponse } from "@/lib/types";

export const getNotifications = (page = 0, size = 20) =>
  authedFetch<PageResponse<NotificationResponse>>(
    `/api/v1/notifications/me?page=${page}&size=${size}`,
  );

export const getUnreadCount = () =>
  authedFetch<UnreadCountResponse>("/api/v1/notifications/me/unread-count");
