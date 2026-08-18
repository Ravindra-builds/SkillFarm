import { extractTextFromPdfBuffer } from "./pdf-extractor";
import { extractStructuredResume } from "./llm-extractor";
import { syncResumeToMem0 } from "./mem0-sync";
import { scrubSensitiveInformation, validateResumeSections } from "./pii-scrubber";
import type { ResumeParseResult } from "./types";

export * from "./types";
export { extractTextFromPdfBuffer } from "./pdf-extractor";
export { extractStructuredResume } from "./llm-extractor";
export { syncResumeToMem0 } from "./mem0-sync";
export { scrubSensitiveInformation, validateResumeSections } from "./pii-scrubber";
export { saveResumeRecord, getLatestUserResume } from "./storage";

/**
 * High-level unified resume parser & memory synchronization engine.
 *
 * Excludes sensitive personal details (phones, personal emails, street addresses),
 * validates mandatory Skills or Profile Summary sections, extracts structured engineering facts,
 * and saves them into Mem0 Long-Term Memory.
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

  // 1. Validate mandatory Skills or Profile Summary section
  const validation = validateResumeSections(rawText);
  if (!validation.valid) {
    throw new Error(validation.reason || "Resume must contain at least a 'Skills' or 'Profile Summary' section.");
  }

  // 2. Scrub sensitive PII (Phone, Personal Email, Street Address, DOB)
  const sanitizedText = scrubSensitiveInformation(rawText);

  // 3. Structured LLM / Heuristic Extraction
  const structured = await extractStructuredResume(sanitizedText, options);

  // Double check that structured extraction produced skills or summary
  if ((!structured.skills || structured.skills.length === 0) && !structured.summary) {
    throw new Error("Unable to extract technical skills or profile summary from the document. Please ensure your resume lists your technical competencies.");
  }

  // 4. Persist to Mem0 Long-Term Memory
  const memoriesStored = await syncResumeToMem0(userId, structured);

  return {
    rawText: sanitizedText,
    structured,
    memoriesStored,
  };
}
