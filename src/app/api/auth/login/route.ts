import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRateLimitRule } from "@/config";
import { getClientIp } from "@/lib/ip";
import {
  getUserCredential,
  verifyPassword,
  createEmailVerificationToken,
} from "@/lib/password-auth";
import { createCustomSession } from "@/lib/session";
import { sendAuthEmail } from "@/lib/email-service";
import { AUTH_MESSAGES, createSafeAuthErrorResponse } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    const rule = getRateLimitRule("login");
    const rateCheck = await checkRateLimit(`login:${ip}`, rule.limit, rule.windowSec);
    if (!rateCheck.success) {
      return new Response(
        JSON.stringify({
          error: AUTH_MESSAGES.RATE_LIMITED,
          retryAfter: rateCheck.resetSec,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": String(rateCheck.resetSec) },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: AUTH_MESSAGES.INVALID_CREDENTIALS }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const cred = await getUserCredential(normalizedEmail);
    if (!cred) {
      return new Response(
        JSON.stringify({ error: AUTH_MESSAGES.INVALID_CREDENTIALS }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const isValid = await verifyPassword(password, cred.passwordHash);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: AUTH_MESSAGES.INVALID_CREDENTIALS }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 🔒 SECURITY CHECK: If email is not verified, block login and send fresh verification link
    if (cred.emailVerified === false) {
      const token = await createEmailVerificationToken(normalizedEmail);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "http://localhost:3000";
      const verifyUrl = `${appUrl}/verify-email?token=${token}`;

      await sendAuthEmail({
        to: normalizedEmail,
        subject: "Verify your SkillFarm account",
        actionUrl: verifyUrl,
        actionText: "Verify Email Address",
        previewText: "Please verify your email address to sign in to your SkillFarm workspace.",
        type: "verification",
      });

      return new Response(
        JSON.stringify({
          error: "Your email address is not verified yet. We have sent a fresh verification link to your inbox.",
          requiresVerification: true,
          email: normalizedEmail,
          redirectUrl: `/verify-email?email=${encodeURIComponent(normalizedEmail)}`,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create authenticated session cookie
    await createCustomSession(normalizedEmail, cred.name, false);

    return new Response(
      JSON.stringify({
        success: true,
        user: { email: normalizedEmail, name: cred.name },
        redirectUrl: "/dashboard",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return createSafeAuthErrorResponse(err, AUTH_MESSAGES.GENERIC_ERROR, "api/auth/login");
  }
}
