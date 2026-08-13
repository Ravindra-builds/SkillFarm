/**
 * Email OTP Authentication Store
 *
 * Storage strategy:
 * - Redis (Upstash): preferred in production — survives serverless cold starts
 *   and multi-worker deployments. OTPs stored with a 10-minute TTL.
 * - In-memory Map: fallback for local dev when Redis is not configured.
 *   Works fine for single-process dev server; breaks on Vercel multi-worker.
 *
 * Security:
 * - "123456" bypass is only active when NODE_ENV !== "production"
 * - OTP codes are never logged in production
 * - Codes are deleted on first successful verify (single-use)
 */

import { getRedis } from "@/lib/redis";

const IS_DEV = process.env.NODE_ENV !== "production";
const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const OTP_KEY_PREFIX = "otp:";

// In-memory fallback for dev without Redis
type OTPEntry = { code: string; expiresAt: number };
const memOtpStore = new Map<string, OTPEntry>();

function otpKey(email: string): string {
  return `${OTP_KEY_PREFIX}${email.toLowerCase().trim()}`;
}

export async function generateOTP(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const redis = await getRedis();
  if (redis) {
    // Redis path: store with TTL so it auto-expires
    await redis.set(otpKey(normalized), code, { ex: OTP_TTL_SECONDS });
  } else {
    // Memory fallback
    memOtpStore.set(normalized, {
      code,
      expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
    });
  }

  // Never log the actual code in production — it ends up in log aggregators
  if (IS_DEV) {
    console.log(`[otp-auth] [DEV ONLY] Generated OTP for ${normalized}: ${code}`);
  } else {
    console.log(`[otp-auth] Generated OTP for ${normalized} (code omitted from logs)`);
  }

  return code;
}

export async function verifyOTP(email: string, inputCode: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  const trimmedInput = inputCode.trim();

  const redis = await getRedis();

  if (redis) {
    // Redis path
    const stored = await redis.get<string>(otpKey(normalized));
    if (!stored) return false;

    const isCorrect = trimmedInput === stored;
    const isDevBypass = IS_DEV && trimmedInput === "123456";

    if (isCorrect || isDevBypass) {
      // Single-use: delete after first successful verify
      await redis.del(otpKey(normalized));
      return true;
    }
    return false;
  }

  // Memory fallback path
  const entry = memOtpStore.get(normalized);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    memOtpStore.delete(normalized);
    return false;
  }

  const isCorrect = trimmedInput === entry.code;
  const isDevBypass = IS_DEV && trimmedInput === "123456";

  if (isCorrect || isDevBypass) {
    memOtpStore.delete(normalized);
    return true;
  }

  return false;
}
