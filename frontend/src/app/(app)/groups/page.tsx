import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Plus, Users, Wallet } from "lucide-react";
import { getCurrentUser, getDisplayNames } from "@/lib/data/auth";
import { getGroupBalances, getMyGroups } from "@/lib/data/groups";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { GroupResponse } from "@/lib/types";

export const metadata = { title: "Your groups — SplitExpense" };

const AVATAR_STACK_LIMIT = 4;

/** Sums each group's net position for the caller by currency, since groups can
 *  use different currencies and those totals can never be collapsed into one
 *  number — see formatMoney's Intl.NumberFormat, which is currency-scoped. */
function sumByCurrency(groups: GroupResponse[], nets: number[]): Map<string, number> {
  const totals = new Map<string, number>();
  groups.forEach((group, i) => {
    const net = nets[i];
    if (net === 0) return;
    totals.set(group.currency, (totals.get(group.currency) ?? 0) + net);
  });
  return totals;
}

function formatByCurrency(totals: Map<string, number>): string {
  if (totals.size === 0) return "—";
  return Array.from(totals.entries())
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(" + ");
}

// Server Component: the group list, every group's balances, and every member's
// display name are all fetched server-side before anything renders, so the
// overview arrives as real numbers in the first response rather than a page
// of cards that only fill in after a client-side balance fetch per card.
export default async function GroupsPage() {
  const [groupsResult, meResult] = await Promise.all([getMyGroups(), getCurrentUser()]);
  const me = meResult.ok ? meResult.data : null;

  const groups = groupsResult.ok ? groupsResult.data : [];
  const balances = groups.length > 0 ? await Promise.all(groups.map((g) => getGroupBalances(g.id))) : [];
  const nets = groups.map((g, i) => {
    const result = balances[i];
    if (!result.ok) return 0;
    return result.data.netPositions.find((n) => n.userId === me?.id)?.net ?? 0;
  });

  const allMemberIds = groups.flatMap((g) => g.members.map((m) => m.userId));
  const names = await getDisplayNames(allMemberIds);

  const owed = sumByCurrency(groups, nets.map((n) => Math.max(n, 0)));
  const owe = sumByCurrency(groups, nets.map((n) => Math.max(-n, 0)));
  const settledCount = groups.filter((_, i) => nets[i] === 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your groups</h1>
          <p className="text-sm text-muted-foreground">
            Everything you share expenses on, in one place.
          </p>
        </div>
        <Button asChild>
          <Link href="/groups/new">
            <Plus /> New group
          </Link>
        </Button>
      </div>

      {!groupsResult.ok ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Could not load your groups: {groupsResult.error.message}
          </CardContent>
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="size-6" />
            </span>
            <div>
              <p className="font-medium">No groups yet</p>
              <p className="text-sm text-muted-foreground">
                Create one to start splitting expenses with people.
              </p>
            </div>
            <Button asChild size="sm" className="mt-2">
              <Link href="/groups/new">
                <Plus /> New group
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-success/20 bg-success/5">
              <CardContent className="flex items-center gap-3 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <ArrowDownRight className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">You&apos;re owed</p>
                  <p className="truncate text-lg font-semibold text-success">
                    {formatByCurrency(owed)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="flex items-center gap-3 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                  <ArrowUpRight className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">You owe</p>
                  <p className="truncate text-lg font-semibold text-destructive">
                    {formatByCurrency(owe)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <CheckCircle2 className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Settled up</p>
                  <p className="truncate text-lg font-semibold">
                    {settledCount} of {groups.length} group{groups.length === 1 ? "" : "s"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Group cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group, i) => {
              const net = nets[i];
              const balanceLoaded = balances[i]?.ok ?? false;
              const shown = group.members.slice(0, AVATAR_STACK_LIMIT);
              const overflow = group.members.length - shown.length;

              return (
                <Link key={group.id} href={`/groups/${group.id}`}>
                  <Card className="flex h-full flex-col transition-colors hover:border-primary/40 hover:bg-accent/40">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <CardTitle className="truncate text-base">{group.name}</CardTitle>
                          {group.status === "ARCHIVED" && (
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              Archived
                            </Badge>
                          )}
                        </div>
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Wallet className="size-4" />
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3 text-sm text-muted-foreground">
                      {group.description && <p className="line-clamp-2">{group.description}</p>}

                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-1.5">
                          {shown.map((m) => (
                            <Avatar
                              key={m.userId}
                              userId={m.userId}
                              name={names.get(m.userId)}
                              className="ring-2 ring-card"
                            />
                          ))}
                          {overflow > 0 && (
                            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
                              +{overflow}
                            </span>
                          )}
                        </div>
                        <span className="text-xs">
                          {group.members.length} member{group.members.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t pt-3">
                        <span className="text-xs">Created {formatDateTime(group.createdAt)}</span>
                        {balanceLoaded &&
                          (net === 0 ? (
                            <span className="text-xs font-medium">Settled up</span>
                          ) : (
                            <span
                              className={
                                net > 0
                                  ? "text-xs font-semibold text-success"
                                  : "text-xs font-semibold text-destructive"
                              }
                            >
                              {net > 0 ? "owed " : "owe "}
                              {formatMoney(Math.abs(net), group.currency)}
                            </span>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
