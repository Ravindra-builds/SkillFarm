/**
 * Mock resource data — development / preview only.
 *
 * This file is the single source of truth for all hardcoded mock resources.
 * Import from here, never embed mock data directly in UI components.
 *
 * Usage: Only render these when isMockModeForced() returns true
 * or when no real data is available in development.
 */

export interface MockResource {
  id: string;
  title: string;
  provider: string;
  url: string;
  type: string;
  overall: number;
  authority: number;
  freshness: number;
  why: string;
  level: string;
  updated: string;
}

export const MOCK_RESOURCES: MockResource[] = [
  {
    id: "mock-1",
    title: "Official Node.js Documentation — Guides",
    provider: "nodejs.org",
    url: "https://nodejs.org/docs",
    type: "Official docs",
    overall: 9.4,
    authority: 10,
    freshness: 9.5,
    level: "Beginner → Intermediate",
    updated: "Updated 3 days ago",
    why: "Matches your current level and covers the exact concepts needed before your next roadmap step (HTTP, streams, ESM).",
  },
  {
    id: "mock-2",
    title: "The Express.js GitHub — Production best practices",
    provider: "github.com/expressjs/express",
    url: "https://github.com/expressjs/express",
    type: "GitHub",
    overall: 9.1,
    authority: 9.2,
    freshness: 8.8,
    level: "Intermediate",
    updated: "12k ★ • Active",
    why: "Strong practical examples and middleware patterns you can copy for your REST API project.",
  },
  {
    id: "mock-3",
    title: "Web Dev Simplified — JWT Authentication Crash Course",
    provider: "youtube.com",
    url: "https://www.youtube.com/watch?v=mbsmsi7l3r4",
    type: "Video • 24 min",
    overall: 8.7,
    authority: 8.0,
    freshness: 9.0,
    level: "Beginner friendly",
    updated: "382k views",
    why: "Visual walkthrough of JWT + refresh rotation — great before the Security Mentor handoff.",
  },
];
