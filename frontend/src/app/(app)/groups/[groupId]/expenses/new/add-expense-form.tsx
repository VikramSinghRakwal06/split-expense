"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { createExpenseAction } from "@/lib/actions/expenses";
import { IDLE_STATE } from "@/lib/actions/state";
import type { GroupMemberResponse, SplitType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SPLIT_TYPES: { value: SplitType; label: string; hint: string }[] = [
  { value: "EQUAL", label: "Equal", hint: "Split evenly between everyone selected." },
  { value: "EXACT", label: "Exact", hint: "State exactly what each person owes; must add up to the total." },
  { value: "PERCENTAGE", label: "Percentage", hint: "State each person's share as a percentage; must add up to 100." },
  { value: "SHARES", label: "Shares", hint: "State each person's weight as a whole number, e.g. 2 and 1 for a 2:1 split." },
];

function valueLabelFor(splitType: SplitType): string | null {
  switch (splitType) {
    case "EXACT":
      return "Amount";
    case "PERCENTAGE":
      return "Percent";
    case "SHARES":
      return "Shares";
    case "EQUAL":
      return null;
  }
}

/** "You" for the caller, their real name when it resolved, the id shortened otherwise —
 *  see MemberLabel on the group detail page for the identical three-way fallback. */
function displayName(userId: string, defaultPayerId: string | undefined, names: Map<string, string>) {
  if (userId === defaultPayerId) return "You";
  return names.get(userId) ?? userId.slice(0, 8);
}

export function AddExpenseForm({
  groupId,
  members,
  currency,
  defaultPayerId,
  names,
}: {
  groupId: string;
  members: GroupMemberResponse[];
  currency: string;
  defaultPayerId?: string;
  names: Map<string, string>;
}) {
  const boundAction = createExpenseAction.bind(null, groupId);
  const [state, formAction, pending] = useActionState(boundAction, IDLE_STATE);

  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(members.map((m) => m.userId)),
  );

  const valueLabel = useMemo(() => valueLabelFor(splitType), [splitType]);

  function toggle(userId: string, checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payerUserId">Paid by</Label>
          <select
            id="payerUserId"
            name="payerUserId"
            defaultValue={defaultPayerId ?? members[0]?.userId}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {displayName(m.userId, defaultPayerId, names)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Amount ({currency})</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            aria-invalid={!!state.fieldErrors?.amount}
          />
          {state.fieldErrors?.amount && (
            <p className="text-sm text-destructive">{state.fieldErrors.amount}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          placeholder="Dinner at Toit"
          required
          aria-invalid={!!state.fieldErrors?.description}
        />
        {state.fieldErrors?.description && (
          <p className="text-sm text-destructive">{state.fieldErrors.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Split type</Label>
        <Tabs value={splitType} onValueChange={(v) => setSplitType(v as SplitType)}>
          <TabsList className="w-full">
            {SPLIT_TYPES.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <input type="hidden" name="splitType" value={splitType} />
        <p className="text-xs text-muted-foreground">
          {SPLIT_TYPES.find((t) => t.value === splitType)?.hint}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Participants</Label>
        {state.fieldErrors?.participants && (
          <p className="text-sm text-destructive">{state.fieldErrors.participants}</p>
        )}
        <div className="flex flex-col divide-y rounded-lg border">
          {members.map((member) => {
            const checked = checkedIds.has(member.userId);
            return (
              <div key={member.userId} className="flex items-center gap-3 px-3 py-2">
                <Checkbox
                  name={checked ? "participantUserId" : undefined}
                  value={member.userId}
                  checked={checked}
                  onCheckedChange={(v) => toggle(member.userId, v === true)}
                  id={`participant-${member.userId}`}
                />
                <Label htmlFor={`participant-${member.userId}`} className="flex-1 font-normal">
                  {displayName(member.userId, defaultPayerId, names)}
                </Label>
                {checked && valueLabel && (
                  <Input
                    name="participantValue"
                    type="number"
                    step="0.01"
                    placeholder={valueLabel}
                    className="h-7 w-24 text-sm"
                    required
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Recording…" : "Add expense"}
      </Button>
    </form>
  );
}
