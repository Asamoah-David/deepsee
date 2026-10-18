import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { publicEnv, serverEnv } from '@/lib/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
type Client = SupabaseClient<Db>;

type CookieToSet = { name: string; value: string; options: CookieOptions };

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
            // Server Components cannot mutate cookies.
          }
        },
      },
    },
  ) as Client;
}

export async function createAdminClient(): Promise<Client> {
  const cookieStore = await cookies();
  const env = serverEnv();

  return createServerClient<Db>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-supabase-role': 'service_role',
        },
      },
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
