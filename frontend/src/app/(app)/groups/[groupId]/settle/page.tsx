import { notFound } from "next/navigation";
import { getCurrentUser, getDisplayNames } from "@/lib/data/auth";
import { getGroup, getGroupBalances } from "@/lib/data/groups";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettleForm } from "./settle-form";

export async function generateMetadata({ params }: PageProps<"/groups/[groupId]/settle">) {
  const { groupId } = await params;
  const group = await getGroup(groupId);
  return { title: group.ok ? `Settle up in ${group.data.name} — SplitExpense` : "Settle up" };
}

export default async function SettlePage({ params }: PageProps<"/groups/[groupId]/settle">) {
  const { groupId } = await params;
  const [groupResult, meResult, balancesResult] = await Promise.all([
    getGroup(groupId),
    getCurrentUser(),
    getGroupBalances(groupId),
  ]);

  if (!groupResult.ok) {
    notFound();
  }
  const group = groupResult.data;
  const me = meResult.ok ? meResult.data : null;
  const names = await getDisplayNames(group.members.map((m) => m.userId));
  // Keyed "debtorId|creditorId" -> amount, so the form can show what's actually owed
  // between whichever pair is currently selected — group-service omits settled pairs
  // entirely rather than listing them at zero, so an absent key means nothing is owed.
  const owed = new Map(
    balancesResult.ok
      ? balancesResult.data.pairs.map((p) => [`${p.debtorId}|${p.creditorId}`, p.amount])
      : [],
  );

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settle up</h1>
        <p className="text-sm text-muted-foreground">in {group.name}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record a payment</CardTitle>
          <CardDescription>
            Records that money changed hands outside SplitExpense — it doesn&apos;t move
            anything itself.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettleForm
            groupId={groupId}
            members={group.members}
            currency={group.currency}
            meId={me?.id}
            names={names}
            owed={owed}
          />
        </CardContent>
      </Card>
    </div>
  );
}
