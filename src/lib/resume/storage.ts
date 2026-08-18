import { getDb, isDbAvailable } from "@/db";
import { userResumes } from "@/db/schema/learning";
import { isGuestSession } from "@/lib/guest";
import { ensureDbUser } from "@/lib/users";
import { eq, desc } from "drizzle-orm";
import type { StructuredResumeData } from "./types";

export interface StoredResumeRecord {
  id: string;
  userId: string;
  fileName: string;
  fileSize?: number;
  fileType: string;
  storageKey?: string | null;
  storageUrl?: string | null;
  extractedSkills?: string[];
  suggestedLevel?: string;
  targetRole?: string;
  summary?: string;
  parsedData?: StructuredResumeData;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Persists resume metadata and R2 storage references to PostgreSQL.
 * Safely bypassed for guest sessions to prevent database write consumption.
 */
export async function saveResumeRecord(
  userId: string,
  params: {
    fileName: string;
    fileSize?: number;
    fileType: string;
    storageKey?: string | null;
    storageUrl?: string | null;
    structured: StructuredResumeData;
  }
): Promise<string | null> {
  if (isGuestSession(userId) || !isDbAvailable()) {
    return null;
  }

  try {
    const dbUserId = await ensureDbUser({ id: userId, email: userId });
    const db = getDb();
    const existing = await db
      .select({ id: userResumes.id })
      .from(userResumes)
      .where(eq(userResumes.userId, dbUserId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(userResumes)
        .set({
          fileName: params.fileName,
          fileSize: params.fileSize,
          fileType: params.fileType,
          storageKey: params.storageKey,
          storageUrl: params.storageUrl,
          extractedSkills: params.structured.skills,
          suggestedLevel: params.structured.suggestedLevel,
          targetRole: params.structured.targetRole,
          summary: params.structured.summary,
          parsedData: params.structured,
          updatedAt: new Date(),
        })
        .where(eq(userResumes.userId, dbUserId))
        .returning({ id: userResumes.id });

      return updated?.id ?? existing[0].id;
    }

    const [row] = await db
      .insert(userResumes)
      .values({
        userId: dbUserId,
        fileName: params.fileName,
        fileSize: params.fileSize,
        fileType: params.fileType,
        storageKey: params.storageKey,
        storageUrl: params.storageUrl,
        extractedSkills: params.structured.skills,
        suggestedLevel: params.structured.suggestedLevel,
        targetRole: params.structured.targetRole,
        summary: params.structured.summary,
        parsedData: params.structured,
      })
      .returning({ id: userResumes.id });

    return row?.id ?? null;
  } catch (err) {
    console.error("[resume-storage] Failed to save resume record to PostgreSQL:", err);
    return null;
  }
}

/**
 * Retrieves the latest saved resume record for an authenticated user.
 */
export async function getLatestUserResume(userId: string): Promise<StoredResumeRecord | null> {
  if (isGuestSession(userId) || !isDbAvailable()) {
    return null;
  }

  try {
    const dbUserId = await ensureDbUser({ id: userId, email: userId });
    const db = getDb();
    const [row] = await db
      .select()
      .from(userResumes)
      .where(eq(userResumes.userId, dbUserId))
      .orderBy(desc(userResumes.updatedAt), desc(userResumes.createdAt))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      fileName: row.fileName,
      fileSize: row.fileSize ?? undefined,
      fileType: row.fileType,
      storageKey: row.storageKey,
      storageUrl: row.storageUrl,
      extractedSkills: row.extractedSkills ?? undefined,
      suggestedLevel: row.suggestedLevel ?? undefined,
      targetRole: row.targetRole ?? undefined,
      summary: row.summary ?? undefined,
      parsedData: (row.parsedData as StructuredResumeData) ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  } catch (err) {
    console.error("[resume-storage] Failed to query latest resume from PostgreSQL:", err);
    return null;
  }
}
