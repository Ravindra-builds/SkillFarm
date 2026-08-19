/**
 * Safe Client IP Extraction
 *
 * Security: The `x-forwarded-for` header is FULLY attacker-controlled when
 * read naively (leftmost value). An attacker can set it to anything to bypass
 * IP-based rate limiting. This utility uses a trust hierarchy:
 *
 * 1. `cf-connecting-ip`  — Set by Cloudflare edge; cannot be spoofed by clients.
 * 2. `x-real-ip`         — Set by Nginx/trusted reverse proxy; reliable when configured.
 * 3. `x-forwarded-for`   — Use the LAST (rightmost) value, which is added by the
 *                          outermost trusted proxy and cannot be injected by the client.
 * 4. Fallback `"127.0.0.1"` — safe sentinel for local dev.
 *
 * IMPORTANT: If you add a new proxy layer in front of the app, ensure it sets
 * `cf-connecting-ip` or `x-real-ip` to the true client IP.
 */
export function getClientIp(req: Request): string {
  // 1. Cloudflare edge header (most trusted — cannot be spoofed by clients)
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // 2. Nginx / reverse-proxy real-ip header
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // 3. X-Forwarded-For: use the RIGHTMOST value (added by the outermost trusted proxy).
  //    The leftmost values are client-supplied and MUST NOT be trusted for rate limiting.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",");
    const rightmost = parts[parts.length - 1]?.trim();
    if (rightmost) return rightmost;
  }

  return "127.0.0.1";
}
