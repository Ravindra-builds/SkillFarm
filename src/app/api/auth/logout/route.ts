import { clearCustomSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await clearCustomSession();
    return new Response(JSON.stringify({ success: true, redirectUrl: "/login" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[api/auth/logout] error:", err);
    return new Response(JSON.stringify({ error: "Failed to sign out" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
