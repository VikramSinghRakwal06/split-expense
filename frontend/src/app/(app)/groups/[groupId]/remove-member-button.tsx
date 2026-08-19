"use client";

import { useActionState } from "react";
import { removeMemberAction } from "@/lib/actions/groups";
import { IDLE_STATE } from "@/lib/actions/state";
import { Button } from "@/components/ui/button";

export function RemoveMemberButton({
  groupId,
  userId,
  label,
}: {
  groupId: string;
  userId: string;
  label: string;
}) {
  const boundAction = removeMemberAction.bind(null, groupId, userId);
  const [state, formAction, pending] = useActionState(boundAction, IDLE_STATE);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Button type="submit" variant="ghost" size="xs" disabled={pending}>
        {pending ? "…" : label}
      </Button>
      {state.status === "error" && (
        <span className="text-xs text-destructive">{state.message}</span>
      )}
    </form>
  );
}
