import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the E2B preview host for HMR / dev resources.
  allowedDevOrigins: ["*.e2b.app", "*.e2b.dev"],

  // Fix Turbopack + lucide-react stale chunk issue:
  // "Module factory is not available" for icons like Settings.
  // Optimize imports so each icon is a separate chunk and caches correctly.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
