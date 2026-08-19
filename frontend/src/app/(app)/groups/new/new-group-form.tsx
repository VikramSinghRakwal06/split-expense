"use client";

import { useActionState } from "react";
import { createGroupAction } from "@/lib/actions/groups";
import { IDLE_STATE } from "@/lib/actions/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * A plain `<form action={...}>` bound to a Server Action, with `useActionState`
 * supplying the pending flag and the last returned {@link ActionState} — no
 * client-side fetch, no manually-tracked `submitting` boolean. On success the
 * action itself redirects, so there is no success branch to render here.
 */
export function NewGroupForm() {
  const [state, formAction, pending] = useActionState(createGroupAction, IDLE_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Goa Trip 2026"
          required
          aria-invalid={!!state.fieldErrors?.name}
        />
        {state.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" placeholder="Flights, hotel and food" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currency">Currency</Label>
        <Input
          id="currency"
          name="currency"
          placeholder="INR"
          maxLength={3}
          className="uppercase"
          aria-invalid={!!state.fieldErrors?.currency}
        />
        <p className="text-xs text-muted-foreground">
          Three-letter ISO code, e.g. INR or USD. Defaults to INR if left blank, and every
          expense in this group will use it — it can&apos;t be changed once set.
        </p>
        {state.fieldErrors?.currency && (
          <p className="text-sm text-destructive">{state.fieldErrors.currency}</p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Creating…" : "Create group"}
      </Button>
    </form>
  );
}
