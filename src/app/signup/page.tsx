"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { GoogleIcon } from "@/components/auth/google-icon";
import { AuthShell } from "@/components/auth/auth-shell";
import { AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { AUTH_MESSAGES, getSafeAuthErrorMessage } from "@/lib/auth-errors";

export default function SignupPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await signIn("google", {
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (res?.error) {
        setError(AUTH_MESSAGES.OAUTH_FAILED);
      } else if (res?.url) {
        window.location.href = res.url;
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
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
        window.location.href = "/dashboard";
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

    // Client-side validation
    const trimmedFirstName = firstName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirstName) {
      setError("Please enter your first name.");
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError(AUTH_MESSAGES.INVALID_EMAIL);
      return;
    }

    if (password.length < 8) {
      setError(AUTH_MESSAGES.PASSWORD_TOO_SHORT);
      return;
    }

    if (password !== confirmPassword) {
      setError(AUTH_MESSAGES.PASSWORDS_MUST_MATCH);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: trimmedFirstName,
          lastName: lastName.trim(),
          email: trimmedEmail,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || AUTH_MESSAGES.GENERIC_ERROR);
        return;
      }

      window.location.href = data.redirectUrl || "/dashboard";
    } catch (err) {
      setError(getSafeAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create an account"
      subtitle="Start your learning journey with your personal AI engineering team."
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
        onClick={handleGoogleSignup}
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

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Name Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-xs font-medium text-muted-foreground">
              First name
            </Label>
            <Input
              id="firstName"
              name="given-name"
              type="text"
              placeholder="Ada"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading || googleLoading || guestLoading}
              className="h-10 text-sm bg-background/50 border-border/80 focus-visible:ring-violet-500/30 focus-visible:border-violet-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-xs font-medium text-muted-foreground">
              Last name
            </Label>
            <Input
              id="lastName"
              name="family-name"
              type="text"
              placeholder="Lovelace"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading || googleLoading || guestLoading}
              className="h-10 text-sm bg-background/50 border-border/80 focus-visible:ring-violet-500/30 focus-visible:border-violet-500"
            />
          </div>
        </div>

        {/* Email */}
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

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
            Password (min 8 characters)
          </Label>
          <PasswordInput
            id="password"
            name="new-password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || googleLoading || guestLoading}
          />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground">
            Confirm password
          </Label>
          <PasswordInput
            id="confirmPassword"
            name="confirm-new-password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading || googleLoading || guestLoading}
          />
        </div>

        {/* Terms and Privacy acknowledgment */}
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed pt-1">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground transition-colors">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          .
        </p>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading || googleLoading || guestLoading}
          className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <span>Create account</span>
          )}
        </Button>
      </form>

      {/* Footer Navigation */}
      <div className="pt-2 space-y-3 text-center">
        <p className="text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            Log in
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
