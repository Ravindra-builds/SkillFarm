"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft, KeyRound } from "lucide-react";
import { AUTH_MESSAGES, getSafeAuthErrorMessage } from "@/lib/auth-errors";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError(AUTH_MESSAGES.RESET_LINK_INVALID);
      return;
    }

    const errors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      errors.password = "Please enter a new password.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your new password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || AUTH_MESSAGES.RESET_LINK_INVALID);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(getSafeAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Choose a secure new password for your SkillFarm account."
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

      {success ? (
        <div className="space-y-4 animate-in fade-in">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-2">
            <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Password reset complete
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {AUTH_MESSAGES.RESET_PASSWORD_SUCCESS}
            </p>
          </div>

          <div className="pt-2">
            <Link href="/login">
              <Button className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg">
                Log In to SkillFarm
              </Button>
            </Link>
          </div>
        </div>
      ) : !token ? (
        <div className="space-y-4 animate-in fade-in">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center space-y-2">
            <div className="mx-auto h-10 w-10 rounded-full bg-destructive/20 text-destructive flex items-center justify-center">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Invalid or Missing Reset Token
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This password reset link is invalid or incomplete. Please request a fresh reset link.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/forgot-password">
              <Button variant="outline" className="w-full h-10 text-xs border-border/80">
                Request New Reset Link
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              New password (min 8 characters)
            </Label>
            <PasswordInput
              id="password"
              name="new-password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              disabled={loading}
            />
            {fieldErrors.password && (
              <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-1 animate-in fade-in">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground">
              Confirm new password
            </Label>
            <PasswordInput
              id="confirmPassword"
              name="confirm-new-password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              disabled={loading}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-1 animate-in fade-in">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating password...</span>
              </>
            ) : (
              <span>Update password</span>
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
