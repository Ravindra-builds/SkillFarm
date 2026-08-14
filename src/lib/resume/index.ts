import { extractTextFromPdfBuffer } from "./pdf-extractor";
import { extractStructuredResume } from "./llm-extractor";
import { syncResumeToMem0 } from "./mem0-sync";
import type { StructuredResumeData, ResumeParseResult } from "./types";

export * from "./types";
export { extractTextFromPdfBuffer } from "./pdf-extractor";
export { extractStructuredResume } from "./llm-extractor";
export { syncResumeToMem0 } from "./mem0-sync";

/**
 * High-level unified resume parser & memory synchronization engine.
 *
 * Handles both PDF binary buffers and raw text, extracts structured candidate facts via LLM,
 * and saves them directly into Mem0 Long-Term Memory.
 */
export async function processAndStoreResume(
  userId: string,
  input: {
    pdfBuffer?: Buffer | ArrayBuffer;
    text?: string;
  },
  options?: { provider?: string; model?: string }
): Promise<ResumeParseResult> {
  let rawText = (input.text || "").trim();

  // If PDF buffer provided, extract text from PDF
  if (input.pdfBuffer) {
    const extracted = await extractTextFromPdfBuffer(input.pdfBuffer);
    if (extracted) {
      rawText = extracted;
    }
  }

  if (!rawText) {
    throw new Error("No readable resume text could be found or extracted.");
  }

  // 1. Structured LLM Extraction
  const structured = await extractStructuredResume(rawText, options);

  // 2. Persist to Mem0 Long-Term Memory
  const memoriesStored = await syncResumeToMem0(userId, structured);

  return {
    rawText,
    structured,
    memoriesStored,
  };
}
