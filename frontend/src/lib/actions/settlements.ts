"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/server-api";
import type { ActionState } from "@/lib/actions/state";
import type { SettlementResponse } from "@/lib/types";

/**
 * Records a settlement. See `createExpenseAction` in `lib/actions/expenses.ts` for
 * why the Idempotency-Key is minted fresh per invocation rather than once per form
 * mount.
 */
export async function recordSettlementAction(
  groupId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fromUserId = String(formData.get("fromUserId") ?? "");
  const toUserId = String(formData.get("toUserId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    fieldErrors.amount = "Enter a positive amount";
  }
  if (!fromUserId || !toUserId) {
    fieldErrors.toUserId = "Choose who paid whom";
  } else if (fromUserId === toUserId) {
    fieldErrors.toUserId = "Cannot settle with yourself";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Check the highlighted fields", fieldErrors };
  }

  const result = await authedFetch<SettlementResponse>("/api/v1/settlements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({ groupId, fromUserId, toUserId, amount, note: note || undefined }),
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.error.message,
      fieldErrors: result.error.validationErrors,
    };
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}
