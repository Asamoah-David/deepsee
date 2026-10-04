import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { publicEnv, serverEnv } from '@/lib/env';
// import type { Database } from '@deepsee/database'; // Generated in Phase 1.

/**
 * The Supabase generic parameter is intentionally `unknown` for now.
 *
 * `any` was the previous value, which silently disabled every type check on
 * query results - exactly where a wrong column name or a missed `org_id` filter
 * would hide. `unknown` keeps the gap explicit: query results must be narrowed
 * before use. Once Phase 1 generates `Database` types from the schema, replace
 * `unknown` with `Database` and the narrowing becomes automatic.
 */
type Db = unknown;
type Client = SupabaseClient<Db>;

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Request-scoped Supabase client, authenticated as the current user.
 *
 * RLS applies, so every query is automatically filtered to the organisations
 * the caller belongs to (§8, §86, §215). Use this for anything that reads or
 * writes user-visible data.
 */
export async function createClient(): Promise<Client> {
  const cookieStore = await cookies();

  return createServerClient<Db>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot mutate cookies. This is expected and safe
            // to ignore because middleware refreshes the session on every
            // request. Re-throwing would break rendering on token refresh.
          }
        },
      },
    },
  ) as Client;
}

/**
 * Service-role client. RLS is BYPASSED.
 *
 * Use only where the operation genuinely cannot run under the caller's own
 * session: agent enrollment claim, relay heartbeat ingestion, webhook delivery,
 * background retention jobs.
 *
 * §86 requires that tenant isolation is never left to the frontend. Because this
 * client bypasses RLS, EVERY call site must scope its own query by `org_id` and
 * stamp `org_id` on writes from server-derived values - never from
 * client-supplied input.
 */
export async function createAdminClient(): Promise<Client> {
  const cookieStore = await cookies();
  const env = serverEnv();

  return createServerClient<Db>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // See note in createClient() above.
          }
        },
      },
    },
  ) as Client;
}