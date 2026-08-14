/**
 * Scope guard — detect requests asking for unbounded/infinite generation
 *
 * Detection is pure string logic — zero latency, no LLM required.
 */
export function detectScopeViolation(text: string): {
  violated: boolean;
  suggestion: string;
} {
  const q = text.toLowerCase();

  // Explicit unbounded-generation phrases
  const scopePhrases = [
    "write all the code",
    "generate the entire project",
    "build a full",
    "build the full",
    "complete implementation",
    "entire codebase",
    "generate everything",
    "do everything for me",
    "full application",
    "build me a full",
    "create the entire",
    "write the entire",
    "code the whole",
    "implement the whole",
    "build the whole",
    "generate all the code",
    "write all code",
    "full stack app",
    "full-stack app",
    "end to end app",
    "end-to-end app",
    "entire backend",
    "entire frontend",
    "entire project",
    "whole application",
    "whole project",
  ];

  for (const phrase of scopePhrases) {
    if (q.includes(phrase)) {
      return {
        violated: true,
        suggestion: `Instead of asking for a complete build, try a specific question like: "How do I structure the auth layer?" or "Show me how to set up the database schema for a SaaS app."`,
      };
    }
  }

  // Long message + implementation-heavy intent (likely a spec dump)
  if (text.length > 1200) {
    const hasImplementIntent = [
      "build me",
      "create me",
      "make me",
      "implement this",
      "write this for me",
      "code this",
      "generate this",
    ].some((p) => q.includes(p));
    if (hasImplementIntent) {
      return {
        violated: true,
        suggestion: `This looks like a full specification. Break it into one specific question at a time — e.g., start with the data model, then auth, then the API layer.`,
      };
    }
  }

  // Multi-step enumeration overload (5+ numbered build steps in one message)
  const numberedSteps = (text.match(/\b(\d+)[.)]/g) ?? []).length;
  if (
    numberedSteps >= 5 &&
    (q.includes("implement") || q.includes("build") || q.includes("create"))
  ) {
    return {
      violated: true,
      suggestion: `You've listed multiple build steps at once. Ask about one step at a time — mentors teach best when focused on a single concept or problem.`,
    };
  }

  return { violated: false, suggestion: "" };
}
