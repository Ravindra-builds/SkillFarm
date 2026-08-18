import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserCredential, verifyPassword, saveUserCredential, hashPassword } from "@/lib/password-auth";
import { createCustomSession } from "@/lib/session";
import { AUTH_MESSAGES } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "127.0.0.1";

    // Rate-limit: 10 login attempts per minute per IP
    const rateCheck = await checkRateLimit(`login:${ip}`, 10, 60);
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

    let cred = await getUserCredential(normalizedEmail);

    // If user has not created a password yet but exists in DB or dev demo mode,
    // support auto-provisioning for preview resilience
    if (!cred) {
      // In development/demo, allow new credentials to initialize smoothly
      if (process.env.NODE_ENV !== "production" && password.length >= 6) {
        const hash = await hashPassword(password);
        const name = normalizedEmail.split("@")[0];
        await saveUserCredential(normalizedEmail, name, hash);
        cred = { email: normalizedEmail, name, passwordHash: hash, createdAt: Date.now() };
      } else {
        return new Response(
          JSON.stringify({ error: AUTH_MESSAGES.INVALID_CREDENTIALS }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const isValid = await verifyPassword(password, cred.passwordHash);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: AUTH_MESSAGES.INVALID_CREDENTIALS }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create session cookie
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
    console.error("[api/auth/login] error:", err);
    return new Response(
      JSON.stringify({ error: AUTH_MESSAGES.GENERIC_ERROR }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
