import { auth } from "@/lib/auth";
import { getUserAccountQuotaStats } from "@/lib/subscription";
import { createSafeErrorResponse } from "@/lib/friendly-errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = (await auth().catch(() => null)) as unknown as {
      user?: { email?: string; id?: string };
    } | null;
    const userId = session?.user?.email ?? session?.user?.id ?? "guest";
    const stats = await getUserAccountQuotaStats(userId);
    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return createSafeErrorResponse(err, { endpoint: "api/account/quotas [GET]" });
  }
}
