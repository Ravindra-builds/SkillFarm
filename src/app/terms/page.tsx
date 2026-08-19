import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldAlert, FileText, Scale, CheckCircle2, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config";

export const metadata = {
  title: "Terms of Service — SkillFarm",
  description: "Terms of Service and conditions for using the SkillFarm AI engineering platform.",
};

export default function TermsPage() {
  const lastUpdated = "August 19, 2026";

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F8F8FA] selection:bg-violet-500/30 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-[#252A3A] bg-[#0B0F17]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <Image
                src="/logo.png"
                alt="SkillFarm"
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex items-center text-sm font-extrabold tracking-tight">
              <span className="text-white">Skill</span>
              <span className="text-[#7C5CFC]">Farm</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
        {/* Document Header */}
        <div className="border-b border-[#252A3A] pb-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400">
            <Scale className="h-3.5 w-3.5" /> Legal Terms
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated} • Effective immediately upon accessing SkillFarm.
          </p>
        </div>

        {/* Legal Text Body */}
        <div className="mt-8 space-y-10 text-sm leading-relaxed text-[#D1D5DB]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">1</span>
              Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, or using <strong>SkillFarm</strong> (available at{" "}
              <a href={siteConfig.url} className="text-violet-400 hover:underline">{siteConfig.domain}</a>), creating an account, or interacting with our AI mentors, you agree to be bound by these Terms of Service (&quot;Terms&quot;) and our{" "}
              <Link href="/privacy" className="text-violet-400 hover:underline">Privacy Policy</Link>. If you do not agree to all terms and conditions, you must discontinue using SkillFarm immediately.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">2</span>
              What SkillFarm Is
            </h2>
            <p>
              SkillFarm is an interactive, AI-assisted software engineering learning platform. It provides personalized learning roadmaps, curated engineering documentation and resources, real-world project specifications, resume extraction, and multi-agent specialist AI mentorship.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-600/20 text-xs font-semibold text-amber-400">3</span>
              AI-Generated Content Disclaimer & Limitations
            </h2>
            <p>
              SkillFarm utilizes advanced Large Language Models (LLMs) to provide dynamic mentorship, roadmaps, and code explanations. You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#E5E7EB]">
              <li><strong>AI responses can contain errors:</strong> AI models may generate inaccurate, incomplete, or outdated technical information.</li>
              <li><strong>Security & Architecture verification:</strong> AI mentor recommendations (especially concerning cybersecurity, cryptography, and cloud infrastructure) must never be treated as formal security audits. You are solely responsible for testing and validating any code or architecture before production deployment.</li>
              <li><strong>No guaranteed career or academic outcomes:</strong> SkillFarm does not guarantee job placement, salary increases, or specific academic results.</li>
              <li><strong>External resources:</strong> Recommended external links, YouTube tutorials, and GitHub repositories are owned and maintained by third parties and may change or become unavailable without notice.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">4</span>
              User Accounts & Security
            </h2>
            <p>
              To access personalized features such as persistent long-term memory, roadmap state tracking, and cloud resume sync, you may create an authenticated account via email or Google OAuth.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>Account sharing is prohibited. Each user must maintain their own individual account.</li>
              <li>SkillFarm reserves the right to suspend or terminate accounts that engage in abusive behavior, spamming, or security violations.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">5</span>
              User Content & Intellectual Property
            </h2>
            <p>
              You retain full ownership of all materials, resumes, code snippets, project submissions, and notes you submit to SkillFarm (&quot;User Content&quot;).
            </p>
            <p className="text-xs text-muted-foreground">
              By uploading User Content (including your resume for skill extraction or conversation prompts), you grant SkillFarm a worldwide, non-exclusive, royalty-free license solely for the purpose of processing, storing, and generating personalized mentorship features for you. SkillFarm does not sell your User Content to third-party advertisers.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">6</span>
              Acceptable Use Policy
            </h2>
            <p>When using SkillFarm, you agree NOT to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-red-200">
              <li>Attempt to bypass, manipulate, or attack our rate-limiting systems, authentication guards, or Redis tokens.</li>
              <li>Upload malicious files, viruses, malware, or executables masquerading as PDF resumes.</li>
              <li>Abuse our AI inference or search APIs for automated web scraping or denial-of-service attempts.</li>
              <li>Use the platform or mentors to generate content intended to facilitate illegal activities, cyberattacks, or harassment.</li>
              <li>Attempt to decompile, reverse-engineer, or gain unauthorized access to our underlying server infrastructure or databases.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">7</span>
              Third-Party Services & Infrastructure
            </h2>
            <p>
              SkillFarm integrates with reliable third-party infrastructure providers to deliver its services:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li><strong>AI Providers:</strong> Google Gemini, OpenAI, and Anthropic Claude for LLM completions.</li>
              <li><strong>Cloud Storage:</strong> Cloudflare R2 for encrypted resume storage.</li>
              <li><strong>Database & Cache:</strong> Neon Serverless PostgreSQL and Upstash Redis.</li>
              <li><strong>Search & Discovery:</strong> Tavily Search and YouTube Data API.</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Your use of features powered by these providers is subject to their respective terms and data policies as detailed in our <Link href="/privacy" className="text-violet-400 hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">8</span>
              Service Availability & Modifications
            </h2>
            <p>
              SkillFarm is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We do not guarantee that the service will be uninterrupted, error-free, or perpetually available. We may update, enhance, deprecate, or modify features, mentors, or quotas at any time to maintain operational stability.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">9</span>
              Limitation of Liability
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SKILLFARM AND ITS TEAM SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OR INABILITY TO USE THE PLATFORM.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">10</span>
              Changes to These Terms
            </h2>
            <p>
              We may revise these Terms from time to time. When significant changes occur, we will update the &quot;Last updated&quot; date at the top of this page. Continued use of SkillFarm after revisions constitutes your acceptance of the updated Terms.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-3 rounded-2xl border border-border/80 bg-card p-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">11</span>
              Contact & Legal Inquiries
            </h2>
            <p className="text-xs">
              If you have any questions or concerns regarding these Terms of Service, please contact our support team at:
            </p>
            <div className="pt-1">
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
              >
                <Mail className="h-4 w-4" /> {siteConfig.supportEmail}
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
