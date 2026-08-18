"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Brain,
  TrendingUp,
  FolderGit2,
  Briefcase,
  FileCheck,
  X,
  ArrowRight,
  LogIn,
  Eye,
  RefreshCw,
  Edit3,
  Check,
} from "lucide-react";
import type { StructuredResumeData } from "@/lib/resume";

type ResumeUploaderProps = {
  userName?: string | null;
  onProfileExtracted?: (extracted: {
    skills: string[];
    level: "beginner" | "intermediate" | "advanced";
    goal?: string;
  }) => void;
  className?: string;
};

interface ExistingResumeRecord {
  id: string;
  fileName: string;
  fileSize?: number;
  fileType: string;
  storageUrl?: string | null;
  extractedSkills?: string[];
  suggestedLevel?: string;
  targetRole?: string;
  summary?: string;
  parsedData?: StructuredResumeData;
  createdAt: string;
  updatedAt: string;
}

export function ResumeUploader({ userName, onProfileExtracted, className = "" }: ResumeUploaderProps) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestLimitNotice, setGuestLimitNotice] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<StructuredResumeData | null>(null);
  const [memoriesCount, setMemoriesCount] = useState<number>(0);
  const [isApplied, setIsApplied] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);
  
  // Existing uploaded resume from DB / R2
  const [existingResume, setExistingResume] = useState<ExistingResumeRecord | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadResume(isInitialMount = false) {
      try {
        const res = await fetch("/api/settings/resume");
        if (!isMounted) return;
        if (res.ok) {
          const json = await res.json();
          if (!isMounted) return;
          setIsGuest(Boolean(json.isGuest));
          if (json.resume) {
            setExistingResume(json.resume);
            if (json.resume.parsedData) {
              setParsedData(json.resume.parsedData);
            }
            if (isInitialMount) {
              setIsApplied(true);
            }
          }
        }
      } catch (err) {
        console.warn("[resume-uploader] Could not fetch initial resume:", err);
      }
    }

    // Load initial resume on mount
    loadResume(true);

    // Listen to cross-component sync events between Dashboard and Settings
    function handleSync() {
      if (isMounted) {
        loadResume(false);
      }
    }

    window.addEventListener("skillfarm:resume-updated", handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener("skillfarm:resume-updated", handleSync);
    };
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 1024 * 1024) {
        setError("File size exceeds 1MB limit. Please upload a smaller PDF or TXT resume file under 1MB.");
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
      setGuestLimitNotice(null);
    }
  }

  async function handleProcessResume(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setGuestLimitNotice(null);
    setIsApplied(false);
    setApplyFeedback(null);

    if (mode === "file" && !file) {
      setError("Please select a .pdf or .txt resume file.");
      return;
    }
    if (mode === "text" && rawText.trim().length < 10) {
      setError("Please paste your resume text (at least 10 characters).");
      return;
    }

    setLoading(true);

    try {
      let res: Response;

      if (mode === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/settings/resume", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/settings/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText: rawText }),
        });
      }

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        if (res.status === 403 || json.error?.includes("limit") || json.error === "Guest limit reached" || json.message?.includes("limit")) {
          setGuestLimitNotice(
            json.message ||
              "You have reached your guest limit for resume analysis. Sign in with Google to save your resume profile and unlock unlimited uploads."
          );
          return;
        }
        throw new Error(json.error || json.message || "Failed to process resume");
      }

      const structured: StructuredResumeData = json.parsed?.structured || {
        summary: json.parsed?.experienceSummary,
        skills: json.parsed?.extractedSkills ?? [],
        experience: [],
        education: [],
        projects: (json.parsed?.keyProjects ?? []).map((p: string) => ({ name: "Project", description: p })),
        interests: [],
        suggestedLevel: json.parsed?.suggestedLevel ?? "intermediate",
      };

      setParsedData(structured);
      setMemoriesCount(json.memoriesStored || 3);
      setIsReplacing(false);
      setIsApplied(false); // Let the user review and click Apply to Profile

      // Construct updated resume record
      const updatedRecord: ExistingResumeRecord = {
        id: json.resumeId || "active-resume",
        fileName: mode === "file" && file ? file.name : "pasted-resume.txt",
        fileSize: mode === "file" && file ? file.size : rawText.length,
        fileType: mode === "file" && file ? file.type || "application/pdf" : "text/plain",
        storageUrl: json.storage?.url ?? null,
        extractedSkills: structured.skills,
        suggestedLevel: structured.suggestedLevel,
        targetRole: structured.targetRole,
        summary: structured.summary,
        parsedData: structured,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setExistingResume(updatedRecord);

      // Notify other components (Dashboard / Settings) of the new resume
      window.dispatchEvent(new CustomEvent("skillfarm:resume-updated"));
    } catch (err) {
      console.error("Resume upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to extract resume data");
    } finally {
      setLoading(false);
    }
  }

  function handleApplyToProfile(dataToApply?: StructuredResumeData) {
    const data = dataToApply || parsedData || existingResume?.parsedData;
    if (!data && !existingResume) return;

    const skillsToApply = data?.skills || existingResume?.extractedSkills || [];
    const levelToApply = (data?.suggestedLevel as "beginner" | "intermediate" | "advanced") || (existingResume?.suggestedLevel as "beginner" | "intermediate" | "advanced") || "intermediate";
    const goalToApply = data?.targetRole ? `Become a high-impact ${data.targetRole}` : existingResume?.targetRole ? `Become a high-impact ${existingResume.targetRole}` : undefined;

    setIsApplied(true);
    setApplyFeedback(`✓ Applied ${skillsToApply.length} skills & ${levelToApply} proficiency to your Learning Profile!`);

    if (onProfileExtracted) {
      onProfileExtracted({
        skills: skillsToApply,
        level: levelToApply,
        goal: goalToApply,
      });
    }

    // Smooth scroll to the skills section
    setTimeout(() => {
      const el = document.getElementById("skills-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  }

  // Display formatted name e.g. "jadubhai-resume.pdf" or "Alex-resume.pdf"
  const formattedUserResumeName = `${(userName ? userName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_") : "developer")}-resume.pdf`;

  const activeStructuredData = parsedData || existingResume?.parsedData;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Guest Mode Conversion Banner — ONLY shown for anonymous/guest sessions */}
      {isGuest && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-900 dark:text-violet-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
            <span className="font-medium">Create an account to keep your resume profile and use it across SkillFarm.</span>
          </div>
          <Link href="/login" className="shrink-0 font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
            Sign in →
          </Link>
        </div>
      )}

      {/* Applied Confirmation Toast */}
      {applyFeedback && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-center justify-between gap-3 text-xs text-emerald-950 dark:text-emerald-200 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold break-words">{applyFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setApplyFeedback(null)}
            className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 2. ACTIVE UPLOADED RESUME DISPLAY (When already present & not in replace mode) */}
      {existingResume && !isReplacing ? (
        <Card className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-sm p-3.5 sm:p-5 space-y-4 shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/60 pb-3.5">
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h3 className="font-semibold text-xs sm:text-sm text-foreground break-all">
                    {formattedUserResumeName}
                  </h3>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold shrink-0">
                    Active Resume
                  </Badge>
                  {existingResume.suggestedLevel && (
                    <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                      {existingResume.suggestedLevel} Level
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground break-all leading-tight">
                  Original: <span className="text-foreground font-medium">{existingResume.fileName}</span>
                  {existingResume.fileSize ? ` (${(existingResume.fileSize / 1024).toFixed(1)} KB)` : ""}
                  {" • "}Updated {new Date(existingResume.updatedAt || existingResume.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto pt-1 sm:pt-0">
              {/* View Resume In-App Modal Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewModalOpen(true)}
                className="h-8 px-2.5 sm:px-3 text-xs font-semibold gap-1.5 rounded-xl border-border/70 text-foreground hover:bg-muted cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5 text-blue-500 shrink-0" /> View Resume
              </Button>

              {/* Replace / Edit Resume Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReplacing(true)}
                className="h-8 px-2.5 sm:px-3 text-xs font-semibold gap-1.5 rounded-xl border-border/70 text-foreground hover:bg-muted cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5 text-violet-500 shrink-0" /> Replace Resume
              </Button>

              {/* Apply to Profile Button / Disabled Applied State */}
              {onProfileExtracted && (
                isApplied ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled
                    className="bg-muted text-muted-foreground border border-border/60 text-xs font-medium rounded-xl h-8 px-3 gap-1.5 opacity-80 cursor-default"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Applied
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleApplyToProfile()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl h-8 px-3 sm:px-3.5 gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" /> Apply to Profile <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Highlights & Skills Summary */}
          <div className="space-y-3 pt-0.5">
            {existingResume.summary && (
              <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-1 overflow-hidden">
                <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1">
                  <Brain className="h-3 w-3 shrink-0" /> Profile Summary
                </span>
                <p className="text-xs text-foreground leading-relaxed break-words">{existingResume.summary}</p>
              </div>
            )}

            {existingResume.extractedSkills && existingResume.extractedSkills.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-violet-500 shrink-0" /> Extracted Skills ({existingResume.extractedSkills.length})
                </span>
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {existingResume.extractedSkills.map((sk) => (
                    <Badge
                      key={sk}
                      variant="secondary"
                      className="text-[11px] bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 break-all"
                    >
                      {sk}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : (
        /* 3. UPLOAD BOX CONTAINER (Initial Empty State or Replace Mode) */
        <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-3.5 sm:p-5 space-y-4 overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5 truncate">
                  {existingResume ? "Replace Active Resume" : "Resume Context & Background Extractor"}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate sm:text-wrap">
                  {existingResume
                    ? "Upload a new resume to update and replace your active resume profile in database and memory."
                    : "Upload your resume (.pdf or text) to sync your skills and experience into Personalized Long-Term Memory."}
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              {existingResume && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsReplacing(false)}
                  className="text-xs h-7 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </Button>
              )}
              <div className="flex rounded-xl border border-border/60 bg-muted/30 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("file")}
                  className={`rounded-lg px-2.5 sm:px-3 py-1 font-medium transition-colors cursor-pointer ${
                    mode === "file" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Upload PDF
                </button>
                <button
                  type="button"
                  onClick={() => setMode("text")}
                  className={`rounded-lg px-2.5 sm:px-3 py-1 font-medium transition-colors cursor-pointer ${
                    mode === "text" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Paste Text
                </button>
              </div>
            </div>
          </div>

          {/* Replacement Notice Banner */}
          {existingResume && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 sm:p-3 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
              <RefreshCw className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="break-words">
                <strong>Replace Notice:</strong> Uploading will update and replace your active resume file and memory context.
              </span>
            </div>
          )}

          {/* Input Area */}
          {mode === "file" ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-4 sm:p-6 text-center cursor-pointer transition-all ${
                file
                  ? "border-violet-500/50 bg-violet-500/5"
                  : "border-border/80 hover:border-violet-500/40 hover:bg-muted/20"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload PDF resume file"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{file.name}</p>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • Ready to analyze</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="ml-2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto opacity-70" />
                  <p className="text-xs sm:text-sm font-medium text-foreground">
                    Click to browse or drop your resume (.pdf or .txt)
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">PDFs and TXT up to 1MB supported</p>
                </div>
              )}
            </div>
          ) : (
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste your resume content here (experience, skills, projects, education)..."
              rows={4}
              className="text-xs font-mono rounded-xl resize-none border-border/80"
            />
          )}

          {/* Guest Limit Conversion Notice */}
          {guestLimitNotice && (
            <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-3.5 sm:p-4 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-violet-600/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Guest Demo Limit Reached</p>
                  <p className="text-xs text-muted-foreground leading-relaxed break-words">
                    {guestLimitNotice}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Link href="/login">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold h-8 px-3.5 gap-1.5 shadow-xs cursor-pointer">
                    <LogIn className="h-3.5 w-3.5" /> Sign in with Google
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            {existingResume && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReplacing(false)}
                className="text-xs h-9 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              onClick={handleProcessResume}
              disabled={loading || (mode === "file" && !file) || (mode === "text" && !rawText.trim())}
              className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold h-9 px-4 gap-1.5 shadow-2xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> Extracting with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 shrink-0" /> {existingResume ? "Update & Save Resume" : "Parse & Save to Memory"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 4. IN-APP FORMATTED RESUME VIEWER MODAL (Retrieved directly from DB) */}
      {viewModalOpen && existingResume && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border border-violet-500/30 bg-card p-4 sm:p-6 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-3.5 gap-2 shrink-0">
              <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-2xl bg-violet-600/10 text-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h2 className="font-heading text-sm sm:text-base md:text-lg font-bold text-foreground break-all">
                      {formattedUserResumeName}
                    </h2>
                    <Badge className="bg-emerald-600 text-white text-[10px] shrink-0">Active</Badge>
                    {existingResume.suggestedLevel && (
                      <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                        {existingResume.suggestedLevel} Level
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 break-all leading-tight">
                    Original: {existingResume.fileName} • Saved in Database
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="space-y-4 overflow-y-auto pr-1 py-3 flex-1">
              {/* Profile Summary */}
              {existingResume.summary && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 shrink-0" /> Executive Profile Summary
                  </h4>
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed rounded-2xl bg-muted/20 border border-border/60 p-3 sm:p-4 break-words">
                    {existingResume.summary}
                  </p>
                </div>
              )}

              {/* Technical Skills Matrix */}
              {existingResume.extractedSkills && existingResume.extractedSkills.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" /> Technical Skills & Stack ({existingResume.extractedSkills.length})
                  </h4>
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 rounded-2xl bg-muted/20 border border-border/60 p-3 sm:p-4">
                    {existingResume.extractedSkills.map((sk) => (
                      <Badge
                        key={sk}
                        variant="secondary"
                        className="text-[11px] sm:text-xs py-0.5 sm:py-1 px-2 sm:px-2.5 bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 break-all"
                      >
                        {sk}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects & Work Experience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Projects */}
                {activeStructuredData?.projects && activeStructuredData.projects.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <FolderGit2 className="h-3.5 w-3.5 shrink-0" /> Highlighted Projects
                    </h4>
                    <div className="rounded-2xl bg-muted/20 border border-border/60 p-3 sm:p-4 space-y-2.5 text-xs">
                      {activeStructuredData.projects.map((p, idx) => (
                        <div key={idx} className="border-b border-border/40 last:border-0 pb-2 last:pb-0 space-y-0.5">
                          <p className="font-semibold text-foreground break-words">{p.name}</p>
                          <p className="text-muted-foreground text-[11px] leading-relaxed break-words">{p.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {activeStructuredData?.experience && activeStructuredData.experience.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 shrink-0" /> Experience
                    </h4>
                    <div className="rounded-2xl bg-muted/20 border border-border/60 p-3 sm:p-4 space-y-2.5 text-xs">
                      {activeStructuredData.experience.map((e, idx) => (
                        <div key={idx} className="border-b border-border/40 last:border-0 pb-2 last:pb-0 space-y-0.5">
                          <p className="font-semibold text-foreground break-words">{e.role} {e.company ? `@ ${e.company}` : ""}</p>
                          {e.duration && <p className="text-[10px] text-muted-foreground">{e.duration}</p>}
                          {e.highlights && e.highlights.length > 0 && (
                            <p className="text-muted-foreground text-[11px] leading-relaxed break-words">{e.highlights.join(" • ")}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewModalOpen(false)}
                className="text-xs h-8 sm:h-9 rounded-xl font-medium cursor-pointer"
              >
                Close Viewer
              </Button>
              {onProfileExtracted && (
                isApplied ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled
                    className="bg-muted text-muted-foreground border border-border/60 text-xs font-medium rounded-xl h-8 sm:h-9 px-3.5 gap-1.5 opacity-80 cursor-default"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Applied to Profile
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      handleApplyToProfile();
                      setViewModalOpen(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl h-8 sm:h-9 px-3.5 gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" /> Apply to Profile
                  </Button>
                )
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
