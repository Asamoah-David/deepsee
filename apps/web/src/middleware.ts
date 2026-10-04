import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '@/lib/env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Edge middleware: refreshes the Supabase session cookie on every page
 * navigation and acts as the coarse first gate on unauthenticated access.
 *
 * Bible references: §93 (authentication - session management), §141 (zero-trust
 * - every session authenticates), §215 (tenant identifiers enforced at API,
 * database, websocket, ...), §228 (every action answers: do I have permission?).
 *
 * This is a COARSE gate only. It answers "is there a session at all?". It does
 * NOT answer "may this user touch this organisation's device?" - that decision
 * is made server-side per request in route handlers and enforced again by RLS.
 * §86 is explicit: never rely solely on the frontend to prevent cross-tenant
 * access.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Mirror refreshed cookies onto the outgoing request and response.
          // Omitting this is the documented cause of random logouts and early
          // session termination with @supabase/ssr.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() rather than getSession(): getUser() revalidates the token against
  // Supabase Auth instead of trusting the cookie payload.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isApiRoute = pathname.startsWith('/api/');

  if (!user && !isAuthRoute) {
    // An unauthenticated fetch() must receive a status code it can act on.
    // Returning the HTML body of a redirect would make API clients read a 200
    // as success (§229).
    if (isApiRoute) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Check if user has organization membership for dashboard access
  if (user && !isAuthRoute && !isApiRoute) {
    // We need to check if the user has any organization memberships
    // This is a lightweight check in middleware - full authorization happens in route handlers
    // For now, we'll allow access and let the dashboard handle the "no organization" case
    // This is because middleware can't easily query the database with RLS
  }

  return supabaseResponse;
}

export const config = {
  /**
   * Excluded from the session gate:
   *  - Next.js build output and static assets: no session relevance.
   *  - /api/health: consumed by the Railway healthcheck before any session exists.
   *  - /api/enrollment/claim: called by the Windows Agent, which authenticates
   *    with a one-time enrollment code rather than an admin session (§72-74).
   *  - /api/enrollment/*: enrollment API endpoints that don't require auth
   *  - /api/devices/heartbeat: called by the Windows Agent with device token
   *  - /enroll/[code]: public enrollment landing page
   *  - /api/internal/*: service-to-service, guarded by a shared internal token.
   *  - /api/webhooks/*: inbound provider callbacks, verified by signature.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/health|api/enrollment|api/devices/heartbeat|enroll|api/internal|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|woff|woff2|ttf)$).*)',
  ],
};