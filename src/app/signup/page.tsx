"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleIcon } from "@/components/auth/google-icon";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { AUTH_MESSAGES, getSafeAuthErrorMessage } from "@/lib/auth-errors";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  async function handleGoogleSignup() {
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
        router.push(callbackUrl);
        router.refresh();
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

    const errors: {
      firstName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    const trimmedFirstName = firstName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirstName) {
      errors.firstName = "Please enter your first name.";
    }

    if (!trimmedEmail) {
      errors.email = "Please enter your email address.";
    } else if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Please enter a password.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (!agreeToTerms) {
      errors.terms = "You must agree to the Terms of Service and Privacy Policy to create an account.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
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

      router.push(data.redirectUrl || "/verify-email");
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

      {/* Registration Form with Custom Validation */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Name Fields (Row) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-xs font-medium text-muted-foreground">
              First name
            </Label>
            <Input
              id="firstName"
              name="given-name"
              type="text"
              placeholder="John"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (fieldErrors.firstName) {
                  setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
                }
              }}
              disabled={loading || googleLoading || guestLoading}
              className={`h-10 text-sm bg-background/50 border-border/80 focus-visible:ring-violet-500/30 focus-visible:border-violet-500 ${
                fieldErrors.firstName ? "border-destructive/60 focus-visible:ring-destructive/30" : ""
              }`}
            />
            {fieldErrors.firstName && (
              <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-1 animate-in fade-in">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {fieldErrors.firstName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-xs font-medium text-muted-foreground">
              Last name
            </Label>
            <Input
              id="lastName"
              name="family-name"
              type="text"
              placeholder="doe"
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
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) {
                setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }
            }}
            disabled={loading || googleLoading || guestLoading}
          />
          {fieldErrors.confirmPassword && (
            <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-1 animate-in fade-in">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        {/* Mandatory Terms & Privacy Checkbox */}
        <div className="space-y-1 pt-1">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="agreeToTerms"
              name="agreeToTerms"
              checked={agreeToTerms}
              onChange={(e) => {
                setAgreeToTerms(e.target.checked);
                if (fieldErrors.terms) {
                  setFieldErrors((prev) => ({ ...prev, terms: undefined }));
                }
              }}
              className="mt-0.5 h-4 w-4 rounded border-border/80 bg-background/60 text-violet-600 focus:ring-violet-500/30 accent-violet-600 cursor-pointer shrink-0"
            />
            <label htmlFor="agreeToTerms" className="text-[12px] text-muted-foreground leading-snug cursor-pointer select-none">
              I agree to SkillFarm&apos;s{" "}
              <Link href="/terms" target="_blank" className="text-violet-400 hover:text-violet-300 underline font-medium">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="text-violet-400 hover:text-violet-300 underline font-medium">
                Privacy Policy
              </Link>
              .
            </label>
          </div>
          {fieldErrors.terms && (
            <p className="text-[11px] text-destructive flex items-center gap-1 font-medium mt-1 animate-in fade-in">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {fieldErrors.terms}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading || googleLoading || guestLoading}
          className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating your account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </Button>
      </form>

      {/* Footer Navigation */}
      <div className="pt-2 space-y-3 text-center">
        <p className="text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-violet-400 hover:text-violet-300 hover:underline transition-colors"
          >
            Log in
          </Link>
        </p>

        {/* Guest Demo Option */}
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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
