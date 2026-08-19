import { notFound } from "next/navigation";
import { getCurrentUser, getDisplayNames } from "@/lib/data/auth";
import { getGroup } from "@/lib/data/groups";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddExpenseForm } from "./add-expense-form";

export async function generateMetadata({ params }: PageProps<"/groups/[groupId]/expenses/new">) {
  const { groupId } = await params;
  const group = await getGroup(groupId);
  return { title: group.ok ? `Add expense to ${group.data.name} — SplitExpense` : "Add expense" };
}

export default async function NewExpensePage({
  params,
}: PageProps<"/groups/[groupId]/expenses/new">) {
  const { groupId } = await params;
  const [groupResult, meResult] = await Promise.all([getGroup(groupId), getCurrentUser()]);

  if (!groupResult.ok) {
    notFound();
  }
  const group = groupResult.data;
  const me = meResult.ok ? meResult.data : null;
  const names = await getDisplayNames(group.members.map((m) => m.userId));

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add expense</h1>
        <p className="text-sm text-muted-foreground">to {group.name}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense details</CardTitle>
          <CardDescription>Choose who paid, the total, and how it&apos;s split.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddExpenseForm
            groupId={groupId}
            members={group.members}
            currency={group.currency}
            defaultPayerId={me?.id}
            names={names}
          />
        </CardContent>
      </Card>
    </div>
  );
}
