import { auth } from "@/lib/auth";
import { processAndStoreResume, saveResumeRecord, getLatestUserResume } from "@/lib/resume";
import { checkFeatureRateLimit } from "@/lib/rate-limit";
import { isGuestSession, checkGuestQuota, recordGuestAction, getGuestState, setGuestState, guestKeys, GUEST_CONFIG } from "@/lib/guest";
import { uploadFileToR2, isR2Configured } from "@/lib/storage/r2";
import { createSafeErrorResponse } from "@/lib/friendly-errors";

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
    let fileName = "resume.txt";
    let fileSize = 0;
    let fileMime = "text/plain";
    let fileBufferToStore: Buffer | undefined;

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
        fileName = file.name || "resume.pdf";
        fileSize = file.size;
        fileMime = file.type || (fileName.endsWith(".pdf") ? "application/pdf" : "text/plain");

        const arrayBuffer = await file.arrayBuffer();
        fileBufferToStore = Buffer.from(arrayBuffer);

        if (fileMime === "application/pdf" || fileName.endsWith(".pdf")) {
          pdfBuffer = fileBufferToStore;
        } else {
          textContent = new TextDecoder().decode(arrayBuffer);
        }
      } else if (textParam) {
        textContent = textParam;
        fileName = "pasted-resume.txt";
        fileSize = Buffer.byteLength(textContent, "utf-8");
        fileMime = "text/plain";
        fileBufferToStore = Buffer.from(textContent, "utf-8");
      }
    } else {
      // Handle standard JSON payload
      const json = await req.json().catch(() => ({}));
      textContent = json.resumeText || "";
      fileName = "pasted-resume.txt";
      fileSize = Buffer.byteLength(textContent, "utf-8");
      fileMime = "text/plain";
      fileBufferToStore = Buffer.from(textContent, "utf-8");
    }

    if (!pdfBuffer && (!textContent || textContent.trim().length < 10)) {
      return new Response(
        JSON.stringify({
          error: "Please provide a valid resume PDF file or at least 10 characters of resume text.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Process and store in Mem0 / Memory
    const result = await processAndStoreResume(userId, {
      pdfBuffer,
      text: textContent,
    });

    // 2. Cloudflare R2 Upload (for authenticated users when R2 is configured)
    let r2UploadResult: { key: string; url: string | null } | null = null;
    if (!isGuest && isR2Configured() && fileBufferToStore) {
      try {
        r2UploadResult = await uploadFileToR2({
          userId,
          fileBuffer: fileBufferToStore,
          fileName,
          contentType: fileMime,
        });
      } catch (r2Err) {
        console.error("[api/settings/resume] R2 upload warning:", r2Err);
      }
    }

    // 3. Save Resume record to PostgreSQL database (or guest Redis cache)
    let resumeRecordId: string | null = null;
    if (!isGuest) {
      resumeRecordId = await saveResumeRecord(userId, {
        fileName,
        fileSize,
        fileType: fileMime,
        storageKey: r2UploadResult?.key ?? null,
        storageUrl: r2UploadResult?.url ?? null,
        structured: result.structured,
      });
    } else {
      const guestResume = {
        id: "guest-resume",
        userId,
        fileName,
        fileSize,
        fileType: fileMime,
        storageKey: null,
        storageUrl: null,
        extractedSkills: result.structured.skills,
        suggestedLevel: result.structured.suggestedLevel,
        targetRole: result.structured.targetRole,
        summary: result.structured.summary,
        parsedData: result.structured,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setGuestState(guestKeys.profile(userId) + ":resume", guestResume, GUEST_CONFIG.SESSION_TTL);
      resumeRecordId = "guest-resume";
    }

    return new Response(
      JSON.stringify({
        success: true,
        resumeId: resumeRecordId,
        storage: r2UploadResult ? {
          key: r2UploadResult.key,
          url: r2UploadResult.url,
        } : null,
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
    return createSafeErrorResponse(err, { endpoint: "api/settings/resume [POST]" });
  }
}

export async function GET() {
  try {
    const session = (await (auth as unknown as () => Promise<unknown>)().catch(() => null)) as unknown as { user?: { email?: string; id?: string } } | null;
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";
    const isGuest = isGuestSession(userId);

    if (isGuest) {
      const guestResume = await getGuestState(guestKeys.profile(userId) + ":resume");
      return new Response(JSON.stringify({ resume: guestResume ?? null, isGuest: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const latest = await getLatestUserResume(userId);
    return new Response(
      JSON.stringify({
        resume: latest,
        isGuest: false,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return createSafeErrorResponse(err, { endpoint: "api/settings/resume [GET]" });
  }
}
