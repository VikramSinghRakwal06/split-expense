"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Catches a render-time throw anywhere under the (app) segment — a bug, not an
// expected failure (those are already handled inline as `!result.ok` branches
// on each page). Must be a Client Component; Next mounts it as an error
// boundary wrapping the segment's page/layout tree.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </span>
          <div>
            <p className="font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. You can try again.
            </p>
          </div>
          <Button onClick={reset} size="sm" className="mt-2">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
