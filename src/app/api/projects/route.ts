import { z } from "zod";
import { auth } from "@/lib/auth";
import { getProjects, saveProjects, updateProject, type ProjectStatus } from "@/lib/project-store";
import { getRoadmap } from "@/lib/roadmap-store";
import { generateProjectsFromRoadmap } from "@/agents/projects/generator";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  projectId: z.string().min(1),
  status: z.enum(["not-started", "in-progress", "completed"]).optional(),
  repoUrl: z.string().url().or(z.literal("")).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";

    let projects = await getProjects(userId);
    if (projects.length === 0) {
      const roadmap = await getRoadmap(userId);
      if (roadmap && roadmap.nodes.length > 0) {
        projects = generateProjectsFromRoadmap(userId, roadmap.nodes);
        await saveProjects(userId, projects);
      }
    }

    return new Response(JSON.stringify({ projects }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[api/projects GET] error:", err);
    return new Response(JSON.stringify({ error: "Failed to load projects" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";

    const json = await req.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { projectId, status, repoUrl } = parsed.data;
    const updated = await updateProject(userId, projectId, {
      status: status as ProjectStatus | undefined,
      repoUrl,
    });

    if (!updated) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ project: updated }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[api/projects POST] error:", err);
    return new Response(JSON.stringify({ error: "Failed to update project" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
