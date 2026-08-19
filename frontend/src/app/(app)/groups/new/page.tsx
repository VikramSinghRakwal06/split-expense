import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewGroupForm } from "./new-group-form";

export const metadata = { title: "New group — SplitExpense" };

export default function NewGroupPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New group</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;ll be its owner and can add members once it&apos;s created.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Group details</CardTitle>
          <CardDescription>Name it after the trip, house or occasion.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewGroupForm />
        </CardContent>
      </Card>
    </div>
  );
}
