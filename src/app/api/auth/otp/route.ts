import { z } from "zod";
import { generateOTP, verifyOTP } from "@/lib/otp-store";
import { createCustomSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const IS_DEV = process.env.NODE_ENV !== "production";

const requestSchema = z.object({
  action: z.enum(["send", "verify"]),
  email: z.string().email(),
  code: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Rate-limit: 5 OTP requests per minute per IP (prevents enumeration & brute-force)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const rateCheck = await checkRateLimit(`otp:${ip}`, 5, 60);
    if (!rateCheck.success) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please wait before trying again.", retryAfter: rateCheck.resetSec }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rateCheck.resetSec) } }
      );
    }

    const json = await req.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid email or request payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { action, email, code } = parsed.data;

    if (action === "send") {
      const generated = generateOTP(email);
      // 🔒 SECURITY: Only include the preview code in non-production environments.
      // In production, this field is omitted — the code must arrive via email.
      return new Response(
        JSON.stringify({
          success: true,
          message: `OTP sent to ${email}`,
          ...(IS_DEV ? { previewCode: generated } : {}),
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (!code) {
        return new Response(JSON.stringify({ error: "OTP code is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const valid = verifyOTP(email, code);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Invalid or expired OTP code" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Establish session cookie
      await createCustomSession(email);

      return new Response(
        JSON.stringify({
          success: true,
          user: { email, name: email.split("@")[0] },
          redirectUrl: "/dashboard",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    console.error("[api/auth/otp] error:", err);
    return new Response(JSON.stringify({ error: "Authentication failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
