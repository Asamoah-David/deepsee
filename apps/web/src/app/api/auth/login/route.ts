import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(1024),
});

export async function POST(request: NextRequest) {
  // This endpoint accepts credentials, so only same-origin browser requests
  // are allowed. The browser's fetch sends Origin on this POST.
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Record only the provider's safe diagnostic fields. Never log the email,
    // password, access token, refresh token, or raw error payload.
    const diagnostic = {
      name: error.name,
      status: error.status ?? null,
      code: 'code' in error ? error.code ?? null : null,
    };
    console.error('[auth.login] Supabase sign-in failed', diagnostic);

    const code = diagnostic.code?.toLowerCase();
    if (code === 'email_not_confirmed') {
      return NextResponse.json({ error: 'Confirm your email address before signing in. Check your inbox for the verification link.' }, { status: 403 });
    }
    if (error.name === 'AuthRetryableFetchError' || (error.status ?? 0) >= 500 || error.status === 0) {
      return NextResponse.json({ error: 'The authentication service is temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }
    if (error.status === 429 || code === 'over_request_rate_limit') {
      return NextResponse.json({ error: 'Too many sign-in attempts. Wait a few minutes and try again.' }, { status: 429 });
    }

    // Keep account-existence details out of the response.
    if (code === 'invalid_credentials' || error.status === 400 || error.status === 401) {
      return NextResponse.json({ error: 'Email or password is incorrect. If this account was created with email verification, confirm the address first. You can also use “Forgot password?” to set a password.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'We could not complete sign-in. Please try again or contact your workspace administrator.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
