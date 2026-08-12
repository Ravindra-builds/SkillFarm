import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load .env.local first, fallback to .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./src/db/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl || "postgresql://user:password@localhost:5432/skillfarm",
  },
  verbose: true,
  strict: true,
});
