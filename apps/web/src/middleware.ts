import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '@/lib/env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

function accessTokenAssurance(accessToken: string | undefined): string | null {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as { aal?: unknown };
    return typeof claims.aal === 'string' ? claims.aal : null;
  } catch {
    return null;
  }
}

/**
 * Edge middleware: refreshes the Supabase session cookie on every matched
 * request, gates unauthenticated access, and enforces enrolled MFA assurance.
 *
 * Bible references: §93 (authentication - session management), §141 (zero-trust
 * - every session authenticates), §215 (tenant identifiers enforced at API,
 * database, websocket, ...), §228 (every action answers: do I have permission?).
 *
 * This is a session and assurance gate only. It does NOT answer "may this user
 * touch this organisation's device?" - that decision is made server-side per
 * request in route handlers and enforced again by RLS.
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
  const isPublicInviteRoute = pathname.startsWith('/invite/');
  const isApiRoute = pathname.startsWith('/api/');

  if (!user && !isAuthRoute && !isPublicInviteRoute) {
    // An unauthenticated fetch() must receive a status code it can act on.
    // Returning the HTML body of a redirect would make API clients read a 200
    // as success (§229).
    if (isApiRoute) {
      // Invitation metadata is readable with its unguessable token. All
      // administrative invitation reads and mutations stay session-gated.
      if (request.method === 'GET' && pathname === '/api/organization/invitations' && request.nextUrl.searchParams.has('token')) {
        return supabaseResponse;
      }
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute) {
    // Allow authenticated users to access auth routes if they might need to:
    // - Register a new organization
    // - Re-authenticate
    // Don't redirect automatically
    return supabaseResponse;
  }

  const hasVerifiedFactor = Boolean(user?.factors?.some((factor) => factor.status === 'verified'));
  if (user && pathname !== '/mfa-challenge' && pathname !== '/security') {
    const { data: policyRows, error: policyError } = await supabase.rpc('get_current_org_mfa_policy');
    if (policyError) {
      console.error('[middleware.security-policy] lookup failed', { code: policyError.code ?? null });
      if (isApiRoute) return NextResponse.json({ error: 'security_policy_unavailable' }, { status: 503 });
      return new NextResponse('Organization security policy is temporarily unavailable.', { status: 503 });
    }
    const organizationRequiresMfa = Boolean(policyRows?.[0]?.require_mfa);
    if (organizationRequiresMfa && !hasVerifiedFactor) {
      if (request.method === 'GET' && pathname === '/api/organization/security-policy') return supabaseResponse;
      if (isApiRoute) return NextResponse.json({ error: 'mfa_enrollment_required', next: '/security' }, { status: 403 });
      const securityUrl = new URL('/security?required=1', request.url);
      return NextResponse.redirect(securityUrl);
    }
  }

  if (user && pathname !== '/mfa-challenge' && pathname !== '/api/auth/mfa/recover' && hasVerifiedFactor) {
    // getUser() above has already validated the access token. Read its AAL
    // claim only to enforce the second-factor step for users who enrolled TOTP.
    const { data: { session } } = await supabase.auth.getSession();
    if (accessTokenAssurance(session?.access_token) !== 'aal2') {
      if (isApiRoute) {
        return NextResponse.json({ error: 'mfa_required', next: '/mfa-challenge' }, { status: 403 });
      }
      const challengeUrl = new URL('/mfa-challenge', request.url);
      return NextResponse.redirect(challengeUrl);
    }
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
   *  - /api/enrollment/claim: device-authenticated one-time enrollment claim
   *  - /api/devices/heartbeat: called by the Windows Agent with device token
   *  - /enroll/[code]: public enrollment landing page
   *  - /api/internal/*: service-to-service, guarded by a shared internal token.
   *  - /api/webhooks/*: inbound provider callbacks, verified by signature.
   *  - /register: allow authenticated users to register new organizations
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/health|api/auth/login|api/enrollment/claim|api/devices/heartbeat|api/devices/credentials/rotate|auth/callback|enroll|invite|api/internal|api/webhooks|register|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|woff|woff2|ttf)$).*)',
  ],
};
