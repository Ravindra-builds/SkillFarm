import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy init so importing `db` during `next build` without env doesn't crash.
// We throw at query time instead, with a helpful message.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local — see SETUP.md for where to get a Neon connection string."
    );
  }

  // Neon HTTP driver — works great with serverless/edge and keeps the
  // connection logic simple (no pooling needed for the MVP).
  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

export function isDbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// Re-export schema for convenience
export * from "./schema";
