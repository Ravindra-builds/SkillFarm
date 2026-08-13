/**
 * Mock dashboard data — development / preview only.
 *
 * This file is the single source of truth for all hardcoded dashboard
 * preview data (stats, roadmap nodes, streaks, next action).
 *
 * Usage: Only render these when isMockModeForced() returns true
 * or when no real data is available.
 */

export type RoadmapNodeStatus = "completed" | "current" | "next" | "locked";

export interface MockRoadmapNode {
  title: string;
  desc: string;
  status: RoadmapNodeStatus;
  mentor: string;
}

export interface MockDashboardStats {
  progressPercent: number;
  progressLabel: string;
  nodesCompleted: number;
  nodesTotal: number;
  nextNodeLabel: string;
  nextNodeEta: string;
  goal: string;
  weeklyHours: number;
  activeLabel: string;
  streakDays: number;
  streakPercentile: number;
  streakHistory: boolean[]; // 7 days — true = active
}

export interface MockNextAction {
  mentorLabel: string;
  title: string;
  description: string;
  tags: string[];
  estimatedTime: string;
  projectHref: string;
}

export const MOCK_DASHBOARD_STATS: MockDashboardStats = {
  progressPercent: 72,
  progressLabel: "HTTP & APIs",
  nodesCompleted: 8,
  nodesTotal: 11,
  nextNodeLabel: "Auth",
  nextNodeEta: "~2h",
  goal: "Become a production-ready backend developer",
  weeklyHours: 10,
  activeLabel: "Active since Aug 2026",
  streakDays: 12,
  streakPercentile: 8,
  streakHistory: [true, true, true, true, true, false, false],
};

export const MOCK_ROADMAP_NODES: MockRoadmapNode[] = [
  {
    title: "Node.js Fundamentals & ESM",
    desc: "Event loop, streams, ESM modules",
    status: "completed",
    mentor: "Backend",
  },
  {
    title: "HTTP & REST API Design",
    desc: "Verbs, status codes, OpenAPI specs",
    status: "completed",
    mentor: "Backend",
  },
  {
    title: "Express / Fastify & Zod",
    desc: "Routing, middleware, edge validation",
    status: "completed",
    mentor: "Backend",
  },
  {
    title: "PostgreSQL & Drizzle ORM",
    desc: "Schema, indexing, migrations",
    status: "current",
    mentor: "Backend",
  },
  {
    title: "Authentication & Security",
    desc: "JWT, httpOnly cookies, OAuth 2.0",
    status: "next",
    mentor: "Security",
  },
  {
    title: "Caching with Upstash Redis",
    desc: "TTL, cache keys, rate limiting",
    status: "locked",
    mentor: "Backend",
  },
  {
    title: "Docker Containerization",
    desc: "Multi-stage builds, deployment",
    status: "locked",
    mentor: "DevOps",
  },
];

export const MOCK_NEXT_ACTION: MockNextAction = {
  mentorLabel: "Backend Mentor",
  title: "Build a REST API with authentication",
  description:
    "You've mastered HTTP + Express. Now wire up JWT, refresh tokens, and protected routes — then hand off to Security for a review.",
  tags: ["JWT", "Drizzle ORM", "Testing"],
  estimatedTime: "~4 hours",
  projectHref: "/projects",
};
