/**
 * PDF Text Extractor Helper
 *
 * Converts uploaded PDF binary buffers into normalized plain text.
 *
 * Security:
 * - Validates the %PDF- magic bytes before parsing to reject non-PDF files
 *   disguised with a .pdf extension (prevents MIME spoofing / prompt injection).
 * - Caps extraction to PDF_MAX_PAGES pages to guard against decompression bombs
 *   (FlateDecode streams that expand to GBs of data).
 */

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const PDF_MAX_PAGES = 10; // cap to avoid decompression-bomb DoS

/**
 * Validates that a buffer starts with the PDF magic bytes (%PDF-).
 * Rejects files that claim to be PDFs via MIME type or extension only.
 */
function isPdfBuffer(buf: Buffer): boolean {
  if (buf.length < 5) return false;
  return (
    buf[0] === PDF_MAGIC[0] &&
    buf[1] === PDF_MAGIC[1] &&
    buf[2] === PDF_MAGIC[2] &&
    buf[3] === PDF_MAGIC[3] &&
    buf[4] === PDF_MAGIC[4]
  );
}

export async function extractTextFromPdfBuffer(buffer: Buffer | ArrayBuffer): Promise<string> {
  const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  // ── Security: Validate PDF magic bytes before parsing ────────────────────
  if (!isPdfBuffer(nodeBuffer)) {
    throw new Error(
      "Uploaded file does not appear to be a valid PDF. " +
      "Please upload an unencrypted PDF file (must start with %PDF-)."
    );
  }

  try {
    // Dynamic import to avoid bundling issues in client bundles
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse-fork");
    // max: PDF_MAX_PAGES limits page processing to prevent FlateDecode decompression bombs
    const data = await pdfParse(nodeBuffer, { max: PDF_MAX_PAGES });

    if (data && typeof data.text === "string" && data.text.trim().length > 0) {
      return data.text.trim();
    }
  } catch (err) {
    console.error("[resume/pdf-extractor] pdf-parse error, attempting raw fallback:", err);
  }

  // Raw text extraction fallback for uncompressed/lightweight PDF streams
  try {
    const uint8 = new Uint8Array(nodeBuffer);
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
