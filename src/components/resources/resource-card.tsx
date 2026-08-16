import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ExternalLink, Sparkles, BookOpen, Video, Code2 } from "lucide-react";
import type { ScoredResource } from "@/agents/research/scorer";
import type { MockResource } from "@/data/mock/resources";

export type { MockResource } from "@/data/mock/resources";

export function ResourceCard({
  r,
  compact = false,
}: {
  r: ScoredResource | MockResource;
  compact?: boolean;
}) {
  const isScored = "score" in r;

  let hostname = "";
  try {
    hostname = new URL(r.url).hostname.replace("www.", "");
  } catch {}

  const overallScore = isScored ? (r as ScoredResource).score.overall : (r as MockResource).overall;
  const reasoning = isScored ? (r as ScoredResource).score.reasoning : (r as MockResource).why;
  const source = isScored ? (r as ScoredResource).source : (r as MockResource).type;
  const description = isScored ? (r as ScoredResource).description : undefined;

  const isDoc = source === "docs" || source === "article" || source === "tutorial";
  const isYt = source === "youtube";
  const isGh = source === "github";

  return (
    <Card className="rounded-2xl border border-border/80 hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden bg-card">
      <CardContent className={`${compact ? "p-3.5 sm:p-4 space-y-2.5" : "p-4 sm:p-5 space-y-3"} flex-1 flex flex-col justify-between`}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isDoc && (
                <Badge variant="secondary" className="text-[10px] sm:text-[11px] px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-semibold rounded-md">
                  <BookOpen className="h-3 w-3 mr-1" /> Learn / Docs
                </Badge>
              )}
              {isYt && (
                <Badge variant="secondary" className="text-[10px] sm:text-[11px] px-2 py-0.5 bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 font-semibold rounded-md">
                  <Video className="h-3 w-3 mr-1" /> Watch / Video
                </Badge>
              )}
              {isGh && (
                <Badge variant="secondary" className="text-[10px] sm:text-[11px] px-2 py-0.5 bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border border-zinc-500/20 font-semibold rounded-md">
                  <Code2 className="h-3 w-3 mr-1" /> Code / Practice
                </Badge>
              )}
              {hostname && <span className="text-[10px] text-muted-foreground truncate">{hostname}</span>}
            </div>

            <div className="shrink-0">
              <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {overallScore.toFixed(1)}
              </div>
            </div>
          </div>

          <h4 className="text-xs sm:text-sm font-bold leading-snug line-clamp-2 text-foreground">{r.title}</h4>
          {description && <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">{description}</p>}
        </div>

        <div className="space-y-2 pt-1">
          {!compact && reasoning && (
            <div className="rounded-xl bg-muted/40 p-2.5 sm:p-3 border border-border/60 text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-foreground text-[11px]">
                <Sparkles className="h-3 w-3 text-violet-600 shrink-0" /> Why this was selected
              </p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">{reasoning}</p>
            </div>
          )}

          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7.5 w-full items-center justify-center gap-1 rounded-xl border bg-background px-3 text-xs font-semibold hover:bg-muted transition-colors shadow-xs"
          >
            Open Resource <ExternalLink className="h-3 w-3 ml-0.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
