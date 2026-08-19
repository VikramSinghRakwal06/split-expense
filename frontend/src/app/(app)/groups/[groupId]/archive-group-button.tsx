"use client";

import { useActionState, useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { archiveGroupAction, reactivateGroupAction } from "@/lib/actions/groups";
import { IDLE_STATE } from "@/lib/actions/state";
import { Button } from "@/components/ui/button";

/**
 * Owner-only control for freezing a group once it's wound down, or reopening
 * one archived by mistake. A short inline confirm step guards the archive
 * direction only — it's the one that can fail with a 409 (unsettled balances)
 * and the one a click shouldn't fire by accident.
 *
 * The caller must remount this component (e.g. `key={group.status}`) whenever
 * `archived` flips — `confirming` is local state, and without a remount a
 * completed archive-then-reactivate round trip would leave the confirm step
 * showing on a group that is active again.
 */
export function ArchiveGroupButton({ groupId, archived }: { groupId: string; archived: boolean }) {
  const boundAction = (archived ? reactivateGroupAction : archiveGroupAction).bind(null, groupId);
  const [state, formAction, pending] = useActionState(boundAction, IDLE_STATE);
  const [confirming, setConfirming] = useState(false);

  if (archived) {
    return (
      <form action={formAction} className="flex items-center gap-2">
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          <ArchiveRestore /> {pending ? "Reactivating…" : "Reactivate group"}
        </Button>
        {state.status === "error" && (
          <span className="text-xs text-destructive">{state.message}</span>
        )}
      </form>
    );
  }

  if (!confirming) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
        <Archive /> Archive group
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Freeze this group for everyone?</span>
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? "Archiving…" : "Confirm"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {state.status === "error" && (
        <span className="text-xs text-destructive">{state.message}</span>
      )}
    </form>
  );
}
