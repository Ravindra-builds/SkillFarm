import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  hashPassword,
  saveUserCredential,
  checkUserExists,
  createEmailVerificationToken,
} from "@/lib/password-auth";
import { createCustomSession } from "@/lib/session";
import { sendAuthEmail } from "@/lib/email-service";
import { AUTH_MESSAGES } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().max(50).optional().default(""),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "127.0.0.1";

    // Rate-limit: 10 signup attempts per minute per IP
    const rateCheck = await checkRateLimit(`signup:${ip}`, 10, 60);
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
    const parseResult = signupSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      const message = issue ? issue.message : AUTH_MESSAGES.GENERIC_ERROR;
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { firstName, lastName, email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();
    const fullName = lastName ? `${firstName.trim()} ${lastName.trim()}` : firstName.trim();

    // Check if account already exists
    const exists = await checkUserExists(normalizedEmail);
    if (exists) {
      return new Response(
        JSON.stringify({ error: "An account with this email already exists. Please sign in." }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Hash password and store credentials (unverified initially)
    const hash = await hashPassword(password);
    await saveUserCredential(normalizedEmail, fullName, hash, false);

    // Create verification token & dispatch verification email
    const token = await createEmailVerificationToken(normalizedEmail);
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const verifyUrl = `${origin}/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendAuthEmail({
      to: normalizedEmail,
      subject: "Verify your SkillFarm account",
      actionUrl: verifyUrl,
      actionText: "Verify Email Address",
      previewText: `Welcome to SkillFarm, ${firstName}! Please verify your email address to activate your full AI mentorship workspace.`,
      type: "verification",
    });

    // Create session
    await createCustomSession(normalizedEmail, fullName, false);

    return new Response(
      JSON.stringify({
        success: true,
        user: { email: normalizedEmail, name: fullName },
        redirectUrl: `/verify-email?email=${encodeURIComponent(normalizedEmail)}&token=${token}`,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[api/auth/signup] error:", err);
    return new Response(
      JSON.stringify({ error: AUTH_MESSAGES.GENERIC_ERROR }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
