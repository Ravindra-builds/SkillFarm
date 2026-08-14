/**
 * PDF Text Extractor Helper
 *
 * Converts uploaded PDF binary buffers into normalized plain text.
 */

export async function extractTextFromPdfBuffer(buffer: Buffer | ArrayBuffer): Promise<string> {
  try {
    // Dynamic import to avoid bundling issues in client bundles
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse-fork");
    const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const data = await pdfParse(nodeBuffer);
    
    if (data && typeof data.text === "string" && data.text.trim().length > 0) {
      return data.text.trim();
    }
  } catch (err) {
    console.error("[resume/pdf-extractor] pdf-parse error, attempting raw fallback:", err);
  }

  // Raw text extraction fallback for uncompressed/lightweight PDF streams
  try {
    const uint8 = new Uint8Array(buffer);
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const rawString = decoder.decode(uint8);

    // Extract text inside PDF stream tags (BT ... ET)
    const textMatches = rawString.match(/\(([^)]+)\)\s*Tj/g) || [];
    if (textMatches.length > 0) {
      const extracted = textMatches
        .map((m) => m.replace(/^\(/, "").replace(/\)\s*Tj$/, ""))
        .join(" ");
      if (extracted.trim().length > 20) {
        return extracted.trim();
      }
    }
  } catch (fallbackErr) {
    console.error("[resume/pdf-extractor] fallback raw decode failed:", fallbackErr);
  }

  throw new Error("Could not extract readable text from the provided PDF file. Please paste text directly or upload an unencrypted PDF.");
}
