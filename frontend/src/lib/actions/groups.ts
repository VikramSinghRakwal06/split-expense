"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/server-api";
import type { ActionState } from "@/lib/actions/state";
import type { GroupResponse, PublicProfileResponse } from "@/lib/types";

/**
 * Creates a group and redirects to its detail page.
 *
 * The idempotency discussion that applies to expenses and settlements below does
 * not apply here: group-service's `POST /groups` has no `Idempotency-Key` header of
 * its own (there is no debt graph yet for a duplicate call to double-apply against),
 * so a genuine double-submit simply creates two groups. The submit button's
 * `useActionState` pending state is what guards against that in practice.
 */
export async function createGroupAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  // Uppercased here rather than relying on the input's visual text-transform,
  // which only changes how the value is *displayed* — group-service's own
  // validation is a strict ^[A-Z]{3}$ and would otherwise reject "inr" as
  // invalid even though it's exactly what the field showed the user.
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();

  if (!name) {
    return { status: "error", message: "Name is required", fieldErrors: { name: "Name is required" } };
  }

  const result = await authedFetch<GroupResponse>("/api/v1/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      description: description || undefined,
      currency: currency || undefined,
    }),
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.error.message,
      fieldErrors: result.error.validationErrors,
    };
  }

  revalidatePath("/groups");
  redirect(`/groups/${result.data.id}`);
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Adds a member to a group, accepting either their account id or their email in the
 * same field.
 *
 * `POST /groups/{id}/members` itself only ever takes an id — group-service has no
 * notion of email at all, that's auth-service's domain. A value that already looks
 * like a UUID is sent through as-is; anything else is resolved to an id first via
 * auth-service's `GET /auth/users/lookup`. Either way the person adding a member
 * chooses whichever they happen to have on hand.
 */
export async function addMemberAction(
  groupId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const identifier = String(formData.get("identifier") ?? "").trim();

  if (!identifier) {
    return {
      status: "error",
      message: "Enter their account id or email",
      fieldErrors: { identifier: "Enter their account id or email" },
    };
  }

  let userId: string;
  if (UUID_PATTERN.test(identifier)) {
    userId = identifier;
  } else {
    const lookup = await authedFetch<PublicProfileResponse>(
      `/api/v1/auth/users/lookup?email=${encodeURIComponent(identifier)}`,
    );

    if (!lookup.ok) {
      const message =
        lookup.status === 404
          ? "No SplitExpense account matches that id or email."
          : lookup.error.message;
      return { status: "error", message, fieldErrors: { identifier: message } };
    }
    userId = lookup.data.id;
  }

  const result = await authedFetch(`/api/v1/groups/${groupId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.error.message,
      fieldErrors: result.error.validationErrors,
    };
  }

  revalidatePath(`/groups/${groupId}`);
  return { status: "idle" };
}

/**
 * Archives a group. Owner only; group-service refuses with a 409 while any
 * balance in the group is still unsettled, surfaced verbatim via `message`.
 */
export async function archiveGroupAction(
  groupId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const result = await authedFetch(`/api/v1/groups/${groupId}:archive`, { method: "POST" });

  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  return { status: "idle" };
}

/** Reactivates an archived group. Owner only. */
export async function reactivateGroupAction(
  groupId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const result = await authedFetch(`/api/v1/groups/${groupId}:reactivate`, { method: "POST" });

  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  return { status: "idle" };
}

/**
 * Removes a member, provided they have settled up — group-service refuses
 * otherwise with a 409 that {@link ActionState}'s `message` surfaces verbatim.
 * `groupId`/`userId` are bound by the caller; the trailing (prevState, formData)
 * pair is `useActionState`'s own calling convention for a zero-field form.
 */
export async function removeMemberAction(
  groupId: string,
  userId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const result = await authedFetch(`/api/v1/groups/${groupId}/members/${userId}`, {
    method: "DELETE",
  });

  if (!result.ok) {
    return { status: "error", message: result.error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { status: "idle" };
}
