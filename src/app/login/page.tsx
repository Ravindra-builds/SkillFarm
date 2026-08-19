"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleIcon } from "@/components/auth/google-icon";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { AUTH_MESSAGES, getSafeAuthErrorMessage } from "@/lib/auth-errors";

function LoginForm() {
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");

  // Security: Reject any callbackUrl that is not a same-origin relative path.
  // An attacker can craft /login?callbackUrl=https://evil.com to redirect victims
  // to a phishing site after login. Only allow paths starting with "/" and
  // reject anything containing "://" or starting with "//".
  const callbackUrl = (() => {
    if (!rawCallback) return "/dashboard";
    const trimmed = rawCallback.trim();
    if (
      trimmed.startsWith("/") &&
      !trimmed.startsWith("//") &&
      !trimmed.includes("://")
    ) {
      return trimmed;
    }
    return "/dashboard";
  })();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setError(AUTH_MESSAGES.GENERIC_ERROR);
      setGoogleLoading(false);
    }
  }

  async function handleGuestDemo() {
    setError(null);
    setGuestLoading(true);
    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

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

    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = "Please enter your email address.";
    } else if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Please enter your password.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
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

      {/* Email + Password Form with Custom Validation */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            disabled={loading || googleLoading || guestLoading}
            className={`h-10 text-sm bg-background/50 border-border/80 focus-visible:ring-violet-500/30 focus-visible:border-violet-500 ${
              fieldErrors.email ? "border-destructive/60 focus-visible:ring-destructive/30" : ""
            }`}
          />
          {fieldErrors.email && (
            <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-1 animate-in fade-in">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {fieldErrors.email}
            </p>
          )}
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
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            disabled={loading || googleLoading || guestLoading}
          />
          {fieldErrors.password && (
            <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-1 animate-in fade-in">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {fieldErrors.password}
            </p>
          )}
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
            className="font-medium text-violet-400 hover:text-violet-300 hover:underline transition-colors"
          >
            Create an account
          </Link>
        </p>

        {/* Guest Exploration Option */}
        <div className="pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            onClick={handleGuestDemo}
            disabled={loading || googleLoading || guestLoading}
            className="w-full h-9 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 font-normal flex items-center justify-center gap-2 cursor-pointer rounded-lg"
          >
            {guestLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Launching guest workspace...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <span>Explore in Guest Sandbox</span>
              </>
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
