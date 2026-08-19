import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Database,
  Brain,
  FileText,
  Clock,
  UserCheck,
  Mail,
  Server,
  Layers,
  Sparkles,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config";

export const metadata = {
  title: "Privacy Policy — SkillFarm",
  description: "Privacy Policy explaining data collection, AI processing, long-term memory, and Cloudflare R2 resume security on SkillFarm.",
};

export default function PrivacyPage() {
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
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
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
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Privacy & Data Protection
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated} • Transparency on what data we collect, why we process it, and how your privacy is protected.
          </p>
        </div>

        {/* Legal Text Body */}
        <div className="mt-8 space-y-10 text-sm leading-relaxed text-[#D1D5DB]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">1</span>
              Information We Collect
            </h2>
            <p>
              SkillFarm collects only the information necessary to provide, personalize, and secure our AI engineering learning ecosystem:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl border border-border/60 bg-muted/10 p-3.5 space-y-1">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-violet-400" /> Account Information
                </h3>
                <p className="text-[12px] text-muted-foreground">
                  Your name, email address, password hash (salted via scrypt), and OAuth profile identifiers when signing in via Google.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/10 p-3.5 space-y-1">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-400" /> Learning Profile & Goals
                </h3>
                <p className="text-[12px] text-muted-foreground">
                  Target engineering roles, self-reported skills, weekly availability hours, learning styles, and interactive roadmap progression.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/10 p-3.5 space-y-1">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-400" /> Resume & Portfolio Documents
                </h3>
                <p className="text-[12px] text-muted-foreground">
                  PDF or plaintext resume files uploaded for skill extraction and career roadmap alignment (stored in private Cloudflare R2 buckets).
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/10 p-3.5 space-y-1">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-purple-400" /> AI Mentor Conversations
                </h3>
                <p className="text-[12px] text-muted-foreground">
                  Messages and queries exchanged with our 6 specialist mentors, conversation topics, and synthesized multi-agent engineering drills.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">2</span>
              Why We Collect Data & Data Flow Mapping
            </h2>
            <p>
              We do not sell personal data to advertisers. We process your data exclusively for the specific purposes outlined below:
            </p>

            <div className="rounded-xl border border-border/70 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted/30 border-b border-border/60 text-white font-semibold">
                  <tr>
                    <th className="p-3 w-1/3">Data Category</th>
                    <th className="p-3">Specific Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-muted-foreground">
                  <tr>
                    <td className="p-3 font-medium text-foreground">Name & Email</td>
                    <td className="p-3">Account authentication, password reset dispatch, and verification.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Learning Profile</td>
                    <td className="p-3">Generating and adapting your multi-week interactive engineering roadmap.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Uploaded Resume</td>
                    <td className="p-3">Extracting known skills and identifying knowledge gaps for career growth.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Mentor Conversations</td>
                    <td className="p-3">Streaming real-time mentor responses and multi-agent synthesis drills.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Long-Term Memory</td>
                    <td className="p-3">Personalizing future mentor interactions so you don&apos;t need to re-explain context.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Telemetry & IP Data</td>
                    <td className="p-3">Enforcing rate limits, preventing API abuse, and securing infrastructure.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">3</span>
              How AI Models Process Your Data
            </h2>
            <p>
              SkillFarm leverages enterprise LLM APIs (such as Google Gemini, OpenAI, and Anthropic Claude) to generate engineering mentorship:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#E5E7EB]">
              <li>When you send a message or request a roadmap, your query and relevant profile context are transmitted securely over HTTPS to the configured AI provider.</li>
              <li>Under our enterprise API agreements, your prompts are processed strictly to generate your response and are not used by the LLM providers to train public foundation models.</li>
              <li>You can view and customize your preferred LLM provider and model directly in your Settings tab.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">4</span>
              Long-Term Personalized Memory (Mem0)
            </h2>
            <p>
              For authenticated users, SkillFarm uses a long-term memory engine (powered by Mem0) to remember important learning milestones, preferred tech stacks, and topics you find challenging.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li><strong>Transparency:</strong> You can inspect every memory item saved about you in the <em>Settings → Memory & AI</em> tab.</li>
              <li><strong>User Control:</strong> You can add custom memory rules or permanently delete any memory record at any time.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">5</span>
              Resume Storage & Cloudflare R2
            </h2>
            <p>
              When you upload a resume to personalize your learning roadmap:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li>Resumes are stored in a private, encrypted Cloudflare R2 bucket.</li>
              <li>Files are accessible only through short-lived server-signed URLs.</li>
              <li>Authenticated users can permanently delete their uploaded resume file at any time from the Resume tab in Settings.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600/20 text-xs font-semibold text-emerald-400">6</span>
              Guest Sessions & Ephemeral Storage
            </h2>
            <p>
              SkillFarm provides a temporary Guest Sandbox allowing visitors to explore the platform without creating an account:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#E5E7EB]">
              <li>Guest session state is stored in an ephemeral Redis cache with an automatic Time-To-Live (TTL) expiration.</li>
              <li>Guest sessions do <strong>not</strong> write to long-term memory (Mem0) or the primary PostgreSQL database.</li>
              <li>All guest session data is automatically purged upon session expiration.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">7</span>
              Cookies & Local Storage
            </h2>
            <p>We use minimal, essential browser storage mechanisms:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li><strong>Session Cookies:</strong> Encrypted, HTTP-only JWT cookies (<code>skillfarm_session</code>) to maintain your secure login state.</li>
              <li><strong>Local Storage:</strong> Browser <code>localStorage</code> is used to store UI preferences (such as your chosen LLM provider) and temporary guest session IDs.</li>
              <li>We do not employ third-party tracking cookies or cross-site advertising beacons.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">8</span>
              Third-Party Service Providers
            </h2>
            <p>We rely on trusted cloud infrastructure partners to deliver SkillFarm:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li><strong>Neon Database:</strong> Serverless PostgreSQL database for account profiles and roadmap progress.</li>
              <li><strong>Cloudflare R2:</strong> Encrypted cloud object storage for resumes.</li>
              <li><strong>Upstash Redis:</strong> Low-latency distributed rate-limiting and temporary cache.</li>
              <li><strong>Mem0:</strong> Semantic memory store for personalized engineering context.</li>
              <li><strong>AI Providers:</strong> Google Cloud (Gemini), OpenAI, and Anthropic.</li>
              <li><strong>Tavily Search:</strong> Real-time technical documentation and discovery search.</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">9</span>
              Data Retention Policy
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li><strong>Account Data:</strong> Retained for as long as your account remains active. You can request deletion at any time.</li>
              <li><strong>Uploaded Resumes:</strong> Retained until deleted by the user or account termination.</li>
              <li><strong>Guest Sandbox Data:</strong> Automatically deleted upon TTL expiration.</li>
              <li><strong>Security & Access Logs:</strong> Retained for a rolling 30-day period for abuse detection and security auditing.</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">10</span>
              Your Privacy Rights (DPDP Act 2023 & Global Standards)
            </h2>
            <p>
              In accordance with applicable data protection legislation (including India&apos;s <em>Digital Personal Data Protection Act, 2023</em> and international privacy frameworks), you have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li><strong>Access:</strong> Request a summary of the personal data SkillFarm processes about you.</li>
              <li><strong>Correction:</strong> Update or correct inaccurate profile or skill information.</li>
              <li><strong>Erasure / Deletion:</strong> Request complete erasure of your account, memories, resumes, and conversation records.</li>
              <li><strong>Grievance Redressal:</strong> Submit inquiries directly to our privacy contact.</li>
            </ul>
          </section>

          {/* Section 11 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">11</span>
              Security Safeguards
            </h2>
            <p>
              SkillFarm implements robust technical and organizational measures to safeguard your information:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li>Strict TLS/HTTPS encryption across all data in transit.</li>
              <li>Cryptographic password hashing using salt-strengthened <code>scrypt</code> algorithms with constant-time verification.</li>
              <li>Isolated guest sandboxes preventing cross-user data leakage.</li>
              <li>Sliding-window rate limiting protecting API routes against brute-force and credential stuffing.</li>
            </ul>
          </section>

          {/* Section 12 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">12</span>
              Children&apos;s Privacy
            </h2>
            <p>
              SkillFarm is designed for software engineers, university students, and adult learners (minimum age 16+). We do not knowingly collect personal data from children under the age of 16. If we discover that a minor under 16 has provided personal data without parental consent, we will promptly delete the data.
            </p>
          </section>

          {/* Section 13 */}
          <section className="space-y-3 rounded-2xl border border-border/80 bg-card p-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-semibold text-violet-400">13</span>
              Privacy Grievance & Contact Officer
            </h2>
            <p className="text-xs">
              For any privacy-related requests, data export, or grievance redressal, please reach out to our team at:
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
