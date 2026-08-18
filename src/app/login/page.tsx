"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { GoogleIcon } from "@/components/auth/google-icon";
import { AuthShell } from "@/components/auth/auth-shell";
import { AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { AUTH_MESSAGES, getSafeAuthErrorMessage } from "@/lib/auth-errors";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await signIn("google", {
        callbackUrl,
        redirect: false,
      });

      if (res?.error) {
        // Fallback to safe error or guest preview if Google OAuth keys are missing
        console.warn("[login] Google sign-in response error:", res.error);
        setError(AUTH_MESSAGES.OAUTH_FAILED);
      } else if (res?.url) {
        window.location.href = res.url;
      } else {
        window.location.href = callbackUrl;
      }
    } catch (err) {
      console.error("[login] Google sign-in exception:", err);
      setError(AUTH_MESSAGES.OAUTH_FAILED);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleGuestLogin() {
    setGuestLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        window.location.href = callbackUrl;
      } else {
        setError(data.error || AUTH_MESSAGES.GENERIC_ERROR);
      }
    } catch {
      setError(AUTH_MESSAGES.NETWORK_ERROR);
    } finally {
      setGuestLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(AUTH_MESSAGES.INVALID_EMAIL);
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.requiresVerification && data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }
        setError(data.error || AUTH_MESSAGES.INVALID_CREDENTIALS);
        return;
      }

      window.location.href = data.redirectUrl || callbackUrl;
    } catch (err) {
      setError(getSafeAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Continue your learning journey."
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

      {/* Google OAuth Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleLogin}
        disabled={loading || googleLoading || guestLoading}
        className="w-full h-10 bg-card hover:bg-muted/80 text-foreground border-border/80 font-medium flex items-center justify-center gap-2.5 text-xs sm:text-sm transition-colors cursor-pointer"
      >
        {googleLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span>Connecting to Google...</span>
          </>
        ) : (
          <>
            <GoogleIcon className="h-4 w-4 shrink-0" />
            <span>Continue with Google</span>
          </>
        )}
      </Button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-border/70 w-full" />
        <span className="bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">
          OR
        </span>
        <div className="border-t border-border/70 w-full" />
      </div>

      {/* Email + Password Form */}
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
            disabled={loading || googleLoading || guestLoading}
            className="h-10 text-sm bg-background/50 border-border/80 focus-visible:ring-violet-500/30 focus-visible:border-violet-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || googleLoading || guestLoading}
          />
        </div>

        <Button
          type="submit"
          disabled={loading || googleLoading || guestLoading}
          className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </Button>
      </form>

      {/* Footer Navigation */}
      <div className="pt-2 space-y-3 text-center">
        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            Create one
          </Link>
        </p>

        <div className="border-t border-border/40 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleGuestLogin}
            disabled={loading || googleLoading || guestLoading}
            className="w-full h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {guestLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                <span>Entering guest mode...</span>
              </>
            ) : (
              <span className="flex items-center justify-center gap-1">
                Continue as Guest <ArrowRight className="h-3 w-3 ml-1" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
