import { auth } from "@/lib/auth";
import { isGuestSession } from "@/lib/guest";
import { migrateGuestStateToUser } from "@/lib/migration";
import { createSafeAuthErrorResponse } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    const authUserId = user?.email || (user as { id?: string })?.id;

    if (!authUserId || isGuestSession(authUserId)) {
      return new Response(
        JSON.stringify({ error: "Only authenticated accounts can migrate guest state." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const json = await req.json().catch(() => ({}));
    const guestId = json.guestId as string | undefined;

    if (!guestId || !isGuestSession(guestId)) {
      return new Response(
        JSON.stringify({ error: "Valid guest identifier is required for migration." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const migrationResult = await migrateGuestStateToUser(guestId, authUserId);

    return new Response(
      JSON.stringify({
        success: migrationResult.success,
        migrated: migrationResult.migrated,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return createSafeAuthErrorResponse(err, "Failed to migrate guest session", "api/auth/migrate-guest");
  }
}
