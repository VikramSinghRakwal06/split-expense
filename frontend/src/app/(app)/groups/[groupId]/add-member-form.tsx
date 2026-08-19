"use client";

import { useActionState } from "react";
import { addMemberAction } from "@/lib/actions/groups";
import { IDLE_STATE } from "@/lib/actions/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AddMemberForm({ groupId }: { groupId: string }) {
  const boundAction = addMemberAction.bind(null, groupId);
  const [state, formAction, pending] = useActionState(boundAction, IDLE_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.status === "error" && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{state.message}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Input
          name="identifier"
          placeholder="Their account id or email"
          required
          aria-invalid={!!state.fieldErrors?.identifier}
          className="text-sm"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        They need a SplitExpense account already — paste either their account id or the
        email they registered with.
      </p>
    </form>
  );
}
