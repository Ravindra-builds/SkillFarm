import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getLearningProfile } from "@/lib/learning-profile";
import { getMentor, DEFAULT_MENTOR_ID, isValidMentorId } from "@/agents/mentors";
import { ensureConversation, saveMessage } from "@/lib/chat-store";
import { routeQuery } from "@/agents/orchestrator/router";
import { synthesizeParallel, streamSynthesis } from "@/agents/orchestrator/synthesizer";
import { detectHandoff, parseExplicitHandoff } from "@/agents/orchestrator/handoff";
import { saveHandoff } from "@/lib/handoff-store";
import { research, formatResourcesForPrompt } from "@/agents/research/research";
import type { ScoredResource } from "@/agents/research/scorer";
import type { MentorId } from "@/config/mentors";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkPlanLimit, incrementPlanUsage } from "@/lib/subscription";
import { startTraceTimer, estimateTokenCount, recordTrace } from "@/lib/observability";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system", "data"]),
        content: z.string().min(1).max(4000),
        parts: z
          .array(z.object({ type: z.string(), text: z.string().optional() }))
          .optional(),
      })
    )
    .min(1)
    .max(20),
  conversationId: z.string().uuid().optional(),
  mentorId: z.string().optional(),
});

function isPlaceholder(v?: string | null) {
  if (!v) return true;
  const s = v.trim().toLowerCase();
  return s.includes("sk-...") || s.includes("replace-with") || s.length < 20 || !s.startsWith("sk-");
}

function mockResponse(mentorId: string, userContent: string, profile?: Awaited<ReturnType<typeof getLearningProfile>>) {
  const level = profile?.currentLevel ?? "intermediate";
  const skills = profile?.knownSkills?.join(", ") ?? "JavaScript, React";
  const goal = profile?.goal ?? "become a production-ready engineer";
  const mentor = getMentor(mentorId) ?? getMentor(DEFAULT_MENTOR_ID)!;
  const name = mentor.config.name;

  const samples: Record<string, string> = {
    backend: `Validate at the edge (Zod), use proper HTTP codes, keep transactions small.`,
    "ai-engineer": `Start with a simple RAG: chunk 400-600 tokens, embed with small model, retrieve top 5, re-rank, and always eval with a tiny golden set.`,
    frontend: `Use Server Components for data fetching, client for interactivity. Add skeletons + error boundaries, and keep bundle <200kb.`,
    devops: `Dockerize with multi-stage build, add health check, and deploy to Vercel/Neon with preview envs. Don’t leak secrets.`,
    security: `Highest risk first: validate input (Zod), rate-limit auth routes, use httpOnly cookies for refresh, short-lived JWTs, and rotate secrets.`,
    "system-design": `Start with the simplest architecture that meets constraints. Sketch: Client → API → DB, add cache/queue only after measuring a bottleneck.`,
  };

  const core = samples[mentorId] ?? samples.backend;

  return `
### ${name} — direct answer

You asked: **"${userContent.slice(0, 200)}"**

**1. The core idea**
${core}

**2. Minimal runnable example (${mentor.config.role})**
\`\`\`ts
// Example tailored for ${name}
${mentorId === "backend" ? `import express from "express";\nimport { z } from "zod";\nconst CreateUser = z.object({ email: z.string().email() });\napp.post("/users", (req,res)=>{ const p=CreateUser.safeParse(req.body); if(!p.success) return res.status(400).json(p.error.flatten()); res.status(201).json({ok:true}); });` : mentorId === "frontend" ? `// Next.js Server Component\nasync function UserCard({id}:{id:string}){\n  const user = await fetch(\`/api/users/\${id}\`).then(r=>r.json());\n  return <div className="rounded-xl border p-4">{user.name}</div>;\n}` : mentorId === "ai-engineer" ? `import { openai } from "@ai-sdk/openai";\nimport { streamText } from "ai";\nconst result = streamText({ model: openai("gpt-4o-mini"), prompt: "Hello" });` : mentorId === "devops" ? `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nEXPOSE 3000\nHEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1\nCMD ["node","server.js"]` : mentorId === "security" ? `import rateLimit from "express-rate-limit";\napp.use("/login", rateLimit({ windowMs: 60000, max: 5 }));\n// Store refresh in httpOnly cookie, not localStorage\nres.cookie("refresh", token, { httpOnly: true, secure: true, sameSite: "lax" });` : `// System Design — simplest that ships\n// Client → API (Next.js) → Postgres (Neon) → Redis (Upstash) for cache\n// Measure before adding queues/microservices` }
\`\`\`

**3. What people usually get wrong**
- ${mentor.config.expertise.slice(0, 2).join(" vs ")} trade-offs are skipped in tutorials — you need to measure before optimizing.
- Forgetting the basics (validation, error states, or health checks) while chasing “scale.”

**4. Your next step / tiny project**
Build a tiny ${mentor.config.role.toLowerCase()} task: ${mentor.config.expertise[0]} — map to your stack **${skills}** (${level}) and goal **${goal}**.

> *Mock mode — add real \`OPENAI_API_KEY\` for live ${name} streaming. Phase 5 orchestrator makes this automatic.*
`.trim();
}

