"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5" /> Something went wrong loading the dashboard
          </CardTitle>
          <p className="text-sm text-muted-foreground">This is a preview-safe fallback. Your data is not lost.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-mono bg-muted p-3 rounded-lg border overflow-auto">{error.message}</p>
          <div className="flex gap-2">
            <Button onClick={() => reset()}>Try again</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/login")}>
              Go to login
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            If this persists, check <code className="font-mono bg-muted px-1 rounded">.env.local</code> — placeholders like <code>ep-xxx</code> / <code>your-google</code> are treated as not configured and should not crash. See <code>SETUP.md</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
