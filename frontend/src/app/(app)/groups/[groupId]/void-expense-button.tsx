"use client";

import { useActionState } from "react";
import { voidExpenseAction } from "@/lib/actions/expenses";
import { IDLE_STATE } from "@/lib/actions/state";
import { Button } from "@/components/ui/button";

export function VoidExpenseButton({ groupId, expenseId }: { groupId: string; expenseId: string }) {
  const boundAction = voidExpenseAction.bind(null, groupId, expenseId);
  const [state, formAction, pending] = useActionState(boundAction, IDLE_STATE);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Button type="submit" variant="ghost" size="xs" disabled={pending}>
        {pending ? "Voiding…" : "Void"}
      </Button>
      {state.status === "error" && (
        <span className="text-xs text-destructive">{state.message}</span>
      )}
    </form>
  );
}
