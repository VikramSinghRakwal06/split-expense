import Link from "next/link";
import { Bell, Receipt, RotateCcw, HandCoins } from "lucide-react";
import { getNotifications } from "@/lib/data/notifications";
import type { NotificationType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { MarkReadButton } from "./mark-read-button";
import { MarkAllReadButton } from "./mark-all-read-button";

export const metadata = { title: "Notifications — SplitExpense" };

const NOTIFICATION_ICON: Record<NotificationType, typeof Bell> = {
  EXPENSE_ADDED: Receipt,
  EXPENSE_VOIDED: RotateCcw,
  SETTLEMENT_RECEIVED: HandCoins,
};

export default async function NotificationsPage({
  searchParams,
}: PageProps<"/notifications">) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 0) || 0;

  const result = await getNotifications(page, 20);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Newest first.</p>
        </div>
        <MarkAllReadButton />
      </div>

      {!result.ok ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Could not load notifications: {result.error.message}
          </CardContent>
        </Card>
      ) : result.data.content.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Bell className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col divide-y p-0">
              {result.data.content.map((notification) => {
                const Icon = NOTIFICATION_ICON[notification.type];
                return (
                  <div key={notification.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{notification.title}</p>
                        {!notification.read && (
                          <Badge className="h-4 px-1.5 text-[10px]">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <MarkReadButton notificationId={notification.id} />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            {page === 0 ? (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={`/notifications?page=${page - 1}`}>Previous</Link>
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              Page {result.data.number + 1} of {Math.max(1, result.data.totalPages)}
            </span>
            {page + 1 >= result.data.totalPages ? (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={`/notifications?page=${page + 1}`}>Next</Link>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
