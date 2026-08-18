import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

type AuthShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
};

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0B0F17] relative overflow-hidden selection:bg-violet-500/30">
      {/* Background ambient lighting */}
      <div
        className="absolute -top-40 -left-40 h-[450px] w-[450px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-40 -right-40 h-[450px] w-[450px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-full max-w-[440px] relative z-10 flex flex-col items-center">
        {/* Brand Header */}
        <Link
          href="/"
          className="group mb-6 flex flex-col items-center text-center transition-transform hover:scale-[1.01]"
        >
          <div className="relative h-12 w-12 mb-2 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="SkillFarm Logo"
              width={48}
              height={48}
              priority
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex items-center">
            <span className="font-heading text-xl font-extrabold text-foreground">
              Skill
            </span>
            <span className="font-heading text-xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Farm
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Plant knowledge. Grow skills. Ship real things.
          </p>
        </Link>

        {/* Main Card Container */}
        <Card className="w-full bg-card/90 border border-border/80 shadow-2xl backdrop-blur-2xl rounded-2xl overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="text-center space-y-1">
              <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>

            {children}
          </CardContent>
        </Card>

        {/* Security badge footer */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Safe & encrypted developer environment</span>
        </div>
      </div>
    </div>
  );
}
