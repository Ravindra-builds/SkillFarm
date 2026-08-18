"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft, Mail } from "lucide-react";
import { AUTH_MESSAGES, getSafeAuthErrorMessage } from "@/lib/auth-errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError(AUTH_MESSAGES.INVALID_EMAIL);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || AUTH_MESSAGES.GENERIC_ERROR);
        return;
      }

      setSubmitted(true);
      if (data.devResetLink) {
        setDevResetLink(data.devResetLink);
      }
    } catch (err) {
      setError(getSafeAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email address and we'll send you instructions to reset your password."
    >
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs flex items-center gap-2 text-destructive animate-in fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="space-y-4 animate-in fade-in">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-2">
            <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Check your email
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {AUTH_MESSAGES.FORGOT_PASSWORD_SUCCESS}
            </p>
          </div>

          {devResetLink && (
            <div className="pt-1">
              <Link href={devResetLink} className="block">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-9 text-xs border-violet-500/40 text-violet-300 hover:bg-violet-500/10 flex items-center justify-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5 text-violet-400" /> Open Password Reset Page
                </Button>
              </Link>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link href="/login">
              <Button variant="outline" className="w-full h-10 text-xs border-border/80">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Log In
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Email address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-10 text-sm bg-background/50 border-border/80 focus-visible:ring-violet-500/30 focus-visible:border-violet-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending reset link...</span>
              </>
            ) : (
              <span>Send reset link</span>
            )}
          </Button>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Log In
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
