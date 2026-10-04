import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';
// import type { Database } from '@deepsee/database'; // Generated in Phase 1.

/**
 * Browser-side Supabase client.
 *
 * Reads only from publicEnv, because every value it touches is inlined into the
 * client bundle. A secret must never be reachable from this module (§214).
 *
 * The generic parameter is `unknown` rather than `any` so that query results
 * must be narrowed before use; `any` would silently disable type checking
 * exactly where an incorrect column name would otherwise be caught. Replace
 * `unknown` with the generated `Database` type in Phase 1.
 */
export function createClient(): SupabaseClient<unknown> {
  return createBrowserClient<unknown>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ) as SupabaseClient<unknown>;
}