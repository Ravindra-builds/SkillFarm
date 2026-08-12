import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { mentorList } from "@/config/mentors";
import { Bot, Server, Palette, Cloud, ShieldCheck, Network } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Bot,
  Server,
  Palette,
  Cloud,
  ShieldCheck,
  Network,
};

export function MentorTeamGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {mentorList.map((m) => {
        const Icon = iconMap[m.icon] ?? Bot;
        return (
          <Card
            key={m.id}
            className="group relative overflow-hidden border-muted/50 hover:border-primary/30 hover:shadow-md transition-all"
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: m.color }}
            />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Avatar className="h-9 w-9 border" style={{ borderColor: m.color }}>
                  <AvatarFallback
                    className="text-white text-xs font-bold"
                    style={{ background: m.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />
              </div>
              <CardTitle className="text-[14px] font-semibold leading-tight mt-3">{m.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{m.role}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{m.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.expertise.slice(0, 3).map((e) => (
                  <Badge key={e} variant="secondary" className="text-[10px] px-1.5 py-0.5 font-medium bg-muted">
                    {e}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{m.expertise.length - 3}</Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function MentorTeamCompact() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {mentorList.slice(0, 4).map((m) => (
          <div
            key={m.id}
            className="h-8 w-8 rounded-full border-2 border-background flex items-center justify-center text-white text-[11px] font-bold"
            style={{ background: m.color }}
            title={m.name}
          >
            {m.shortName[0]}
          </div>
        ))}
        <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
          +{mentorList.length - 4}
        </div>
      </div>
      <div className="text-xs">
        <p className="font-medium leading-none">Your Engineering Team</p>
        <p className="text-muted-foreground">6 specialists • Orchestrator active</p>
      </div>
    </div>
  );
}
