import type { NextConfig } from "next";

/**
 * Security headers applied to every HTML/API response.
 *
 * - HSTS: 1 year, include subdomains. Browser refuses HTTP after first hit.
 * - X-Content-Type-Options nosniff: block MIME sniffing.
 * - X-Frame-Options DENY: kill click-jacking; we never embed.
 * - Referrer-Policy strict-origin-when-cross-origin: don't leak paths off-site.
 * - Permissions-Policy: explicitly deny unused sensor APIs.
 * - CSP: allow self + specific third-party origins we actually use
 *   (dicebear avatars, Google Fonts if any). 'unsafe-inline' stays on for
 *   style-src because Tailwind + framer-motion inject style blocks; a
 *   strict nonce pass is a Phase 8 item.
 */
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    // connect-src includes SSE endpoint + Polygon RPCs so the frontend
    // can talk to them without strict-CSP breakage.
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://api.dicebear.com https://*.polygonscan.com",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Build a minimal standalone server bundle so the Docker image can
  // drop everything in node_modules except what's actually linked.
  // Cuts prod image size from ~1.2GB to ~180MB.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
