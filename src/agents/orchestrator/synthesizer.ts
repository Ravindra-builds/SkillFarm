import { streamText, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getMentor } from "@/agents/mentors";
import type { MentorId } from "@/config/mentors";
import { synthesizerSystemPrompt } from "./prompt";
import { getLearningProfile } from "@/lib/learning-profile";

/**
 * Synthesizer — Phase 5
 *
 * When orchestrator picks multiple mentors, we consult them in parallel
 * (generateText) and then stream a synthesized answer.
 * When no OPENAI_API_KEY, we do a deterministic mock synthesis.
 */

function isPlaceholder(v?: string | null) {
  if (!v) return true;
  const s = v.trim().toLowerCase();
  return s.includes("sk-...") || s.includes("replace-with") || s.length < 20 || !s.startsWith("sk-");
}

export async function synthesizeParallel(
  query: string,
  mentorIds: MentorId[],
  userId: string,
  conversationHistory: { role: string; content: string }[]
): Promise<{ text: string; isMock: boolean }> {
  const hasKey = process.env.OPENAI_API_KEY && !isPlaceholder(process.env.OPENAI_API_KEY);
  if (!hasKey) {
    // Mock synthesis — concatenate per-mentor mocks
    const parts = mentorIds.map((id) => {
      const m = getMentor(id);
      return `**${m?.config.name ?? id}:** Mock insight for "${query.slice(0, 80)}" — ${m?.config.expertise.slice(0, 2).join(", ")} perspective.`;
    });
    const mock = `**Consulted: ${mentorIds.join(" + ")}** (mock synthesis — add OPENAI_API_KEY for live)\n\n${parts.join("\n\n")}\n\n**Synthesized next step:** Build a tiny project that combines ${mentorIds.join(" + ")} — e.g., a rate-limited, validated API with auth review.`;
    return { text: mock, isMock: true };
  }

  // Load profile for context
  let profile: Awaited<ReturnType<typeof getLearningProfile>> = null;
  try {
    profile = await getLearningProfile(userId);
  } catch {}

  const profileCtx = profile
    ? `Goal: ${profile.goal}, Level: ${profile.currentLevel}, Known: ${profile.knownSkills.join(", ")}`
    : "No profile";

  // Parallel generation for each mentor
  const results = await Promise.all(
    mentorIds.map(async (id) => {
      const mentor = getMentor(id);
      if (!mentor) return `[Missing mentor ${id}]`;
      const { text } = await generateText({
        model: openai(mentor.model),
        system: mentor.prompt + `\n\nUser context: ${profileCtx}`,
        prompt: query,
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
  userId: string
) {
  let profile: Awaited<ReturnType<typeof getLearningProfile>> = null;
  try {
    profile = await getLearningProfile(userId);
  } catch {}

  const profileCtx = profile
    ? `Goal: ${profile.goal}, Level: ${profile.currentLevel}, Known: ${profile.knownSkills.join(", ")}`
    : "No profile";

  const hasKey = process.env.OPENAI_API_KEY && !isPlaceholder(process.env.OPENAI_API_KEY);
  if (!hasKey) {
    // Should not be called in mock multi — synthesizeParallel already returned mock
    const encoder = new TextEncoder();
    const mock = `**Consulted: ${mentorIds.join(" + ")}** (mock synthesis)\n\n${mentorOutputs}\n\n*Add OPENAI_API_KEY for live synthesis.*`;
    const chunks = mock.match(/.{1,30}/g) ?? [mock];
    const stream = new ReadableStream({
      async start(controller) {
        for (const ch of chunks) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: ch })}\n\n`));
          await new Promise((r) => setTimeout(r, 10));
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
    model: openai("gpt-4o-mini"),
    system: synthesizerSystemPrompt + `\n\nUser context: ${profileCtx}\n\nQuery: ${query}\n\nMentor outputs:\n${mentorOutputs}`,
    prompt: `Synthesize the above specialist perspectives into one final answer for: "${query}"`,
    temperature: 0.6,
    maxOutputTokens: 900,
  });

  return result.toUIMessageStreamResponse({
    headers: { "X-Mentor-Id": mentorIds.join(",") } as unknown as Headers,
  });
}
