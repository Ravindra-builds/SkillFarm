import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserStreak } from "@/lib/streak";

export const dynamic = "force-dynamic";

export async function GET() {
  let session: unknown = null;
  try {
    session = await (auth as unknown as () => Promise<unknown>)();
  } catch (err) {
    console.error("[api/streak] auth error:", err);
  }
  const user = (session as unknown as { user?: { email?: string; id?: string } } | null)?.user;
  const userId = user?.email ?? user?.id ?? "guest-preview-user";

  try {
    const streak = await getUserStreak(userId);
    return NextResponse.json(streak);
  } catch (err) {
    console.error("[api/streak] getUserStreak error:", err);
    return NextResponse.json({
      streakDays: 0,
      streakPercentile: 0,
      streakHistory: Array(7).fill(false),
    });
  }
}