export async function POST(req: Request) {
  let isMock = false;
  let conversationId: string | undefined;
  let userId = "guest-preview-user";

  try {
    const session = (await auth().catch(() => null)) as unknown as { user?: { email?: string; id?: string } } | null;
    userId = session?.user?.email ?? session?.user?.id ?? "guest-preview-user";

    // Rate Limiting — 30 req/min
    const rateCheck = await checkRateLimit(`chat:${userId}`, 30, 60);
    if (!rateCheck.success) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait before sending more messages.", retryAfter: rateCheck.resetSec }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(rateCheck.resetSec) },
      });
    }

    // Subscription Plan Check (Phase 14)
    const planCheck = checkPlanLimit(userId, "mentorMessages");
    if (!planCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `Free plan limit reached (${planCheck.currentUsage}/${planCheck.maxLimit} messages). Upgrade to Pro for unlimited AI mentor access.`,
          isPlanLimit: true,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    incrementPlanUsage(userId, "mentorMessages");

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid messages", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages, conversationId: cid, mentorId: mid } = parsed.data;

    // Determine mode: manual if mid is a valid MentorId, auto otherwise (default)
    const isManual = mid ? isValidMentorId(mid) : false;
    const requestedMentorId = isManual ? (mid as string) : null;
    const isAuto = !isManual;

    // Extract last user text and history
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const lastUserText = lastUser ? lastUser.content ?? lastUser.parts?.map((p) => p.text ?? "").join("") ?? "" : "";
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: (m as unknown as { content?: string }).content ?? m.parts?.map((p) => p.text ?? "").join("") ?? "",
    }));

    // Ensure conversation and persist user message
    // For auto we don't know mentor yet, so ensure without it first, then update after routing
    const initialMentorForEnsure = isManual ? requestedMentorId! : undefined;
    const convo = await ensureConversation(userId, cid, initialMentorForEnsure);
    conversationId = convo.id;
    if (lastUserText) await saveMessage(conversationId, "user", lastUserText, null).catch(() => {});

    let profile: Awaited<ReturnType<typeof getLearningProfile>> = null;
    try {
      profile = await getLearningProfile(userId);
    } catch {}

    const hasKey = process.env.OPENAI_API_KEY && !isPlaceholder(process.env.OPENAI_API_KEY);

    // Phase 7-8: Research when orchestrator says requiresResearch
    let researchedResources: import("@/agents/research/scorer").ScoredResource[] | null = null;
    let researchHeader: string | null = null;
    // We need decision to know requiresResearch, but decision is only available in auto mode.
    // For manual mode, we also check if query looks like it needs resources (simple heuristic)
    const needsResearchHeuristic = lastUserText.toLowerCase().includes("resource") || lastUserText.toLowerCase().includes("tutorial") || lastUserText.toLowerCase().includes("best") || lastUserText.toLowerCase().includes("docs");
    // Research will be done inside auto branch after decision, and for manual if heuristic
    // To make it available for both, we will do it lazily inside each branch.
    // For now, just prepare a helper that can be called.

    // --- AUTO MODE: Orchestrator + Handoff (Phase 6) ---
    if (isAuto) {
      // Check for explicit handoff token in last assistant message (mentor-initiated)
      let explicitHandoff: ReturnType<typeof parseExplicitHandoff> = null;
      const lastAssistantForHandoff = [...messages].reverse().find((m) => m.role === "assistant");
      if (lastAssistantForHandoff) {
        const lastText = lastAssistantForHandoff.content ?? lastAssistantForHandoff.parts?.map((p) => p.text ?? "").join("") ?? "";
        explicitHandoff = parseExplicitHandoff(lastText);
      }

      let handoffToSave: { from: MentorId; to: MentorId; reason: string } | null = null;
      let handoffDecision: Awaited<ReturnType<typeof import("@/agents/orchestrator/handoff").detectHandoff>> | null = null;

      if (explicitHandoff) {
        const from = (convo.activeMentorId as MentorId | null) ?? (profile?.knownSkills?.includes("backend") ? "backend" : "backend") as MentorId;
        handoffToSave = { from, to: explicitHandoff.toMentorId, reason: explicitHandoff.reason };
      } else if (convo.activeMentorId) {
        // Orchestrator handoff detection based on query + current mentor
        const h = await import("@/agents/orchestrator/handoff").then((m) => m.detectHandoff(lastUserText, convo.activeMentorId as MentorId, history));
        if (h.shouldHandoff && h.toMentorId) {
          handoffDecision = h;
          handoffToSave = { from: h.fromMentorId!, to: h.toMentorId!, reason: h.reason };
        }
      }

      let decision: Awaited<ReturnType<typeof routeQuery>>;
      let isHandoffFlow = false;
      let handoffHeaders: Record<string, string> = {};

      if (handoffToSave) {
        // Handoff takes precedence over normal routing
        isHandoffFlow = true;
        await saveHandoff(conversationId, handoffToSave.from, handoffToSave.to, handoffToSave.reason).catch(() => {});
        await ensureConversation(userId, conversationId, handoffToSave.to).catch(() => {});
        decision = {
          intent: lastUserText.slice(0, 120),
          domain: handoffToSave.to,
          requiredMentors: [handoffToSave.to],
          reasoning: `Handoff: ${handoffToSave.reason} (${handoffToSave.from} → ${handoffToSave.to})`,
          confidence: handoffDecision?.confidence ?? 0.85,
          requiresResearch: false,
          isMultiMentor: false,
        } as unknown as Awaited<ReturnType<typeof routeQuery>>;
        handoffHeaders = {
          "X-Handoff-From": handoffToSave.from,
          "X-Handoff-To": handoffToSave.to,
          "X-Handoff-Reason": encodeURIComponent(handoffToSave.reason),
          "X-Handoff": "1",
        };
      } else {
        // Normal routing
        decision = await routeQuery(lastUserText, profile ? `Goal: ${profile.goal}, Level: ${profile.currentLevel}, Known: ${profile.knownSkills.join(", ")}` : undefined);
        handoffHeaders = {};
      }

      // Update conversation activeMentorId to reflect routing (first mentor or joined) — if not already handoff
      if (!isHandoffFlow) {
        const primaryMentor = decision.requiredMentors[0];
        try {
          await ensureConversation(userId, conversationId, primaryMentor);
        } catch {}
      }

      if (decision.requiredMentors.length === 1) {
        const mentorId = decision.requiredMentors[0];
        const mentor = getMentor(mentorId)!;

        if (!hasKey) {
          const full = mockResponse(mentorId, lastUserText, profile);
          const withHeader = `**Orchestrator → ${mentor.config.name}** (confidence ${Math.round(decision.confidence * 100)}%)\n*Reason: ${decision.reasoning}*\n\n${full}`;
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              const chunks = withHeader.match(/.{1,30}/g) ?? [withHeader];
              for (const ch of chunks) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: ch })}\n\n`));
                await new Promise((r) => setTimeout(r, 12));
              }
              await saveMessage(conversationId!, "assistant", withHeader, mentorId).catch(() => {});
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "X-Is-Mock": "1",
              "X-Mentor-Id": mentorId,
              "X-Orchestrator": "1",
              "X-Decision": encodeURIComponent(JSON.stringify(decision)),
              ...handoffHeaders,
            },
          });
        }

        // Real single via orchestrator
        const system = [
          mentor.prompt,
          profile ? `\n\nUser context:\n- Goal: ${profile.goal}\n- Level: ${profile.currentLevel}\n- Known: ${profile.knownSkills.join(", ")}\n- Weekly hours: ${profile.weeklyHours}\n- Style: ${profile.learningStyle}` : "",
          `\n\nYou are ${mentor.config.name} — routed by orchestrator (reason: ${decision.reasoning}). Stay in scope.`,
        ].join("");

        const aiMessages = [...history, { role: "user" as const, content: lastUserText }].map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }));

        const result = streamText({
          model: openai(mentor.model),
          system,
          messages: aiMessages,
          temperature: 0.7,
          maxOutputTokens: 800,
          onFinish: async ({ text }) => {
            await saveMessage(conversationId!, "assistant", text, mentorId).catch(() => {});
          },
        });

        return result.toUIMessageStreamResponse({
          headers: {
            "X-Mentor-Id": mentorId,
            "X-Orchestrator": "1",
            "X-Decision": encodeURIComponent(JSON.stringify(decision)),
            ...handoffHeaders,
          } as unknown as Headers,
        });
      } else {
        // Multi-mentor → parallel + synthesis
        const mentorIds = decision.requiredMentors;

        if (!hasKey) {
          // Mock multi: parallel mock + synthesis
          const perMentor = mentorIds.map((id) => `**${getMentor(id)!.config.name}:** Mock for "${lastUserText.slice(0, 60)}" — ${getMentor(id)!.config.expertise[0]}`);
          const mockSynth = `**Orchestrator → Consulted: ${mentorIds.join(" + ")}** (mock, confidence ${Math.round(decision.confidence * 100)}%)\n*Reason: ${decision.reasoning}*\n\n${perMentor.join("\n\n---\n\n")}\n\n**Synthesized answer:** Combine ${mentorIds.join(" + ")} — e.g., validated API (Backend) + rate-limit + httpOnly (Security) + streaming (AI). Next: Build a tiny project tying them.\n\n*Add OPENAI_API_KEY for live synthesis.*`;
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              for (const ch of (mockSynth.match(/.{1,30}/g) ?? [mockSynth])) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: ch })}\n\n`));
                await new Promise((r) => setTimeout(r, 10));
              }
              await saveMessage(conversationId!, "assistant", mockSynth, mentorIds.join(",")).catch(() => {});
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "X-Is-Mock": "1",
              "X-Mentor-Id": mentorIds.join(","),
              "X-Orchestrator": "1",
              "X-Decision": encodeURIComponent(JSON.stringify(decision)),
              ...handoffHeaders,
            },
          });
        }

        // Real multi: parallel generateText then stream synthesis
        const { text: combined, isMock: paraMock } = await synthesizeParallel(lastUserText, mentorIds as any, userId, history);
        if (paraMock) {
          // Should not happen when hasKey, but handle
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              for (const ch of (combined.match(/.{1,30}/g) ?? [combined])) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: ch })}\n\n`));
                await new Promise((r) => setTimeout(r, 10));
              }
              await saveMessage(conversationId!, "assistant", combined, mentorIds.join(",")).catch(() => {});
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "X-Is-Mock": "1",
              "X-Mentor-Id": mentorIds.join(","),
              "X-Orchestrator": "1",
              "X-Decision": encodeURIComponent(JSON.stringify(decision)),
              ...handoffHeaders,
            },
          });
        }

        // Stream synthesis — merge handoff headers so UI can show handoff
        const synthesisRes = await streamSynthesis(lastUserText, combined, mentorIds as any, userId);
        if (Object.keys(handoffHeaders).length > 0) {
          const headers = new Headers(synthesisRes.headers);
          for (const [k, v] of Object.entries(handoffHeaders)) headers.set(k, v);
          return new Response(synthesisRes.body, { status: synthesisRes.status, statusText: synthesisRes.statusText, headers });
        }
        return synthesisRes;
      }
    }

    // --- MANUAL MODE: direct mentor (bypass orchestrator) ---
    let mentorId = requestedMentorId as string;
    if (!isValidMentorId(mentorId)) mentorId = DEFAULT_MENTOR_ID;
    const mentor = getMentor(mentorId) ?? getMentor(DEFAULT_MENTOR_ID)!;

    if (!hasKey) {
      const userText = lastUserText || "Hello";
      const full = mockResponse(mentorId, userText, profile);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const chunks = full.match(/.{1,30}/g) ?? [full];
          for (const ch of chunks) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: ch })}\n\n`));
            await new Promise((r) => setTimeout(r, 12));
          }
          await saveMessage(conversationId!, "assistant", full, mentorId).catch(() => {});
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Is-Mock": "1",
          "X-Mentor-Id": mentorId,
        },
      });
    }

    const system = [
      mentor.prompt,
      profile
        ? `\n\nUser context:\n- Goal: ${profile.goal}\n- Level: ${profile.currentLevel}\n- Known: ${profile.knownSkills.join(", ")}\n- Weekly hours: ${profile.weeklyHours}\n- Style: ${profile.learningStyle}`
        : "",
      `\n\nYou are ${mentor.config.name} — stay in scope.`,
    ].join("");

    const aiMessages = [...history, { role: "user" as const, content: lastUserText }].map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    const result = streamText({
      model: openai(mentor.model),
      system,
      messages: aiMessages,
      temperature: 0.7,
      maxOutputTokens: 800,
      onFinish: async ({ text }) => {
        await saveMessage(conversationId!, "assistant", text, mentorId).catch(() => {});
      },
    });

    return result.toUIMessageStreamResponse({ headers: { "X-Mentor-Id": mentorId } as unknown as Headers });
  } catch (err) {
    console.error("[api/chat] fatal:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Chat failed", message, isMock: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
