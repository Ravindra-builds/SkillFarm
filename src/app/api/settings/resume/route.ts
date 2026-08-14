import { auth } from "@/lib/auth";
import { processAndStoreResume } from "@/lib/resume";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = (await (auth as unknown as () => Promise<unknown>)().catch(() => null)) as unknown as { user?: { email?: string; id?: string } } | null;
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";

    const contentType = req.headers.get("content-type") || "";

    let textContent = "";
    let pdfBuffer: Buffer | undefined;

    // Handle Multipart Form Data (PDF / text file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const textParam = formData.get("resumeText") as string | null;

      if (file && file.size > 0) {
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
