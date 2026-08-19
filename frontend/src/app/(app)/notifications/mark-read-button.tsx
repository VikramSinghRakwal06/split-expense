"use client";

import { useActionState } from "react";
import { markNotificationReadAction } from "@/lib/actions/notifications";
import { IDLE_STATE } from "@/lib/actions/state";
import { Button } from "@/components/ui/button";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const boundAction = markNotificationReadAction.bind(null, notificationId);
  const [, formAction, pending] = useActionState(boundAction, IDLE_STATE);

  return (
    <form action={formAction}>
      <Button type="submit" variant="ghost" size="xs" disabled={pending}>
        {pending ? "…" : "Mark read"}
      </Button>
    </form>
  );
}
