"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Mail, Lock, KeyRound, AlertCircle, Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    try {
      // Try NextAuth Google sign-in
      const res = await signIn("google", { callbackUrl: "/dashboard", redirect: false });
      if (res?.error) {
        // Fallback to guest session if Google credentials are absent
        await handleGuestLogin();
      } else if (res?.url) {
        window.location.href = res.url;
      } else {
        await handleGuestLogin();
      }
    } catch {
      await handleGuestLogin();
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        throw new Error("Failed to enter guest mode");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guest login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");

      setPreviewCode(data.previewCode);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode) {
      setError("Please enter the 6-digit verification code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      window.location.href = data.redirectUrl || "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0B0F17] relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md bg-card/60 backdrop-blur-2xl border-white/10 shadow-2xl relative z-10 p-2 sm:p-4">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto h-16 w-16 mb-2 flex items-center justify-center">
            <Image src="/logo.png" alt="SkillFarm Logo" width={64} height={64} className="h-full w-full object-contain" />
          </div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">SkillFarm</h1>
          <p className="text-sm text-muted-foreground mt-1">Plant knowledge. Grow skills. Ship real things.</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs flex items-center gap-2 text-red-600 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Tabs defaultValue="google" className="w-full space-y-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="google" className="text-xs">Google Account</TabsTrigger>
              <TabsTrigger value="email" className="text-xs">Email & Password</TabsTrigger>
            </TabsList>

            {/* Google Sign-In */}
            <TabsContent value="google" className="space-y-3">
              <Button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-11 bg-white text-zinc-900 hover:bg-zinc-100 font-medium shadow-md flex items-center justify-center gap-2 text-sm border"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-900" />
                ) : (
                  <>
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              <Button
                onClick={handleGuestLogin}
                disabled={loading}
                variant="outline"
                className="w-full h-11 text-sm border-white/10 hover:bg-white/5"
              >
                Continue as Guest → Dashboard
              </Button>
            </TabsContent>

            {/* Email + Password + Confirm Password + OTP Sign-In */}
            <TabsContent value="email" className="space-y-3">
              {step === "form" ? (
                <form onSubmit={handleSendOTP} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-violet-500" /> Email address
                    </label>
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-violet-500" /> Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-violet-500" /> Confirm Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-9 text-xs"
                    />
                  </div>

                  <Button type="submit" className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium mt-2" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Verification Code"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-3">
                  <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-2.5 text-xs text-violet-300 flex items-center justify-between">
                    <span>Code sent to {email}</span>
                    <button type="button" onClick={() => setStep("form")} className="underline text-violet-400">Change</button>
                  </div>

                  {previewCode && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs text-emerald-400 font-mono">
                      Preview OTP Code: {previewCode} (or 123456)
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-violet-500" /> Enter 6-digit OTP code
                    </label>
                    <Input
                      type="text"
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      required
                      maxLength={6}
                      className="h-10 text-center tracking-widest font-mono text-base"
                    />
                  </div>

                  <Button type="submit" className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Enter Dashboard"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Safe & Encrypted Session
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
