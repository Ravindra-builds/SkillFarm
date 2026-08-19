import { z } from "zod";
import { generateOTP, verifyOTP } from "@/lib/otp-store";
import { createCustomSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRateLimitRule } from "@/config";
import { getClientIp } from "@/lib/ip";
import { createSafeAuthErrorResponse } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

const IS_DEV = process.env.NODE_ENV !== "production";

const requestSchema = z.object({
  action: z.enum(["send", "verify"]),
  email: z.string().email(),
  code: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rule = getRateLimitRule("otp");
    const rateCheck = await checkRateLimit(`otp:${ip}`, rule.limit, rule.windowSec);
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
      const generated = await generateOTP(email);
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

      const valid = await verifyOTP(email, code);
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
    return createSafeAuthErrorResponse(err, "Authentication failed. Please try again.", "api/auth/otp");
  }
}
