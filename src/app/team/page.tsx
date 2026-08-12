import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Page() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className="flex-1 bg-muted/30 p-6">
          <div className="mx-auto max-w-3xl">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">My Team <Badge>Phase 4</Badge></CardTitle>
                <p className="text-sm text-muted-foreground">Your 6 mentors + orchestrator. See expertise, tools, and handoff rules. Phase 4.</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">You are viewing the Phase 0 design-system preview with mock data. Functionality arrives in the listed phase.</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
