import type { NextConfig } from "next";

/**
 * Security headers applied to all routes.
 * These protect against common web vulnerabilities:
 * - XSS via Content-Security-Policy
 * - Clickjacking via X-Frame-Options
 * - MIME sniffing via X-Content-Type-Options
 * - Info leakage via Referrer-Policy
 * - HSTS via Strict-Transport-Security
 */
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    // Content-Security-Policy
    // Allow: same-origin scripts/styles, Google fonts, Upstash, Neon, Tavily, Exa, YouTube embeds
    // 'unsafe-inline' is still required by Next.js App Router for inline bootstrap scripts.
    //   → Long-term upgrade: migrate to nonce-based CSP (nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
    // 'unsafe-eval' is REMOVED — it was only needed by Turbopack in dev mode, never in production builds.
    //   Next.js production bundles do not use eval().
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" // Turbopack HMR needs unsafe-eval in dev only
        : "script-src 'self' 'unsafe-inline'",             // Production: no eval()
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://i.pravatar.cc https://*.googleusercontent.com",
      "connect-src 'self' https://*.upstash.io https://*.neon.tech https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.tavily.com https://api.exa.ai https://api.mem0.ai",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Allow the E2B preview host for HMR / dev resources.
  allowedDevOrigins: ["*.e2b.app", "*.e2b.dev"],

  // Fix Turbopack + lucide-react stale chunk issue:
  // "Module factory is not available" for icons like Settings.
  // Optimize imports so each icon is a separate chunk and caches correctly.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
