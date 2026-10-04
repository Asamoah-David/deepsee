import { z } from 'zod';

/**
 * Single source of truth for Command Center environment configuration.
 *
 * Bible references: §79 (backend architecture), §140 (security architecture),
 * §214 (secret storage - never store sensitive credentials as plaintext),
 * §229 (the platform should never silently claim success).
 *
 * Two rules govern this file and must not be relaxed:
 *
 *  1. `publicEnv` contains ONLY NEXT_PUBLIC_* values. Those are inlined into
 *     client bundles by Next.js, so anything placed here is public forever.
 *  2. `serverEnv` is accessed through a function, never a module-level
 *     constant, so that importing this module from a client component cannot
 *     evaluate a secret even accidentally.
 *
 * All property access is dot-access on purpose: see src/env.d.ts for why
 * bracket access would break Next.js build-time inlining of NEXT_PUBLIC_*.
 */

/** Accepts any absolute URL scheme, including ws:// and wss://.
 *  z.string().url() in Zod 3 rejects non-HTTP schemes, which would wrongly
 *  reject NEXT_PUBLIC_RELAY_URL=ws://localhost:8080. */
const absoluteUrl = z.string().min(1).refine(
  (value) => {
    // `URL.canParse` is available in Node 18.17+, every modern browser, and the
    // Edge runtime that middleware uses. It avoids the `new URL()` + try/catch
    // pattern, which allocates an object whose only purpose is validation.
    return URL.canParse(value);
  },
  { message: 'Must be an absolute URL, e.g. https://... or wss://...' },
);

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: absoluteUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_RELAY_URL: absoluteUrl,
  NEXT_PUBLIC_APP_URL: absoluteUrl,
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('DeepSee'),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(32, {
    message: 'Supabase JWT secret must be at least 32 characters (HS256 requirement).',
  }),
  GROQ_API_KEY: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function describeIssues(error: z.ZodError, scope: string): string {
  const lines = error.issues.map((issue) => {
    const key = issue.path.join('.') || '(root)';
    return `  - ${key}: ${issue.message}`;
  });
  return [
    `Invalid ${scope} environment configuration.`,
    ...lines,
    '',
    'Local development: copy apps/web/.env.example to apps/web/.env.local and fill it in.',
    'Production: set these on the hosting platform (e.g. Railway service variables).',
  ].join('\n');
}

/**
 * Validated public configuration. Safe to import from client components,
 * server components, route handlers and middleware.
 *
 * This throws immediately on invalid input. That is deliberate: a Command
 * Center booting with a wrong Supabase URL would appear to work while every
 * request silently failed, which is exactly the "pretend success" behaviour
 * §229 forbids. Failing loudly at boot is the correct trade.
 */
export const publicEnv: PublicEnv = (() => {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_RELAY_URL: process.env.NEXT_PUBLIC_RELAY_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });

  if (!parsed.success) {
    throw new Error(describeIssues(parsed.error, 'public'));
  }
  return parsed.data;
})();

/**
 * Validated server-only configuration.
 *
 * Call this from server components, route handlers and route actions only.
 * It refuses to run in the browser so a mistaken import becomes a loud error
 * during development rather than a leaked secret in a client bundle.
 */
export function serverEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error(
      'serverEnv() was called in the browser. Server credentials must never be read client-side (§214). ' +
        'Use publicEnv for client components.',
    );
  }

  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  });

  if (!parsed.success) {
    throw new Error(describeIssues(parsed.error, 'server'));
  }
  return parsed.data;
}

/** True when running a production build or production server. */
export const isProduction = process.env.NODE_ENV === 'production';