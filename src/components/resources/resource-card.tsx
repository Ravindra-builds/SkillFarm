import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ExternalLink, Clock, ShieldCheck, Sparkles } from "lucide-react";

// Re-export type from the canonical mock data module for convenience.
// Mock data itself (MOCK_RESOURCES array) now lives in src/data/mock/resources.ts
// and must be imported from there — never embed it in UI components.
export type { MockResource } from "@/data/mock/resources";

export function ResourceCard({ r }: { r: import("@/data/mock/resources").MockResource }) {
  return (
    <Card className="border-muted/50 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] font-medium">
                {r.type}
              </Badge>
              <span className="text-xs text-muted-foreground truncate">{r.provider}</span>
            </div>
            <h4 className="mt-2 text-sm font-semibold leading-tight line-clamp-2">{r.title}</h4>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{r.level}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.updated}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 border border-amber-500/20">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {r.overall.toFixed(1)} / 10
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-muted/50 p-3 border">
          <p className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-violet-600" /> Why this was selected</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.why}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20"><ShieldCheck className="h-3 w-3" /> Official</span>
            <span className="inline-flex items-center gap-1 text-[11px] bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full border border-blue-500/20">✓ Fresh</span>
            <span className="inline-flex items-center gap-1 text-[11px] bg-violet-500/10 text-violet-700 dark:text-violet-400 px-2 py-1 rounded-full border border-violet-500/20">✓ Practical</span>
          </div>
        </div>

        <a
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-7 w-full items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted hover:text-foreground transition-colors"
        >
          Open resource <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  );
}
