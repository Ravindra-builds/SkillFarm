"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Mail,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { AUTH_MESSAGES, getSafeAuthErrorMessage } from "@/lib/auth-errors";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [devVerifyLink, setDevVerifyLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = useCallback(async (tokenToVerify: string) => {
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token: tokenToVerify }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "This verification link is invalid or has expired.");
        return;
      }

      setVerified(true);
      setTimeout(() => {
        window.location.href = data.redirectUrl || "/dashboard";
      }, 1200);
    } catch (err) {
      setError(getSafeAuthErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  }, []);

  // Auto-verify if token is in query params
  useEffect(() => {
    if (token && !verified && !verifying) {
      handleVerify(token);
    }
  }, [token, verified, verifying, handleVerify]);

  async function handleResend() {
    if (!email) {
      setError("No email address specified. Please return to log in.");
      return;
    }

    setResending(true);
    setError(null);
    setResendStatus(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend", email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || AUTH_MESSAGES.GENERIC_ERROR);
        return;
      }

      setResendStatus(AUTH_MESSAGES.VERIFICATION_SENT);
      if (data.devVerifyLink) {
        setDevVerifyLink(data.devVerifyLink);
      }
    } catch (err) {
      setError(getSafeAuthErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell
      title={verified ? "Email Verified" : "Verify your email"}
      subtitle={
        verified
          ? "Your SkillFarm account is fully active."
          : "We've sent a verification link to your email address."
      }
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

      {resendStatus && !verified && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs flex items-center gap-2 text-emerald-400 animate-in fade-in"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{resendStatus}</span>
        </div>
      )}

      {verifying ? (
        <div className="py-8 text-center space-y-3 animate-in fade-in">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto" />
          <h2 className="text-sm font-semibold text-foreground">
            Verifying your email address...
          </h2>
          <p className="text-xs text-muted-foreground">
            Please wait while we activate your account session.
          </p>
        </div>
      ) : verified ? (
        <div className="space-y-4 animate-in fade-in">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-2">
            <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Verification Successful!
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your email has been confirmed. Redirecting to your dashboard...
            </p>
          </div>

          <div className="pt-2">
            <Link href="/dashboard" className="block">
              <Button className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg">
                Enter Dashboard Now
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-5 text-center space-y-2">
            <div className="mx-auto h-10 w-10 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Check your inbox
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We sent a verification link {email ? `to ${email}` : "to your email"}. Click the link to complete verification.
            </p>
          </div>

          {/* Dev Quick-Verification Button */}
          {token && (
            <Button
              type="button"
              onClick={() => handleVerify(token)}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" /> Complete Email Verification
            </Button>
          )}

          {devVerifyLink && (
            <div className="pt-1">
              <Link href={devVerifyLink} className="block">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-9 text-xs border-violet-500/40 text-violet-300 hover:bg-violet-500/10 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" /> Click to Verify Email
                </Button>
              </Link>
            </div>
          )}

          <div className="space-y-2 pt-1">
            {email && (
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={resending}
                className="w-full h-10 text-xs border-border/80 flex items-center justify-center gap-2 cursor-pointer"
              >
                {resending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending fresh link...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Resend verification email</span>
                  </>
                )}
              </Button>
            )}

            <Link href="/login" className="block">
              <Button variant="ghost" className="w-full h-10 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Log In
              </Button>
            </Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
