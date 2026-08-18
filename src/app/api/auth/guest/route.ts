import { createCustomSession } from "@/lib/session";
import { checkGuestIpAbuse } from "@/lib/guest";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // IP-based abuse rate limiter (20 guest creations per 10min per IP hash)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "127.0.0.1";
    const ipCheck = await checkGuestIpAbuse(ip);
    if (!ipCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many guest sessions initiated from this network. Please wait a few minutes or sign in with Google.",
          retryAfter: 300,
        }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "300" } }
      );
    }

    const uniqueGuestId = `guest_${randomUUID().slice(0, 12)}`;
    await createCustomSession(`${uniqueGuestId}@skillfarm.local`, "Alex (Guest)", true);
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
