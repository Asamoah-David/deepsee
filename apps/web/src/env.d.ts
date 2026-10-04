// Ambient augmentation of process.env.
//
// WHY THIS EXISTS (do not replace with process.env['X'] bracket access):
//
// apps/web/tsconfig.json inherits `noPropertyAccessFromIndexSignature` from the
// root tsconfig. That rule forbids `process.env.FOO` because @types/node types
// ProcessEnv as extending Dict<string>, which is an index signature. The naive
// fix is bracket access, but Next.js inlines client env vars by matching the
// *dot-access member expression* in the AST at build time. Switching to
// `process.env['NEXT_PUBLIC_SUPABASE_URL']` risks the substitution not firing,
// which yields `undefined` only in production client bundles - a defect that
// cannot be reproduced in `next dev`.
//
// Declaring the properties explicitly below makes them declared members rather
// than index-signature members, so dot access type-checks AND Next.js inlining
// keeps working. Runtime presence is enforced separately by src/lib/env.ts.

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // ---- Public (inlined into client bundles; never put secrets here) ----
      readonly NEXT_PUBLIC_SUPABASE_URL: string;
      readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      readonly NEXT_PUBLIC_RELAY_URL: string;
      readonly NEXT_PUBLIC_APP_URL: string;
      readonly NEXT_PUBLIC_APP_NAME: string;

      // ---- Server-only (must never be referenced from a client component) ----
      readonly SUPABASE_SERVICE_ROLE_KEY: string;
      readonly SUPABASE_JWT_SECRET: string;
      readonly GROQ_API_KEY: string | undefined;

      // ---- Internal service-to-service ----
      readonly DATABASE_URL: string | undefined;
      readonly INTERNAL_API_TOKEN: string | undefined;

      // Forces `output: 'standalone'` when set. Read by next.config.ts, which is
      // a root-level file and therefore outside this augmentation's tsconfig
      // include path, so it is declared here too.
      readonly IS_NEXT_STANDALONE_BUILD: string | undefined;

      readonly NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};