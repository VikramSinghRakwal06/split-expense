"use client";

import { useActionState } from "react";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { IDLE_STATE } from "@/lib/actions/state";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const [state, formAction, pending] = useActionState(markAllNotificationsReadAction, IDLE_STATE);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Marking…" : "Mark all read"}
      </Button>
      {state.status === "error" && (
        <span className="text-xs text-destructive">{state.message}</span>
      )}
    </form>
  );
}
