import type { NextConfig } from 'next';

// Security headers. Values are intentionally conservative because the Command
// Center renders untrusted, operator-supplied text (device names, hostnames,
// ticket bodies, command output, captured screen content) inside the console.
//
// 'unsafe-inline' is present for style-src only, which Next.js requires for its
// injected style tags. script-src does not allow 'unsafe-inline', so an injected
// string cannot execute (§140, §233).
const SECURITY_HEADERS = [
  // Clickjacking: the console must never be framed.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop MIME sniffing from reinterpreting uploaded files as executable content.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Not useful on a console, and they leak capability hints.
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  {
    key: 'Permissions-Policy',
    // Camera and microphone remain opt-in per feature flag and per device grant
    // (§116, §159). Denying them at the document level here means a compromised
    // page cannot silently open them; the support-session UI requests them
    // explicitly when policy allows it.
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      // Screen frames arrive as blobs over a WebSocket, and Supabase Realtime
      // also uses a WebSocket, so ws:/wss: must be permitted.
      "connect-src 'self' ws: wss: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // Standalone output is required for the Docker image: it emits a
  // self-contained server bundle that needs no node_modules at runtime
  // (see apps/web/Dockerfile).
  //
  // It is switched off on Windows developer machines because Next.js traces
  // standalone dependencies by creating filesystem symlinks, which Windows
  // denies unless Developer Mode is enabled or the shell is elevated. The
  // failure occurs only during tracing - after compilation and static generation
  // have already succeeded - so it presents as a code error when it is not.
  //
  // Linux, CI and the Docker build are unaffected: `process.platform` is
  // 'linux' there, so standalone stays on. CI can also force it explicitly by
  // setting IS_NEXT_STANDALONE_BUILD=1.
  //
  // Spread rather than `output: cond ? 'standalone' : undefined`, because the
  // root tsconfig enables exactOptionalPropertyTypes, under which an explicit
  // undefined is not assignable to NextConfig['output'].
  ...(process.env.IS_NEXT_STANDALONE_BUILD || process.platform !== 'win32'
    ? { output: 'standalone' as const }
    : {}),

  // The workspace packages ship raw TypeScript (main points at ./src/index.ts)
  // rather than compiled output, so Next must transpile them. Without this the
  // first import of @deepsee/ui or @deepsee/shared fails the build.
  transpilePackages: ['@deepsee/ui', '@deepsee/shared'],

  reactStrictMode: true,

  // Do not advertise the framework version to unauthenticated callers.
  poweredByHeader: false,

  experimental: { reactCompiler: false },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
