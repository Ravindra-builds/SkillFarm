import { streamText } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getLearningProfile } from "@/lib/learning-profile";
import { getMentor, DEFAULT_MENTOR_ID, isValidMentorId } from "@/agents/mentors";
import { ensureConversation, saveMessage } from "@/lib/chat-store";
import { routeQuery } from "@/agents/orchestrator/router";
import { synthesizeParallel, streamSynthesis } from "@/agents/orchestrator/synthesizer";
import { detectHandoff, parseExplicitHandoff } from "@/agents/orchestrator/handoff";
import { saveHandoff } from "@/lib/handoff-store";
import type { MentorId } from "@/config/mentors";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkPlanLimit, incrementPlanUsage } from "@/lib/subscription";
import { detectScopeViolation } from "@/lib/scope-guard";
import { getLlmModel, isLlmConfigured, getActiveLlmProvider } from "@/lib/llm";
import { formatUserFacingError } from "@/lib/friendly-errors";
import { getDeepUserContext } from "@/lib/memory/ingestion";
import { addMemory } from "@/lib/memory/mem0";
import {
  isGuestSession,
  checkGuestQuota,
  recordGuestAction,
  getGuestTemplateChatResponse,
  GUEST_CONFIG,
} from "@/lib/guest";

export const dynamic = "force-dynamic";

// Zod schema — max 4000 chars per message.
// Allows optional provider and model overrides for future UI/settings selection.
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
  provider: z.string().optional(),
  model: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Mock response generator — used when OPENAI_API_KEY is absent or a placeholder
// ---------------------------------------------------------------------------
function mockResponse(
  mentorId: string,
  userContent: string,
  profile?: Awaited<ReturnType<typeof getLearningProfile>>
) {
  const level = profile?.currentLevel ?? "intermediate";
  const skills = profile?.knownSkills?.join(", ") ?? "JavaScript, React";
  const goal = profile?.goal ?? "become a production-ready engineer";
  const mentor = getMentor(mentorId) ?? getMentor(DEFAULT_MENTOR_ID)!;
  const name = mentor.config.name;

  const samples: Record<string, string> = {
    backend: `Validate at the edge (Zod), use proper HTTP codes, keep transactions small.`,
    "ai-engineer": `Start with a simple RAG: chunk 400-600 tokens, embed with small model, retrieve top 5, re-rank, and always eval with a tiny golden set.`,
    frontend: `Use Server Components for data fetching, client for interactivity. Add skeletons + error boundaries, and keep bundle <200kb.`,
    devops: `Dockerize with multi-stage build, add health check, and deploy to Vercel/Neon with preview envs. Don't leak secrets.`,
    security: `Highest risk first: validate input (Zod), rate-limit auth routes, use httpOnly cookies for refresh, short-lived JWTs, and rotate secrets.`,
    "system-design": `Start with the simplest architecture that meets constraints. Sketch: Client → API → DB, add cache/queue only after measuring a bottleneck.`,
  };

  const core = samples[mentorId] ?? samples.backend;

  const codeSnippet =
    mentorId === "backend"
      ? `import express from "express";\nimport { z } from "zod";\nconst CreateUser = z.object({ email: z.string().email() });\napp.post("/users", (req,res)=>{ const p=CreateUser.safeParse(req.body); if(!p.success) return res.status(400).json(p.error.flatten()); res.status(201).json({ok:true}); });`
      : mentorId === "frontend"
      ? `// Next.js Server Component\nasync function UserCard({id}:{id:string}){\n  const user = await fetch(\`/api/users/\${id}\`).then(r=>r.json());\n  return <div className="rounded-xl border p-4">{user.name}</div>;\n}`
      : mentorId === "ai-engineer"
      ? `import { openai } from "@ai-sdk/openai";\nimport { streamText } from "ai";\nconst result = streamText({ model: openai("gpt-4o-mini"), prompt: "Hello" });`
      : mentorId === "devops"
      ? `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nEXPOSE 3000\nHEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1\nCMD ["node","server.js"]`
      : mentorId === "security"
      ? `import rateLimit from "express-rate-limit";\napp.use("/login", rateLimit({ windowMs: 60000, max: 5 }));\n// Store refresh in httpOnly cookie, not localStorage\nres.cookie("refresh", token, { httpOnly: true, secure: true, sameSite: "lax" });`
      : `// System Design — simplest that ships\n// Client → API (Next.js) → Postgres (Neon) → Redis (Upstash) for cache\n// Measure before adding queues/microservices`;

  return `
### ${name} — direct answer

You asked: **"${userContent.slice(0, 200)}"**

**1. The core idea**
${core}

**2. Minimal runnable example (${mentor.config.role})**
\`\`\`ts
// Example tailored for ${name}
${codeSnippet}
\`\`\`

**3. What people usually get wrong**
- ${mentor.config.expertise.slice(0, 2).join(" vs ")} trade-offs are skipped in tutorials — you need to measure before optimizing.
- Forgetting the basics (validation, error states, or health checks) while chasing "scale."

**4. Your next step / tiny project**
Build a tiny ${mentor.config.role.toLowerCase()} task: ${mentor.config.expertise[0]} — map to your stack **${skills}** (${level}) and goal **${goal}**.

> *Preview mode — add a real \`OPENAI_API_KEY\` to enable live ${name} streaming with full orchestrator routing.*
`.trim();
}

