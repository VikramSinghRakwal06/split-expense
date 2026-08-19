"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/server-api";
import type { ActionState } from "@/lib/actions/state";
import type { ExpenseResponse, SplitParticipantRequest, SplitType } from "@/lib/types";

/**
 * Records an expense.
 *
 * `Idempotency-Key` is minted fresh here, once per action invocation — the same
 * "new value per user-initiated attempt, not once per form mount" rule the
 * removed transfer page followed, and for the same reason: it protects a request
 * whose response was lost (a dropped connection between this server and the
 * gateway) from being silently retried into a second expense, while an explicit
 * second submission by the user is correctly treated as a new attempt.
 *
 * Participant rows arrive as parallel `participants[]`/`values[]` form fields
 * (one entry per checked participant) rather than as JSON, because a plain HTML
 * form can only carry flat fields — see the client form component for how they're
 * built.
 */
export async function createExpenseAction(
  groupId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const payerUserId = String(formData.get("payerUserId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const splitType = String(formData.get("splitType") ?? "") as SplitType;
  const participantIds = formData.getAll("participantUserId").map(String);
  const participantValues = formData.getAll("participantValue").map(String);

  const fieldErrors: Record<string, string> = {};
  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    fieldErrors.amount = "Enter a positive amount";
  }
  if (!description) {
    fieldErrors.description = "Description is required";
  }
  if (participantIds.length === 0) {
    fieldErrors.participants = "Select at least one participant";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Check the highlighted fields", fieldErrors };
  }

  const participants: SplitParticipantRequest[] = participantIds.map((userId, i) => {
    const raw = participantValues[i];
    const value = raw !== undefined && raw !== "" ? Number(raw) : undefined;
    return { userId, value };
  });

  const result = await authedFetch<ExpenseResponse>("/api/v1/expenses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({ groupId, payerUserId, amount, description, splitType, participants }),
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

/**
 * Voids a completed expense — applies the exact inverse of its original deltas.
 * Only the payer or a participant may do this; group-service enforces it, this
 * action just surfaces the 403/409 it can return.
 */
export async function voidExpenseAction(
  groupId: string,
  expenseId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const result = await authedFetch<ExpenseResponse>(`/api/v1/expenses/${expenseId}/void`, {
    method: "POST",
    headers: { "Idempotency-Key": randomUUID() },
  });

  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { status: "idle" };
}
