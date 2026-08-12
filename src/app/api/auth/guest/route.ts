import { createCustomSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
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
