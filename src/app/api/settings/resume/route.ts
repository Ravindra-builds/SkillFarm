import { auth } from "@/lib/auth";
import { processAndStoreResume } from "@/lib/resume";
import { checkFeatureRateLimit } from "@/lib/rate-limit";
import { isGuestSession, checkGuestQuota, recordGuestAction } from "@/lib/guest";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = (await (auth as unknown as () => Promise<unknown>)().catch(() => null)) as unknown as { user?: { email?: string; id?: string } } | null;
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";
    const isGuest = isGuestSession(userId);

    // ── Guest Mode Quota Check (1 Upload per session) ─────────────────────────
    if (isGuest) {
      const guestQuota = await checkGuestQuota(userId, "resume");
      if (!guestQuota.allowed) {
        return new Response(
          JSON.stringify({
            error: "Guest limit reached",
            message: "You have used your guest resume analysis. Create a free account to save your resume profile and extract continuous career skill matrices.",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      await recordGuestAction(userId, "resume");
    }

    // ── Centralized Rate Limiting (2/day prod, 10/day dev) ─────────────────────
    const rateCheck = await checkFeatureRateLimit(userId, "resume");
    if (!rateCheck.success) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Daily resume upload & analysis limit reached (${rateCheck.limit} per 24h). Please try again later.`,
          retryAfter: rateCheck.resetSec,
          limit: rateCheck.limit,
          remaining: rateCheck.remaining,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateCheck.resetSec),
          },
        }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    let textContent = "";
    let pdfBuffer: Buffer | undefined;

    // Handle Multipart Form Data (PDF / text file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const textParam = formData.get("resumeText") as string | null;

      if (file && file.size > 0) {
        if (file.size > 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: "File size exceeds 1MB limit. Please upload a smaller resume file." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        const arrayBuffer = await file.arrayBuffer();
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          pdfBuffer = Buffer.from(arrayBuffer);
        } else {
          textContent = new TextDecoder().decode(arrayBuffer);
        }
      } else if (textParam) {
        textContent = textParam;
      }
    } else {
      // Handle standard JSON payload
      const json = await req.json().catch(() => ({}));
      textContent = json.resumeText || "";
    }

    if (!pdfBuffer && (!textContent || textContent.trim().length < 10)) {
      return new Response(
        JSON.stringify({
          error: "Please provide a valid resume PDF file or at least 10 characters of resume text.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await processAndStoreResume(userId, {
      pdfBuffer,
      text: textContent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        parsed: {
          extractedSkills: result.structured.skills,
          experienceSummary: result.structured.summary,
          keyProjects: result.structured.projects.map((p) => `${p.name}: ${p.description}`),
          suggestedLevel: result.structured.suggestedLevel,
          targetRole: result.structured.targetRole,
          structured: result.structured,
        },
        memoriesStored: result.memoriesStored,
        rateLimit: {
          remaining: rateCheck.remaining,
          limit: rateCheck.limit,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[api/settings/resume] error:", err);
    const msg = err instanceof Error ? err.message : "Failed to parse resume";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
