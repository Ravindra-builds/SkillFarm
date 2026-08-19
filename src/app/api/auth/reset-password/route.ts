import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRateLimitRule } from "@/config";
import { getClientIp } from "@/lib/ip";
import { consumePasswordResetToken, updateUserPassword } from "@/lib/password-auth";
import { AUTH_MESSAGES, createSafeAuthErrorResponse } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    const rule = getRateLimitRule("resetPassword");
    const rateCheck = await checkRateLimit(`reset:${ip}`, rule.limit, rule.windowSec);
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
    const parseResult = resetSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      const message = issue ? issue.message : AUTH_MESSAGES.RESET_LINK_INVALID;
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { token, password } = parseResult.data;

    const email = await consumePasswordResetToken(token);
    if (!email) {
      return new Response(
        JSON.stringify({ error: AUTH_MESSAGES.RESET_LINK_INVALID }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await updateUserPassword(email, password);

    return new Response(
      JSON.stringify({
        success: true,
        message: AUTH_MESSAGES.RESET_PASSWORD_SUCCESS,
        redirectUrl: "/login",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return createSafeAuthErrorResponse(err, AUTH_MESSAGES.RESET_LINK_INVALID, "api/auth/reset-password");
  }
}
