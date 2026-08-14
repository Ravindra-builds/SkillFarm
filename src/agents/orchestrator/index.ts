import type { MentorId } from "@/config/mentors";
import { routeQuery, keywordRoute } from "./router";
import { synthesizeParallel, streamSynthesis } from "./synthesizer";
import { getMentor } from "@/agents/mentors";
import { getLearningProfile } from "@/lib/learning-profile";
import { research, formatResourcesForPrompt } from "@/agents/research/research";
import { wrapUntrustedData } from "@/agents/mentors/tools";
import { getDeepUserContext } from "@/lib/memory/ingestion";
import { addMemory } from "@/lib/memory/mem0";
import { getLlmModel, isLlmConfigured } from "@/lib/llm";

/**
 * Orchestrator
 *
 * Entry point for chat. Decides single vs multi, runs parallel when needed,
 * and returns a streaming Response.
 */

export async function orchestrate(
  query: string,
  userId: string,
  conversationHistory: { role: string; content: string }[],
  opts?: { forceMentorId?: MentorId; provider?: string; model?: string }
) {
  // Manual override: if user explicitly picked a mentor, skip routing
  if (opts?.forceMentorId) {
    const mentor = getMentor(opts.forceMentorId);
    if (!mentor) throw new Error(`Unknown mentor ${opts.forceMentorId}`);
    return {
      mode: "single" as const,
      mentorId: opts.forceMentorId,
      decision: {
        intent: query.slice(0, 120),
        domain: opts.forceMentorId,
        requiredMentors: [opts.forceMentorId] as MentorId[],
        reasoning: "Manual selection — bypassed orchestrator",
        confidence: 1,
        requiresResearch: false,
        isMultiMentor: false,
      },
    };
  }

  // Auto routing
  const context = await getProfileContext(userId);
  const decision = await routeQuery(query, context, { provider: opts?.provider, model: opts?.model });

  if (decision.requiredMentors.length === 1) {
    return { mode: "single" as const, mentorId: decision.requiredMentors[0], decision };
  }
  return { mode: "multi" as const, mentorIds: decision.requiredMentors, decision };
}

async function getProfileContext(userId: string): Promise<string> {
  try {
    const p = await getLearningProfile(userId);
    if (!p) return "No profile";
    return `Goal: ${p.goal}, Level: ${p.currentLevel}, Known: ${p.knownSkills.join(", ")}, Hours: ${p.weeklyHours}, Style: ${p.learningStyle}`;
  } catch {
    return "No profile";
  }
}

export async function runOrchestratedChat(
  query: string,
  userId: string,
  history: { role: string; content: string }[],
  conversationId: string,
  saveMessage: (cid: string, role: "assistant", content: string, mentorId: string) => Promise<unknown>,
  opts?: { provider?: string; model?: string }
) {
  const result = await orchestrate(query, userId, history, opts);
  const hasConfiguredLlm = isLlmConfigured(opts?.provider, opts?.model);

  if (result.mode === "single") {
    const mentorId = result.mentorId;
    const decision = result.decision;
    const mentor = getMentor(mentorId)!;

    // Single mentor mock fallback if not configured
    if (!hasConfiguredLlm) {
      const mock = `### ${mentor.config.name} (via Orchestrator) — mock\n\nYou asked: "${query.slice(0, 200)}" — routed to ${mentorId} (confidence ${decision.confidence}). Decision: ${decision.reasoning}\n\nMock insight: ${mentor.config.expertise.slice(0, 2).join(", ")} perspective.\n\nConfigure an LLM provider key for live responses.`;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          for (const ch of (mock.match(/.{1,30}/g) ?? [mock])) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: ch })}\n\n`));
            await new Promise((r) => setTimeout(r, 10));
          }
          await saveMessage(conversationId, "assistant", mock, mentorId).catch(() => {});
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "X-Is-Mock": "1", "X-Mentor-Id": mentorId, "X-Orchestrator": "1", "X-Decision": encodeURIComponent(JSON.stringify(decision)) },
      });
    }

    // Real single — delegate to mentor prompt
    const { streamText: streamTextFn } = await import("ai");
    let deepCtxPrompt = "";
    try {
      const deepCtx = await getDeepUserContext(userId, query);
      deepCtxPrompt = `\n\n${deepCtx.fullPromptContext}`;
    } catch {}

    let researchPromptCtx = "";
    let researchUsed = false;
    if (decision.requiresResearch) {
      try {
        const researchResult = await research(query, { maxResults: 4 });
        if (researchResult.resources.length > 0) {
          const rawFormatted = formatResourcesForPrompt(researchResult.resources);
          researchPromptCtx = `\n\n${wrapUntrustedData(rawFormatted)}`;
          researchUsed = true;
        }
      } catch (err) {
        console.error("[orchestrator] research lookup failed:", err);
      }
    }

    const streamResult = streamTextFn({
      model: getLlmModel({ provider: opts?.provider, model: opts?.model ?? mentor.model, role: "chat" }),
      system: mentor.prompt + deepCtxPrompt + researchPromptCtx,
      messages: [...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })), { role: "user" as const, content: query }],
      temperature: 0.7,
      maxOutputTokens: 800,
      onFinish: async ({ text }) => {
        await saveMessage(conversationId, "assistant", text, mentorId).catch(() => {});
        addMemory(userId, `User asked "${query.slice(0, 100)}" — Mentor responded with ${mentorId} guidance`).catch(() => {});
      },
    });
    return streamResult.toUIMessageStreamResponse({
      headers: {
        "X-Mentor-Id": mentorId,
        "X-Orchestrator": "1",
        "X-Decision": encodeURIComponent(JSON.stringify(decision)),
        ...(researchUsed ? { "X-Research-Used": "1" } : {}),
      } as unknown as Headers,
    });
  }

  // Multi — parallel + synthesis
  const multiResult = result as { mode: "multi"; mentorIds: MentorId[]; decision: typeof result.decision };
  const mentorIds = multiResult.mentorIds;
  const { text: combined, isMock } = await synthesizeParallel(query, mentorIds, userId, history, opts);
  return streamSynthesis(query, combined, mentorIds, userId, {
    conversationId,
    saveMessage,
    provider: opts?.provider,
    model: opts?.model,
  });
}

export { routeQuery, keywordRoute };
