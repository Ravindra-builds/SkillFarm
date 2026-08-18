import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { createPasswordResetToken, checkUserExists } from "@/lib/password-auth";
import { sendAuthEmail } from "@/lib/email-service";
import { AUTH_MESSAGES } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

const forgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "127.0.0.1";

    // Rate-limit: 5 requests per 15 minutes per IP
    const rateCheck = await checkRateLimit(`forgot:${ip}`, 5, 15 * 60);
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

    // Check if user exists before generating token
    const exists = await checkUserExists(normalizedEmail);
    let devResetLink: string | undefined = undefined;

    if (exists || process.env.NODE_ENV !== "production") {
      const token = await createPasswordResetToken(normalizedEmail);
      const origin = req.headers.get("origin") || "http://localhost:3000";
      const resetUrl = `${origin}/reset-password?token=${token}`;

      await sendAuthEmail({
        to: normalizedEmail,
        subject: "Reset your SkillFarm password",
        actionUrl: resetUrl,
        actionText: "Reset Password",
        previewText: "We received a request to reset your password. Click below to choose a new password.",
        type: "password_reset",
      });

      if (process.env.NODE_ENV !== "production") {
        devResetLink = `/reset-password?token=${token}`;
      }
    }

    // Always return safe success message to prevent email enumeration (Rule 9)
    return new Response(
      JSON.stringify({
        success: true,
        message: AUTH_MESSAGES.FORGOT_PASSWORD_SUCCESS,
        ...(devResetLink ? { devResetLink } : {}),
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
