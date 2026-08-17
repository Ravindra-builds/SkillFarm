"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import type { StructuredResumeData } from "@/lib/resume";

type ResumeUploaderProps = {
  onProfileExtracted?: (extracted: {
    skills: string[];
    level: "beginner" | "intermediate" | "advanced";
    goal?: string;
  }) => void;
  className?: string;
};

export function ResumeUploader({ onProfileExtracted, className = "" }: ResumeUploaderProps) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<StructuredResumeData | null>(null);
  const [memoriesCount, setMemoriesCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
  }

  async function handleProcessResume(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setParsedData(null);

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

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to process resume");
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
    } catch (err) {
      console.error("Resume upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to extract resume data");
    } finally {
      setLoading(false);
    }
  }

  function handleApplyToProfile() {
    if (!parsedData) return;
    if (onProfileExtracted) {
      onProfileExtracted({
        skills: parsedData.skills,
        level: parsedData.suggestedLevel,
        goal: parsedData.targetRole ? `Become a high-impact ${parsedData.targetRole}` : undefined,
      });
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Box Container */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                Resume Context & Background Extractor
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Upload your resume (.pdf or text) to sync your skills and experience into Personalized Long-Term Memory.
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-xl border border-border/60 bg-muted/30 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("file")}
              className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                mode === "file" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upload PDF
            </button>
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                mode === "text" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Paste Text
            </button>
          </div>
        </div>

        {/* Input Area */}
        {mode === "file" ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
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
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-semibold text-foreground">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • Ready to analyze</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="ml-2 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
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
                <p className="text-[11px] text-muted-foreground">PDFs and TXT up to 1MB supported</p>
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

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleProcessResume}
            disabled={loading || (mode === "file" && !file) || (mode === "text" && !rawText.trim())}
            className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold h-9 px-4 gap-1.5 shadow-2xs"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Extracting with AI...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Parse & Save to Memory
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Extracted Structured Results Banner */}
      {parsedData && (
        <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between flex-wrap gap-2 border-b border-emerald-500/20 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-semibold text-xs sm:text-sm text-foreground">
                  Resume Successfully Extracted & Saved to Long-Term Memory!
                </h4>
                <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-2">
                  {memoriesCount} Memories Synced
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your AI mentors and personalized roadmap now have full context of your real-world background.
              </p>
            </div>

            {onProfileExtracted && (
              <Button
                size="sm"
                onClick={handleApplyToProfile}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-xl h-8 gap-1.5 shadow-2xs"
              >
                Apply to Learning Profile <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Highlights Grid */}
          <div className="space-y-3">
            {/* Executive Summary */}
            <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-1">
              <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1">
                <Brain className="h-3 w-3" /> Profile Summary
              </span>
              <p className="text-xs text-foreground leading-relaxed">{parsedData.summary}</p>
            </div>

            {/* Extracted Skills */}
            {parsedData.skills && parsedData.skills.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-violet-500" /> Detected Skills ({parsedData.skills.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {parsedData.skills.map((sk) => (
                    <Badge
                      key={sk}
                      variant="secondary"
                      className="text-[11px] bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20"
                    >
                      {sk}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Projects & Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {parsedData.projects && parsedData.projects.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-1">
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                    <FolderGit2 className="h-3 w-3" /> Key Projects
                  </span>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    {parsedData.projects.slice(0, 3).map((p, i) => (
                      <li key={i} className="line-clamp-1">
                        <strong className="text-foreground">{p.name}:</strong> {p.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {parsedData.experience && parsedData.experience.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-1">
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Experience
                  </span>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    {parsedData.experience.slice(0, 2).map((e, i) => (
                      <li key={i} className="line-clamp-1">
                        <strong className="text-foreground">{e.role}</strong> {e.company ? `@ ${e.company}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
