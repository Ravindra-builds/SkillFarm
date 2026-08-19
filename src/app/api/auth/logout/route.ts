import { clearCustomSession } from "@/lib/session";
import { createSafeAuthErrorResponse } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await clearCustomSession();
    return new Response(JSON.stringify({ success: true, redirectUrl: "/login" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return createSafeAuthErrorResponse(err, "Failed to sign out", "api/auth/logout");
  }
}
