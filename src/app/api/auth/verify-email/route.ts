import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  getUserCredential,
  checkUserExists,
} from "@/lib/password-auth";
import { createCustomSession } from "@/lib/session";
import { sendAuthEmail } from "@/lib/email-service";
import { AUTH_MESSAGES } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

const verifySchema = z.object({
  action: z.enum(["resend", "verify"]),
  email: z.string().email().optional(),
  token: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "127.0.0.1";

    // Rate limit: 10 requests per 10 minutes per IP
    const rateCheck = await checkRateLimit(`verify:${ip}`, 10, 10 * 60);
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
    const parseResult = verifySchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { action, email, token } = parseResult.data;

    if (action === "resend") {
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email address is required." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const normalizedEmail = email.toLowerCase().trim();
      const exists = await checkUserExists(normalizedEmail);

      if (exists) {
        const freshToken = await createEmailVerificationToken(normalizedEmail);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "http://localhost:3000";
        const verifyUrl = `${appUrl}/verify-email?token=${freshToken}`;

        await sendAuthEmail({
          to: normalizedEmail,
          subject: "Verify your SkillFarm account",
          actionUrl: verifyUrl,
          actionText: "Verify Email Address",
          previewText: "Click the button below to verify your SkillFarm account and activate your workspace.",
          type: "verification",
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: AUTH_MESSAGES.VERIFICATION_SENT,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Verification token is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const verifiedEmail = await consumeEmailVerificationToken(token);
      if (!verifiedEmail) {
        return new Response(
          JSON.stringify({ error: "This verification link is invalid or has expired. Please request a new one." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Establish authenticated session for the verified user
      const cred = await getUserCredential(verifiedEmail);
      const name = cred?.name || verifiedEmail.split("@")[0];
      await createCustomSession(verifiedEmail, name, false);

      return new Response(
        JSON.stringify({
          success: true,
          message: AUTH_MESSAGES.VERIFICATION_SUCCESS,
          redirectUrl: "/dashboard",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[api/auth/verify-email] error:", err);
    return new Response(
      JSON.stringify({ error: AUTH_MESSAGES.GENERIC_ERROR }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
