import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Framework-native security headers (rather than a Vercel-only vercel.json) so they apply
// identically in local dev, Preview, and Production - this app handles real payments (Step 31)
// and paywalled educational content, so shipping without these would be a real gap, not just
// polish.
//
// The Content-Security-Policy is production-only, confirmed necessary by actually loading the app
// with it on: React/Next dev mode calls eval() for HMR and debugging call-stack reconstruction,
// which a CSP without 'unsafe-eval' blocks outright (confirmed live - the console showed real
// "eval() is not supported" errors and failed HMR websocket connections the moment this was
// applied unconditionally). React never uses eval() in production, so the stricter policy is both
// safe and meaningful specifically in the build that ships to users. It still allows
// 'unsafe-inline' for scripts/styles because Next App Router's default hydration and Tailwind's
// injected styles need it without deeper nonce-based CSP wiring, which hasn't been set up here -
// this is a reasonable starting baseline, not a maximally strict policy. Test it further in a real
// Preview deployment (browser console for CSP violations, across every distinct page type -
// public, student, instructor, admin) before treating it as final.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Only meaningful once served over a real HTTPS custom domain, but harmless anywhere else.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
