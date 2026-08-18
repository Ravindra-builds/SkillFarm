/**
 * Resume PII Redaction & Section Validation Engine
 *
 * Excludes sensitive personal information (phones, personal emails, physical addresses, IDs)
 * and enforces mandatory Skills or Profile Summary sections in uploaded resumes.
 */

/**
 * Scans and redacts sensitive PII from resume text before parsing or memory storage.
 */
export function scrubSensitiveInformation(rawText: string): string {
  if (!rawText) return "";

  let text = rawText;

  // 1. Email addresses (e.g., user@domain.com, name.dev@gmail.com)
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, "[REDACTED_EMAIL]");

  // 2. Phone numbers (e.g., +1 (555) 123-4567, +91 9876543210, 555-123-4567, etc.)
  text = text.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g, "[REDACTED_PHONE]");
  text = text.replace(/\b(?:\+?\d{1,3}\s*)?\d{10,12}\b/g, "[REDACTED_PHONE]");

  // 3. Physical street addresses, suite/apt numbers
  text = text.replace(
    /\b\d{1,5}\s+[A-Za-z0-9.,\s]{3,35}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir|Apartment|Apt|Suite|Ste|Floor|Fl|Box|PO Box)\b[^\n,]*/gi,
    "[REDACTED_ADDRESS]"
  );

  // 4. Social Security & National IDs (e.g., XXX-XX-XXXX)
  text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_ID]");

  // 5. Date of birth patterns (DOB: MM/DD/YYYY or Date of Birth: ...)
  text = text.replace(/(?:DOB|Date of Birth|Birth Date)\s*[:\-]?\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/gi, "[REDACTED_DOB]");

  return text;
}

/**
 * Validates that the resume contains at least a Skills or Profile Summary section.
 */
export function validateResumeSections(text: string): { valid: boolean; reason?: string } {
  if (!text || text.trim().length < 20) {
    return {
      valid: false,
      reason: "Resume content is too short. Please provide a complete resume document.",
    };
  }

  const lower = text.toLowerCase();

  // Check for common skills section keywords
  const hasSkillsSection =
    /\b(?:skills|technical skills|technologies|tech stack|core competencies|programming languages|tools & technologies|frameworks|specialties|tools)\b/i.test(
      lower
    );

  // Check for common summary / profile keywords
  const hasSummarySection =
    /\b(?:summary|professional summary|profile|profile summary|about me|executive summary|career summary|objective|career objective|overview)\b/i.test(
      lower
    );

  // Common technical keywords indicator
  const commonTech = [
    "javascript", "typescript", "react", "next.js", "node.js", "python",
    "java", "golang", "go", "c++", "c#", "rust", "postgresql", "sql", "mongodb",
    "docker", "kubernetes", "aws", "gcp", "azure", "git", "linux", "html", "css"
  ];
  const matchedTech = commonTech.filter((t) => lower.includes(t));

  if (!hasSkillsSection && !hasSummarySection && matchedTech.length < 2) {
    return {
      valid: false,
      reason:
        "Resume must contain at least a 'Skills' section or a 'Profile Summary' section with technical competencies.",
    };
  }

  return { valid: true };
}
