import { z } from 'zod';

/**
 * Single source of truth for Command Center environment configuration.
 */

const absoluteUrl = z.string().min(1).refine(
  (value) => {
    return URL.canParse(value);
  },
  { message: 'Must be an absolute URL, e.g. https://... or wss://...' },
);

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: absoluteUrl.default('http://localhost:54321'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default('placeholder-anon-key'),
  NEXT_PUBLIC_RELAY_URL: absoluteUrl.default('ws://localhost:8080'),
  NEXT_PUBLIC_APP_URL: absoluteUrl.default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('DeepSee'),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default('placeholder-service-role-key'),
  SUPABASE_JWT_SECRET: z.string().min(32).default('placeholder-jwt-secret-min-32-chars-long!!'),
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

export const publicEnv: PublicEnv = (() => {
  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    NEXT_PUBLIC_RELAY_URL: process.env.NEXT_PUBLIC_RELAY_URL || 'ws://localhost:8080',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'DeepSee',
  };

  const parsed = publicSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(describeIssues(parsed.error, 'public'));
  }
  return parsed.data;
})();

export function serverEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() was called in the browser.');
  }

  const raw = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || 'placeholder-jwt-secret-min-32-chars-long!!',
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  };

  const parsed = serverSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(describeIssues(parsed.error, 'server'));
  }
  return parsed.data;
}

export const isProduction = process.env.NODE_ENV === 'production';
