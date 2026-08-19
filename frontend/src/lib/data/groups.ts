import "server-only";

import { authedFetch } from "@/lib/server-api";
import type {
  BalanceEntryResponse,
  ExpenseResponse,
  GroupBalancesResponse,
  GroupResponse,
  PageResponse,
  SettlementResponse,
} from "@/lib/types";

/**
 * Read-side calls onto group-service and expense-service, for use from Server
 * Components only (see the `server-only` import). Each function returns the parsed
 * gateway result directly rather than throwing — a Server Component decides for
 * itself whether a failed read means "show an empty state" or "call notFound()",
 * which a thrown exception would take out of its hands.
 */

export const getMyGroups = () => authedFetch<GroupResponse[]>("/api/v1/groups/me");

export const getGroup = (groupId: string) =>
  authedFetch<GroupResponse>(`/api/v1/groups/${groupId}`);

export const getGroupBalances = (groupId: string) =>
  authedFetch<GroupBalancesResponse>(`/api/v1/groups/${groupId}/balances`);

export const getGroupEntries = (groupId: string, page = 0, size = 20) =>
  authedFetch<PageResponse<BalanceEntryResponse>>(
    `/api/v1/groups/${groupId}/entries?page=${page}&size=${size}`,
  );

export const getGroupExpenses = (groupId: string, page = 0, size = 20) =>
  authedFetch<PageResponse<ExpenseResponse>>(
    `/api/v1/expenses/groups/${groupId}?page=${page}&size=${size}`,
  );

export const getGroupSettlements = (groupId: string, page = 0, size = 20) =>
  authedFetch<PageResponse<SettlementResponse>>(
    `/api/v1/settlements/groups/${groupId}?page=${page}&size=${size}`,
  );
