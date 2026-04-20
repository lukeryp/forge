import type { NextConfig } from "next";

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '';

// Derive Supabase origin for CSP connect-src. Falls back to wildcard if env missing.
const supabaseOrigin = (() => {
  try {
    return new URL(SUPABASE_URL).origin;
  } catch {
    return 'https://*.supabase.co';
  }
})();

const HCAPTCHA = 'https://hcaptcha.com https://*.hcaptcha.com';

// Content Security Policy — report-safe but strict. If you need to relax for
// a third-party analytics/tag, add its origin to the relevant directive.
const contentSecurityPolicy = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${HCAPTCHA}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${HCAPTCHA}`,
  `img-src 'self' data: blob:`,
  `font-src 'self' https://fonts.gstatic.com data:`,
  `connect-src 'self' ${supabaseOrigin} https://fonts.googleapis.com https://fonts.gstatic.com ${HCAPTCHA}`,
  `frame-src ${HCAPTCHA}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `manifest-src 'self'`,
  `worker-src 'self'`,
  `object-src 'none'`,
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Content-Security-Policy',    value: contentSecurityPolicy },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type',          value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control',         value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Content-Type',  value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
