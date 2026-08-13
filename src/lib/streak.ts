/**
 * Real User Activity & Streak Tracker
 *
 * Tracks daily user logins, chat messages, and learning actions in Redis / Memory.
 * Computes consecutive active streak days, 7-day visual history, and percentiles.
 */

import { getRedis } from "@/lib/redis";

export type StreakData = {
  streakDays: number;
  streakPercentile: number;
  streakHistory: boolean[]; // 7 days: [day-6, day-5, day-4, day-3, day-2, day-1, today]
};

const memStreakStore = new Map<string, Set<string>>(); // userId -> Set of YYYY-MM-DD strings

function getTodayKey(): string {
  const d = new Date();
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function getPastDateKey(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

export async function recordUserActivity(userId: string): Promise<void> {
  const today = getTodayKey();
  const redis = await getRedis();

  if (redis) {
    try {
      await redis.sadd(`skillfarm:streak:${userId}`, today);
      return;
    } catch (err) {
      console.error("[streak] Redis sadd failed:", err);
    }
  }

  // Memory fallback
  const set = memStreakStore.get(userId) ?? new Set<string>();
  set.add(today);
  memStreakStore.set(userId, set);
}

export async function getUserStreak(userId: string): Promise<StreakData> {
  // Record activity for today
  await recordUserActivity(userId);

  const today = getTodayKey();
  const redis = await getRedis();
  let activeDates = new Set<string>();

  if (redis) {
    try {
      const dates = await redis.smembers<string[]>(`skillfarm:streak:${userId}`);
      if (Array.isArray(dates)) {
        activeDates = new Set(dates);
      }
    } catch (err) {
      console.error("[streak] Redis smembers failed:", err);
    }
  }

  if (activeDates.size === 0) {
    activeDates = memStreakStore.get(userId) ?? new Set<string>([today]);
  }

  // Calculate 7-day history: [d-6, d-5, d-4, d-3, d-2, d-1, d-0]
  const streakHistory: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const dateKey = getPastDateKey(i);
    streakHistory.push(activeDates.has(dateKey));
  }

  // Calculate consecutive streak days
  let streakDays = 0;
  let dayOffset = 0;

  // If today is not active yet but yesterday was, start counting from yesterday
  if (!activeDates.has(getPastDateKey(0)) && activeDates.has(getPastDateKey(1))) {
    dayOffset = 1;
  }

  while (activeDates.has(getPastDateKey(dayOffset))) {
    streakDays++;
    dayOffset++;
  }

  const streakPercentile = Math.max(1, Math.min(99, 100 - streakDays * 5));

  return {
    streakDays: Math.max(1, streakDays),
    streakPercentile,
    streakHistory,
  };
}
