import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getCapstoneProject,
  saveCapstoneProject,
  syncCapstoneFromRoadmap,
  toggleCapstoneTask,
  updateCapstoneRepo,
  setCurrentCapstoneWeek,
} from "@/lib/project-store";
import { getRoadmap } from "@/lib/roadmap-store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["toggle-task", "set-week", "update-repo", "sync", "update"]).optional().default("update"),
  taskId: z.string().optional(),
  completed: z.boolean().optional(),
  week: z.number().int().optional(),
  repoUrl: z.string().url().or(z.literal("")).optional(),
  // Legacy fields
  projectId: z.string().optional(),
  status: z.enum(["not-started", "in-progress", "completed"]).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";

    const roadmap = await getRoadmap(userId);
    let capstone = await getCapstoneProject(userId);

    // If no capstone or if roadmap was updated, auto-sync
    if (roadmap && (!capstone || capstone.tasks.length === 0)) {
      capstone = syncCapstoneFromRoadmap(userId, roadmap, capstone);
      await saveCapstoneProject(userId, capstone);
    }

    return new Response(
      JSON.stringify({
        capstone,
        roadmapTitle: roadmap?.title ?? "Active Learning Roadmap",
        roadmapCapstone: roadmap?.capstoneProject,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[api/projects GET] error:", err);
    return new Response(JSON.stringify({ error: "Failed to load capstone project" }), {
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
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { action, taskId, completed, week, repoUrl } = parsed.data;

    // Toggle a task in current week
    if (action === "toggle-task" && taskId !== undefined && completed !== undefined) {
      const updated = await toggleCapstoneTask(userId, taskId, completed);
      return new Response(JSON.stringify({ capstone: updated }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Set active view week
    if (action === "set-week" && week !== undefined) {
      const updated = await setCurrentCapstoneWeek(userId, week);
      return new Response(JSON.stringify({ capstone: updated }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update GitHub repo URL
    if (action === "update-repo" && repoUrl !== undefined) {
      const updated = await updateCapstoneRepo(userId, repoUrl);
      return new Response(JSON.stringify({ capstone: updated }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Force Re-sync from active Roadmap
    if (action === "sync") {
      const roadmap = await getRoadmap(userId);
      if (!roadmap || roadmap.nodes.length === 0) {
        return new Response(
          JSON.stringify({ error: "No active roadmap found to sync with." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const existing = await getCapstoneProject(userId);
      const synced = syncCapstoneFromRoadmap(userId, roadmap, existing);
      await saveCapstoneProject(userId, synced);
      return new Response(
        JSON.stringify({ success: true, capstone: synced }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Legacy update fallback
    if (repoUrl !== undefined) {
      const updated = await updateCapstoneRepo(userId, repoUrl);
      return new Response(JSON.stringify({ capstone: updated }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unrecognized action" }), {
      status: 400,
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
