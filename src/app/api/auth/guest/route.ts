import { createCustomSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Rate-limit: 10 guest sessions per minute per IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const rateCheck = await checkRateLimit(`guest-auth:${ip}`, 10, 60);
    if (!rateCheck.success) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait before trying again.", retryAfter: rateCheck.resetSec }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rateCheck.resetSec) } }
      );
    }

    await createCustomSession("guest-preview-user@skillfarm.local", "Alex (Guest)", true);
    return new Response(JSON.stringify({ success: true, redirectUrl: "/dashboard" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[api/auth/guest] error:", err);
    return new Response(JSON.stringify({ error: "Failed to establish guest session" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
