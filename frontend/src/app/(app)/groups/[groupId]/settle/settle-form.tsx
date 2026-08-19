"use client";

import { useActionState, useMemo, useState } from "react";
import { recordSettlementAction } from "@/lib/actions/settlements";
import { IDLE_STATE } from "@/lib/actions/state";
import type { GroupMemberResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatMoney } from "@/lib/format";

/** "You" for the caller, their real name when it resolved, the id shortened otherwise —
 *  see MemberLabel on the group detail page for the identical three-way fallback. */
function displayName(userId: string, meId: string | undefined, names: Map<string, string>) {
  if (userId === meId) return "You";
  return names.get(userId) ?? userId.slice(0, 8);
}

export function SettleForm({
  groupId,
  members,
  currency,
  meId,
  names,
  owed,
}: {
  groupId: string;
  members: GroupMemberResponse[];
  currency: string;
  meId?: string;
  names: Map<string, string>;
  /** "debtorId|creditorId" -> amount currently owed; an absent key means nothing is owed. */
  owed: Map<string, number>;
}) {
  const boundAction = recordSettlementAction.bind(null, groupId);
  const [state, formAction, pending] = useActionState(boundAction, IDLE_STATE);

  const others = members.filter((m) => m.userId !== meId);
  const [fromUserId, setFromUserId] = useState(meId ?? members[0]?.userId ?? "");
  const [toUserId, setToUserId] = useState(others[0]?.userId ?? "");

  const currentlyOwed = useMemo(
    () => owed.get(`${fromUserId}|${toUserId}`) ?? 0,
    [owed, fromUserId, toUserId],
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fromUserId">Who paid</Label>
          <select
            id="fromUserId"
            name="fromUserId"
            value={fromUserId}
            onChange={(e) => setFromUserId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {displayName(m.userId, meId, names)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="toUserId">Who received it</Label>
          <select
            id="toUserId"
            name="toUserId"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-invalid={!!state.fieldErrors?.toUserId}
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {displayName(m.userId, meId, names)}
              </option>
            ))}
          </select>
          {state.fieldErrors?.toUserId && (
            <p className="text-sm text-destructive">{state.fieldErrors.toUserId}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">Amount ({currency})</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={currentlyOwed > 0 ? currentlyOwed : undefined}
          required
          aria-invalid={!!state.fieldErrors?.amount}
        />
        {state.fieldErrors?.amount ? (
          <p className="text-sm text-destructive">{state.fieldErrors.amount}</p>
        ) : currentlyOwed > 0 ? (
          <p className="text-xs text-muted-foreground">
            {displayName(fromUserId, meId, names)} currently {fromUserId === meId ? "owe" : "owes"}{" "}
            {displayName(toUserId, meId, names)} {formatMoney(currentlyOwed, currency)}.
          </p>
        ) : fromUserId && toUserId && fromUserId !== toUserId ? (
          <p className="text-xs text-destructive">
            There&apos;s no debt to settle here — {displayName(fromUserId, meId, names)}{" "}
            {fromUserId === meId ? "don't" : "doesn't"} owe{" "}
            {displayName(toUserId, meId, names)} anything.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" name="note" placeholder="Paid back via UPI" />
      </div>

      <Button type="submit" disabled={pending || currentlyOwed <= 0} className="mt-2">
        {pending ? "Recording…" : "Record settlement"}
      </Button>
    </form>
  );
}
