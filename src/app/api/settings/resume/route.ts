import { z } from "zod";
import { auth } from "@/lib/auth";
import { parseAndStoreResume } from "@/lib/memory/resume-parser";

export const dynamic = "force-dynamic";

const schema = z.object({
  resumeText: z.string().min(10, "Resume text must be at least 10 characters long").max(15000),
});

export async function POST(req: Request) {
  try {
    const session = (await (auth as unknown as () => Promise<unknown>)().catch(() => null)) as unknown as { user?: { email?: string; id?: string } } | null;
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";

    const json = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid resume content", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await parseAndStoreResume(userId, parsed.data.resumeText);

    return new Response(JSON.stringify({ success: true, parsed: result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[api/settings/resume] error:", err);
    return new Response(JSON.stringify({ error: "Failed to parse resume" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
