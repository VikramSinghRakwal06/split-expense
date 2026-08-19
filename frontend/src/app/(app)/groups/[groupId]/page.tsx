import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  HandCoins,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet2,
} from "lucide-react";
import { getCurrentUser, getDisplayNames } from "@/lib/data/auth";
import { getGroup, getGroupBalances, getGroupExpenses, getGroupSettlements } from "@/lib/data/groups";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExpenseStatusBadge, SettlementStatusBadge } from "@/components/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { AddMemberForm } from "./add-member-form";
import { ArchiveGroupButton } from "./archive-group-button";
import { RemoveMemberButton } from "./remove-member-button";
import { VoidExpenseButton } from "./void-expense-button";

export async function generateMetadata({ params }: PageProps<"/groups/[groupId]">) {
  const { groupId } = await params;
  const group = await getGroup(groupId);
  return { title: group.ok ? `${group.data.name} — SplitExpense` : "Group — SplitExpense" };
}

// Server Component: group, balances, current user, and the two recent-activity
// feeds are all fetched in parallel before anything renders — one round trip to
// the gateway per data source, none of them waiting on each other. Display
// names are resolved in a second wave, once the group's member list is known,
// since that's the only source of ids this page ever needs a name for.
export default async function GroupDetailPage({ params }: PageProps<"/groups/[groupId]">) {
  const { groupId } = await params;

  const [groupResult, balancesResult, meResult, expensesResult, settlementsResult] =
    await Promise.all([
      getGroup(groupId),
      getGroupBalances(groupId),
      getCurrentUser(),
      getGroupExpenses(groupId, 0, 10),
      getGroupSettlements(groupId, 0, 10),
    ]);

  // group-service returns 404 for both "no such group" and "not your group" —
  // deliberately indistinguishable; notFound() renders the same not-found UI
  // either way, which is the correct response to both cases.
  if (!groupResult.ok) {
    notFound();
  }

  const group = groupResult.data;
  const me = meResult.ok ? meResult.data : null;
  const isOwner = me ? group.members.some((m) => m.userId === me.id && m.role === "OWNER") : false;
  const names = await getDisplayNames(group.members.map((m) => m.userId));

  const myNet = balancesResult.ok
    ? balancesResult.data.netPositions.find((n) => n.userId === me?.id)?.net ?? 0
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
            {group.status === "ARCHIVED" && <Badge variant="outline">Archived</Badge>}
          </div>
          {group.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {group.status === "ACTIVE" && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/groups/${groupId}/settle`}>
                  <HandCoins /> Settle up
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href={`/groups/${groupId}/expenses/new`}>
                  <Plus /> Add expense
                </Link>
              </Button>
            </>
          )}
          {isOwner && (
            // Keyed on status so the confirm-step state resets on remount rather than
            // surviving the archived <-> active flip — see ArchiveGroupButton's own note.
            <ArchiveGroupButton
              key={group.status}
              groupId={groupId}
              archived={group.status === "ARCHIVED"}
            />
          )}
        </div>
      </div>

      {/* Your position */}
      <Card
        className={
          myNet > 0
            ? "border-success/20 bg-success/5"
            : myNet < 0
              ? "border-destructive/20 bg-destructive/5"
              : undefined
        }
      >
        <CardContent className="flex items-center gap-4 py-4">
          <span
            className={
              myNet > 0
                ? "flex size-11 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
                : myNet < 0
                  ? "flex size-11 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive"
                  : "flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
            }
          >
            {myNet > 0 ? (
              <TrendingUp className="size-5" />
            ) : myNet < 0 ? (
              <TrendingDown className="size-5" />
            ) : (
              <HandCoins className="size-5" />
            )}
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Your position in this group</p>
            <p
              className={
                myNet > 0
                  ? "text-2xl font-semibold text-success"
                  : myNet < 0
                    ? "text-2xl font-semibold text-destructive"
                    : "text-2xl font-semibold"
              }
            >
              {myNet === 0
                ? "Settled up"
                : myNet > 0
                  ? `You are owed ${formatMoney(myNet, group.currency)}`
                  : `You owe ${formatMoney(Math.abs(myNet), group.currency)}`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-0.5 py-3 text-center">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Receipt className="size-3.5" /> Expenses
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {expensesResult.ok ? expensesResult.data.totalElements : "—"}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-0.5 py-3 text-center">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet2 className="size-3.5" /> Settlements
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {settlementsResult.ok ? settlementsResult.data.totalElements : "—"}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-0.5 py-3 text-center">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" /> Members
            </span>
            <span className="text-lg font-semibold tabular-nums">{group.members.length}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Balances */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balances</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!balancesResult.ok ? (
              <p className="text-sm text-muted-foreground">
                Could not load balances: {balancesResult.error.message}
              </p>
            ) : balancesResult.data.pairs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Everyone is settled up.</p>
            ) : (
              balancesResult.data.pairs.map((pair) => (
                <div
                  key={`${pair.debtorId}-${pair.creditorId}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                    <Avatar userId={pair.debtorId} name={names.get(pair.debtorId)} size="sm" />
                    <MemberLabel userId={pair.debtorId} me={me?.id} names={names} />
                    <span>owes</span>
                    <Avatar userId={pair.creditorId} name={names.get(pair.creditorId)} size="sm" />
                    <MemberLabel userId={pair.creditorId} me={me?.id} names={names} />
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatMoney(pair.amount, group.currency)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-base">
              <Users className="size-4" /> Members ({group.members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {group.members.map((member) => (
                <li key={member.userId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Avatar userId={member.userId} name={names.get(member.userId)} />
                    <MemberLabel userId={member.userId} me={me?.id} names={names} />
                    {member.role === "OWNER" && (
                      <Badge variant="outline" className="text-[10px]">
                        Owner
                      </Badge>
                    )}
                  </span>
                  {(isOwner || member.userId === me?.id) && (
                    <RemoveMemberButton
                      groupId={groupId}
                      userId={member.userId}
                      label={member.userId === me?.id ? "Leave" : "Remove"}
                    />
                  )}
                </li>
              ))}
            </ul>
            {isOwner && (
              <>
                <Separator />
                <AddMemberForm groupId={groupId} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Receipt className="size-4" /> Recent expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!expensesResult.ok ? (
            <p className="text-sm text-muted-foreground">
              Could not load expenses: {expensesResult.error.message}
            </p>
          ) : expensesResult.data.content.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
          ) : (
            expensesResult.data.content.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3 text-sm">
                <Avatar
                  userId={expense.payerUserId}
                  name={names.get(expense.payerUserId)}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{expense.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Paid by <MemberLabel userId={expense.payerUserId} me={me?.id} names={names} /> ·{" "}
                    {formatDateTime(expense.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-medium tabular-nums">
                    {formatMoney(expense.amount, expense.currency)}
                  </span>
                  <ExpenseStatusBadge status={expense.status} />
                  {expense.status === "COMPLETED" &&
                    (expense.payerUserId === me?.id ||
                      expense.splits.some((s) => s.userId === me?.id)) && (
                      <VoidExpenseButton groupId={groupId} expenseId={expense.id} />
                    )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent settlements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <HandCoins className="size-4" /> Recent settlements
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!settlementsResult.ok ? (
            <p className="text-sm text-muted-foreground">
              Could not load settlements: {settlementsResult.error.message}
            </p>
          ) : settlementsResult.data.content.length === 0 ? (
            <p className="text-sm text-muted-foreground">No settlements recorded yet.</p>
          ) : (
            settlementsResult.data.content.map((settlement) => (
              <div key={settlement.id} className="flex items-center justify-between gap-4 text-sm">
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Avatar userId={settlement.fromUserId} name={names.get(settlement.fromUserId)} size="sm" />
                  <MemberLabel userId={settlement.fromUserId} me={me?.id} names={names} />
                  <ArrowRight className="size-3.5" />
                  <Avatar userId={settlement.toUserId} name={names.get(settlement.toUserId)} size="sm" />
                  <MemberLabel userId={settlement.toUserId} me={me?.id} names={names} />
                </p>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-medium tabular-nums">
                    {formatMoney(settlement.amount, settlement.currency)}
                  </span>
                  <SettlementStatusBadge status={settlement.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Resolves a member id to what a person actually reads as an identity: "You" for the
 * caller, their real name when auth-service's batch lookup resolved one, and the id
 * itself — shortened, so it reads as a fallback rather than a duplicated primary key —
 * only when neither applies. The three-way fallback, not the id alone, is deliberate:
 * `getDisplayNames` degrades to an empty map on its own failure (see its javadoc), and
 * this is where that degradation is absorbed rather than left to blank the page.
 */
function MemberLabel({
  userId,
  me,
  names,
}: {
  userId: string;
  me: string | undefined;
  names: Map<string, string>;
}) {
  if (userId === me) return <span className="font-medium text-foreground">You</span>;
  const name = names.get(userId);
  if (name) return <span title={userId}>{name}</span>;
  return <span title={userId}>{userId.slice(0, 8)}</span>;
}