// ---------------------------------------------------------------------------
// Helper — stream a text string chunk-by-chunk as SSE
// ---------------------------------------------------------------------------
function streamTextAsSSE(
  text: string,
  conversationId: string,
  mentorId: string,
  extraHeaders: Record<string, string> = {},
  delayMs = 12
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const chunks = text.match(/[\s\S]{1,24}/g) ?? [text];
      for (const ch of chunks) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "text", text: ch })}\n\n`)
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
      await saveMessage(conversationId, "assistant", text, mentorId).catch(() => {});
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
      "X-Conversation-Id": conversationId,
      ...extraHeaders,
    },
  });
}

// ---------------------------------------------------------------------------
// Helper — build the system prompt string for a mentor + optional user context
// ---------------------------------------------------------------------------
function buildSystemPrompt(
  mentor: ReturnType<typeof getMentor>,
  profile: Awaited<ReturnType<typeof getLearningProfile>>,
  deepContext?: Awaited<ReturnType<typeof getDeepUserContext>> | null,
  suffix?: string
): string {
  const contextBlock = deepContext?.fullPromptContext
    ? `\n\n${deepContext.fullPromptContext}`
    : profile
    ? `\n\nUser context:\n- Goal: ${profile.goal}\n- Level: ${profile.currentLevel}\n- Known: ${profile.knownSkills.join(", ")}\n- Weekly hours: ${profile.weeklyHours}\n- Style: ${profile.learningStyle}`
    : "";

  return [mentor!.prompt, contextBlock, suffix ? `\n\n${suffix}` : ""].join("");
}

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  let conversationId: string | undefined;
  let userId = "guest-preview-user";

  try {
    const session = (await auth().catch(() => null)) as unknown as {
      user?: { email?: string; id?: string };
    } | null;
    userId = session?.user?.email ?? session?.user?.id ?? "guest-preview-user";

    // ── Rate Limiting — 30 req/min ─────────────────────────────────────────
    const rateCheck = await checkRateLimit(`chat:${userId}`, 30, 60);
    if (!rateCheck.success) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please wait before sending more messages.",
          retryAfter: rateCheck.resetSec,
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

    // ── Subscription Plan Check ────────────────────────────────────────────
    const planCheck = await checkPlanLimit(userId, "mentorMessages");
    if (!planCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `Free plan limit reached (${planCheck.currentUsage}/${planCheck.maxLimit} messages). Upgrade to Pro for unlimited AI mentor access.`,
          isPlanLimit: true,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    await incrementPlanUsage(userId, "mentorMessages");

    // ── Parse & validate body ──────────────────────────────────────────────
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid messages", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const {
      messages,
      conversationId: cid,
      mentorId: mid,
      provider: requestedProvider,
      model: requestedModel,
    } = parsed.data;

    // ── Routing mode ───────────────────────────────────────────────────────
    const isManual = mid ? isValidMentorId(mid) : false;
    const requestedMentorId = isManual ? (mid as string) : null;

    // ── Extract last user message + history ────────────────────────────────
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const lastUserText = lastUser
      ? (lastUser.content ?? lastUser.parts?.map((p) => p.text ?? "").join("") ?? "")
      : "";
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content:
        (m as unknown as { content?: string }).content ??
        m.parts?.map((p) => p.text ?? "").join("") ??
        "",
    }));

    // ── Ensure conversation ────────────────────────────────────────────────
    const convo = await ensureConversation(
      userId,
      cid,
      isManual ? requestedMentorId! : undefined
    );
    conversationId = convo.id;
    let userQuery = lastUserText;
    const isGuest = isGuestSession(userId);

    if (isGuest && userQuery.length > GUEST_CONFIG.MAX_INPUT_SIZE) {
      userQuery = userQuery.slice(0, GUEST_CONFIG.MAX_INPUT_SIZE);
    }

    if (userQuery) {
      await saveMessage(conversationId, "user", userQuery, null).catch(() => {});
    }

    // ── Guest Mode Quota Check (Per-conversation + Total Session Limits) ────
    if (isGuest) {
      const guestQuota = await checkGuestQuota(userId, "chat", { conversationId });
      if (!guestQuota.allowed) {
        const templateResponse = getGuestTemplateChatResponse(
          isManual ? (requestedMentorId || "backend") : "orchestrator",
          userQuery
        );
        if (conversationId && userQuery) {
          await saveMessage(
            conversationId,
            "assistant",
            templateResponse,
            isManual ? requestedMentorId : "orchestrator"
          ).catch(() => {});
        }
        return streamTextAsSSE(
          templateResponse,
          conversationId,
          isManual ? (requestedMentorId || DEFAULT_MENTOR_ID) : DEFAULT_MENTOR_ID,
          {
            "X-Guest-Limit-Reached": "1",
            "X-Guest-Conversion-Notice": encodeURIComponent(guestQuota.conversionNotice || ""),
          }
        );
      }
      await recordGuestAction(userId, "chat", { conversationId });
    }

    // ── Learning profile & Mem0 Long-term Context ───────────────────────────
    let profile: Awaited<ReturnType<typeof getLearningProfile>> = null;
    let deepContext: Awaited<ReturnType<typeof getDeepUserContext>> | null = null;
    try {
      [profile, deepContext] = await Promise.all([
        getLearningProfile(userId).catch(() => null),
        getDeepUserContext(userId, lastUserText).catch(() => null),
      ]);
    } catch {
      // Non-fatal — chat works without profile/memories, just loses deep personalization
    }

    // ── Scope guard — reject unbounded generation requests ───────────────────
    const scopeCheck = detectScopeViolation(lastUserText);
    if (scopeCheck.violated) {
      return new Response(
        JSON.stringify({
          error: "scope_too_broad",
          message:
            "SkillFarm mentors teach, advise, and review — they don't generate entire codebases or full application specs. Break your question into one specific part and ask that.",
          suggestion: scopeCheck.suggestion,
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const hasKey = isLlmConfigured(requestedProvider, requestedModel);

    // ══════════════════════════════════════════════════════════════════════
    // AUTO MODE — Orchestrator + Handoff detection
    // ══════════════════════════════════════════════════════════════════════
    if (!isManual) {
      // Check for explicit handoff token emitted by the last assistant message
      let explicitHandoff: ReturnType<typeof parseExplicitHandoff> = null;
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
      if (lastAssistant) {
        const lastText =
          lastAssistant.content ??
          lastAssistant.parts?.map((p) => p.text ?? "").join("") ??
          "";
        explicitHandoff = parseExplicitHandoff(lastText);
      }

      let handoffToSave: { from: MentorId; to: MentorId; reason: string } | null = null;
      let handoffDecision: Awaited<ReturnType<typeof detectHandoff>> | null = null;

      if (explicitHandoff) {
        const from =
          (convo.activeMentorId as MentorId | null) ?? ("backend" as MentorId);
        handoffToSave = {
          from,
          to: explicitHandoff.toMentorId,
          reason: explicitHandoff.reason,
        };
      } else if (convo.activeMentorId) {
        const h = await detectHandoff(
          lastUserText,
          convo.activeMentorId as MentorId,
          history,
          { provider: requestedProvider, model: requestedModel }
        );
        if (h.shouldHandoff && h.toMentorId) {
          handoffDecision = h;
          handoffToSave = {
            from: h.fromMentorId!,
            to: h.toMentorId!,
            reason: h.reason,
          };
        }
      }

      let decision: Awaited<ReturnType<typeof routeQuery>>;
      let isHandoffFlow = false;
      let handoffHeaders: Record<string, string> = {};

      if (handoffToSave) {
        isHandoffFlow = true;
        await saveHandoff(
          conversationId,
          handoffToSave.from,
          handoffToSave.to,
          handoffToSave.reason
        ).catch(() => {});
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
        decision = await routeQuery(
          lastUserText,
          deepContext
            ? `${deepContext.profileSummary}\n${deepContext.memoriesSummary}`
            : profile
            ? `Goal: ${profile.goal}, Level: ${profile.currentLevel}, Known: ${profile.knownSkills.join(", ")}`
            : undefined,
          { provider: requestedProvider, model: requestedModel }
        );
      }

      // Update active mentor on conversation after routing
      if (!isHandoffFlow) {
        try {
          await ensureConversation(userId, conversationId, decision.requiredMentors[0]);
        } catch {}
      }

      // ── Single mentor ────────────────────────────────────────────────────
      if (decision.requiredMentors.length === 1) {
        const mentorId = decision.requiredMentors[0];
        const mentor = getMentor(mentorId)!;
        const orchestratorHeaders = {
          "X-Mentor-Id": mentorId,
          "X-Orchestrator": "1",
          "X-Decision": encodeURIComponent(JSON.stringify(decision)),
          ...handoffHeaders,
        };

        if (!hasKey) {
          const mockText = mockResponse(mentorId, lastUserText, profile);
          const withHeader = `**Orchestrator → ${mentor.config.name}** (confidence ${Math.round(decision.confidence * 100)}%)\n*Reason: ${decision.reasoning}*\n\n${mockText}`;
          return streamTextAsSSE(withHeader, conversationId, mentorId, orchestratorHeaders);
        }

        const result = streamText({
          model: getLlmModel({
            provider: requestedProvider,
            model: requestedModel ?? mentor.model,
            role: "chat",
          }),
          system: buildSystemPrompt(
            mentor,
            profile,
            deepContext,
            `You are ${mentor.config.name} — routed by orchestrator (reason: ${decision.reasoning}). Stay in scope.`
          ),
          // Cap history to last 8 messages to control context window size and cost.
          messages: [...history.slice(-8), { role: "user" as const, content: lastUserText }],
          temperature: 0.7,
          maxOutputTokens: 800,
          onFinish: async ({ text }) => {
            await saveMessage(conversationId!, "assistant", text, mentorId).catch(() => {});
            addMemory(
              userId,
              `User asked about "${lastUserText.slice(0, 100)}" — Mentor gave ${mentorId} guidance: ${text.slice(0, 140)}...`,
              "chat_interaction"
            ).catch(() => {});
          },
        });

        return result.toUIMessageStreamResponse({
          headers: orchestratorHeaders as unknown as Headers,
        });
      }

      // ── Multi-mentor → parallel + synthesis ─────────────────────────────
      const mentorIds = decision.requiredMentors;
      const multiHeaders = {
        "X-Mentor-Id": mentorIds.join(","),
        "X-Orchestrator": "1",
        "X-Decision": encodeURIComponent(JSON.stringify(decision)),
        ...handoffHeaders,
      };

      if (!hasKey) {
        const perMentor = mentorIds.map(
          (id) =>
            `**${getMentor(id)!.config.name}:** Mock for "${lastUserText.slice(0, 60)}" — ${getMentor(id)!.config.expertise[0]}`
        );
        const mockSynth = [
          `**Orchestrator → Consulted: ${mentorIds.join(" + ")}** (mock, confidence ${Math.round(decision.confidence * 100)}%)`,
          `*Reason: ${decision.reasoning}*`,
          "",
          perMentor.join("\n\n---\n\n"),
          "",
          `**Synthesized answer:** Combine ${mentorIds.join(" + ")} — e.g., validated API (Backend) + rate-limit + httpOnly (Security) + streaming (AI). Next: Build a tiny project tying them.`,
          "",
          `*Configure an LLM provider key (${getActiveLlmProvider()}) for live synthesis.*`,
        ].join("\n");

        return streamTextAsSSE(
          mockSynth,
          conversationId,
          mentorIds.join(","),
          multiHeaders,
          10
        );
      }

      const { text: combined, isMock: paraMock } = await synthesizeParallel(
        lastUserText,
        mentorIds as MentorId[],
        userId,
        history,
        { provider: requestedProvider, model: requestedModel }
      );

      if (paraMock) {
        return streamTextAsSSE(
          combined,
          conversationId,
          mentorIds.join(","),
          multiHeaders,
          10
        );
      }

      // Stream real synthesis — merge handoff headers so UI can show handoff
      const synthesisRes = await streamSynthesis(
        lastUserText,
        combined,
        mentorIds as MentorId[],
        userId,
        {
          conversationId,
          saveMessage,
          provider: requestedProvider,
          model: requestedModel,
        }
      );

      const mergedHeaders = new Headers(synthesisRes.headers);
      mergedHeaders.set("X-Conversation-Id", conversationId);
      for (const [k, v] of Object.entries(handoffHeaders)) mergedHeaders.set(k, v);
      return new Response(synthesisRes.body, {
        status: synthesisRes.status,
        statusText: synthesisRes.statusText,
        headers: mergedHeaders,
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // MANUAL MODE — Direct mentor, bypass orchestrator
    // ══════════════════════════════════════════════════════════════════════
    let mentorId = requestedMentorId as string;
    if (!isValidMentorId(mentorId)) mentorId = DEFAULT_MENTOR_ID;
    const mentor = getMentor(mentorId) ?? getMentor(DEFAULT_MENTOR_ID)!;

    if (!hasKey) {
      return streamTextAsSSE(
        mockResponse(mentorId, lastUserText || "Hello", profile),
        conversationId,
        mentorId
      );
    }

    const result = streamText({
      model: getLlmModel({
        provider: requestedProvider,
        model: requestedModel ?? mentor.model,
        role: "chat",
      }),
      system: buildSystemPrompt(
        mentor,
        profile,
        deepContext,
        `You are ${mentor.config.name} — stay in scope.`
      ),
      // Cap history to last 8 messages to control context window size and cost.
      messages: [...history.slice(-8), { role: "user" as const, content: lastUserText }],
      temperature: 0.7,
      maxOutputTokens: isGuest ? GUEST_CONFIG.MAX_OUTPUT_TOKENS : 800,
      onFinish: async ({ text }) => {
        await saveMessage(conversationId!, "assistant", text, mentorId).catch(() => {});
        addMemory(
          userId,
          `User asked about "${lastUserText.slice(0, 100)}" — Mentor gave ${mentorId} guidance: ${text.slice(0, 140)}...`,
          "chat_interaction"
        ).catch(() => {});
      },
    });

    return result.toUIMessageStreamResponse({
      headers: {
        "X-Mentor-Id": mentorId,
        "X-Conversation-Id": conversationId,
      } as unknown as Headers,
    });
  } catch (err) {
    // Technical error with full stack trace logged exclusively to server terminal for debugging
    console.error("🔴 [api/chat] Detailed server error:", err);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }

    const friendly = formatUserFacingError(err);
    return new Response(
      JSON.stringify({
        error: friendly.code,
        title: friendly.title,
        message: friendly.message,
        suggestion: friendly.suggestion,
        retryable: friendly.retryable,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
