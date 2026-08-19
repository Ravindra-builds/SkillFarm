import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRateLimitRule } from "@/config";
import { getClientIp } from "@/lib/ip";
import { createPasswordResetToken, checkUserExists } from "@/lib/password-auth";
import { sendAuthEmail } from "@/lib/email-service";
import { AUTH_MESSAGES } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

const forgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    const rule = getRateLimitRule("forgotPassword");
    const rateCheck = await checkRateLimit(`forgot:${ip}`, rule.limit, rule.windowSec);
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
    const parseResult = forgotSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: AUTH_MESSAGES.INVALID_EMAIL }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const exists = await checkUserExists(normalizedEmail);

    if (exists) {
      const token = await createPasswordResetToken(normalizedEmail);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "http://localhost:3000";
      const resetUrl = `${appUrl}/reset-password?token=${token}`;

      await sendAuthEmail({
        to: normalizedEmail,
        subject: "Reset your SkillFarm password",
        actionUrl: resetUrl,
        actionText: "Reset Password",
        previewText: "We received a request to reset your password. Click the button below to choose a new password.",
        type: "password_reset",
      });
    }

    // 🔒 SECURITY: Always return safe generic success message to prevent email enumeration.
    // The secret reset token is NEVER returned in the API response or exposed to the client.
    return new Response(
      JSON.stringify({
        success: true,
        message: AUTH_MESSAGES.FORGOT_PASSWORD_SUCCESS,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[api/auth/forgot-password] error:", err);
    return new Response(
      JSON.stringify({
        success: true,
        message: AUTH_MESSAGES.FORGOT_PASSWORD_SUCCESS,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}
