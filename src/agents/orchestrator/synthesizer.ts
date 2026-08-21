import { streamText, generateText } from "ai";
import { getMentor } from "@/agents/mentors";
import type { MentorId } from "@/config/mentors";
import { synthesizerSystemPrompt } from "./prompt";
import { getLearningProfile } from "@/lib/learning-profile";
import { addMemory, shouldPersistChatMemory } from "@/lib/memory/mem0";
import { getDeepUserContext } from "@/lib/memory/ingestion";
import { getLlmModel, isLlmConfigured, getActiveLlmProvider } from "@/lib/llm";

/**
 * Synthesizer
 *
 * When orchestrator picks multiple mentors, we consult them in parallel
 * (generateText) and then stream a synthesized answer.
 * When no LLM key is configured, we do a deterministic mock synthesis.
 */

export async function synthesizeParallel(
  query: string,
  mentorIds: MentorId[],
  userId: string,
  conversationHistory: { role: string; content: string }[],
  options?: { provider?: string; model?: string }
): Promise<{ text: string; isMock: boolean }> {
  const hasConfiguredLlm = isLlmConfigured(options?.provider, options?.model);
  if (!hasConfiguredLlm) {
    const parts = mentorIds.map((id) => {
      const m = getMentor(id);
      return `**${m?.config.name ?? id}:** Mock insight for "${query.slice(0, 80)}" — ${m?.config.expertise.slice(0, 2).join(", ")} perspective.`;
    });
    const mock = `**Consulted: ${mentorIds.join(" + ")}** (mock synthesis — add API key for live)\n\n${parts.join("\n\n")}\n\n**Synthesized next step:** Build a tiny project that combines ${mentorIds.join(" + ")} — e.g., a rate-limited, validated API with auth review.`;
    return { text: mock, isMock: true };
  }

  // Load deep context (Profile + Mem0 Long-Term Memories + Active Projects)
  let deepContextPrompt = "";
  try {
    const deep = await getDeepUserContext(userId, query);
    deepContextPrompt = `\n\n${deep.fullPromptContext}`;
  } catch {
    try {
      const profile = await getLearningProfile(userId);
      if (profile) {
        deepContextPrompt = `\n\nUser context: Goal: ${profile.goal}, Level: ${profile.currentLevel}, Known: ${profile.knownSkills.join(", ")}`;
      }
    } catch {}
  }

  const historyMessages = conversationHistory.slice(-4).map((h) => ({
    role: h.role as "user" | "assistant",
    content: h.content,
  }));

  // Parallel generation for each mentor with conversation history and deep context
  const results = await Promise.all(
    mentorIds.map(async (id) => {
      const mentor = getMentor(id);
      if (!mentor) return `[Missing mentor ${id}]`;
      const { text } = await generateText({
        model: getLlmModel({ provider: options?.provider, model: options?.model ?? mentor.model, role: "chat" }),
        system: mentor.prompt + deepContextPrompt,
        messages: [...historyMessages, { role: "user" as const, content: query }],
        temperature: 0.7,
        maxOutputTokens: 600,
      });
      return `### ${mentor.config.name} perspective:\n${text}`;
    })
  );

  return { text: results.join("\n\n---\n\n"), isMock: false };
}

export async function streamSynthesis(
  query: string,
  mentorOutputs: string,
  mentorIds: MentorId[],
  userId: string,
  opts?: {
    conversationId?: string;
    saveMessage?: (cid: string, role: "assistant", content: string, mentorId: string) => Promise<unknown>;
    provider?: string;
    model?: string;
  }
) {
  let deepContextPrompt = "";
  try {
    const deep = await getDeepUserContext(userId, query);
    deepContextPrompt = `\n\n${deep.fullPromptContext}`;
  } catch {
    try {
      const profile = await getLearningProfile(userId);
      if (profile) {
        deepContextPrompt = `\n\nUser context: Goal: ${profile.goal}, Level: ${profile.currentLevel}, Known: ${profile.knownSkills.join(", ")}`;
      }
    } catch {}
  }

  const hasConfiguredLlm = isLlmConfigured(opts?.provider, opts?.model);
  if (!hasConfiguredLlm) {
    const encoder = new TextEncoder();
    const mock = `**Consulted: ${mentorIds.join(" + ")}** (mock synthesis)\n\n${mentorOutputs}\n\n*Configure an LLM API key (${getActiveLlmProvider()}) for live synthesis.*`;
    const chunks = mock.match(/.{1,30}/g) ?? [mock];
    const stream = new ReadableStream({
      async start(controller) {
        for (const ch of chunks) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: ch })}\n\n`));
          await new Promise((r) => setTimeout(r, 10));
        }
        if (opts?.conversationId && opts?.saveMessage) {
          await opts.saveMessage(opts.conversationId, "assistant", mock, mentorIds.join(",")).catch(() => {});
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Is-Mock": "1",
        "X-Mentor-Id": mentorIds.join(","),
      },
    });
  }

  const result = streamText({
    model: getLlmModel({ provider: opts?.provider, model: opts?.model, role: "synthesizer" }),
    system: synthesizerSystemPrompt + deepContextPrompt + `\n\nQuery: ${query}\n\nMentor outputs:\n${mentorOutputs}`,
    prompt: `Synthesize the above specialist perspectives into one final answer for: "${query}"`,
    temperature: 0.6,
    maxOutputTokens: 800,
    onFinish: async ({ text }) => {
      if (opts?.conversationId && opts?.saveMessage) {
        await opts.saveMessage(opts.conversationId, "assistant", text, mentorIds.join(",")).catch(() => {});
      }
      if (shouldPersistChatMemory(query, 0, true)) {
        addMemory(userId, `Multi-mentor advice synthesized (${mentorIds.join(" + ")}) for: "${query.slice(0, 100)}"`).catch(() => {});
      }
    },
  });

  return result.toUIMessageStreamResponse({
    headers: { "X-Mentor-Id": mentorIds.join(",") } as unknown as Headers,
  });
}
