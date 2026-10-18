import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

function normalizeCode(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[\s-]/g, '').toLowerCase();
  return /^[a-f0-9]{32}$/.test(normalized) ? normalized : null;
}

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const payload: unknown = await request.json().catch(() => null);
  const normalized = normalizeCode(payload && typeof payload === 'object' ? (payload as { code?: unknown }).code : null);
  if (!normalized) return NextResponse.json({ error: 'Enter one of your recovery codes.' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Sign in with your password before using a recovery code.' }, { status: 401 });
  const hash = createHash('sha256').update(normalized).digest('hex');
  const { data: consumed, error: consumeError } = await supabase.rpc('consume_current_user_mfa_recovery_code', { p_code_hash: hash });
  if (consumeError || consumed !== true) return NextResponse.json({ error: 'This recovery code is invalid, already used, or temporarily rate-limited.' }, { status: 400 });

  const admin = await createAdminClient();
  const { data, error: listError } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
  if (listError) {
    console.error('[auth.mfa.recover] factor lookup failed', { code: listError.code ?? null });
    return NextResponse.json({ error: 'Recovery was accepted, but authenticator reset is temporarily unavailable. Use another recovery code or contact an administrator.' }, { status: 503 });
  }
  const factors = data.factors.filter((factor) => factor.factor_type === 'totp' && factor.status === 'verified');
  if (!factors.length) return NextResponse.json({ error: 'No verified authenticator needs recovery.' }, { status: 409 });
  for (const factor of factors) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ userId: user.id, id: factor.id });
    if (error) {
      console.error('[auth.mfa.recover] factor reset failed', { code: error.code ?? null });
      return NextResponse.json({ error: 'Recovery was accepted, but authenticator reset could not be completed. Use another recovery code or contact an administrator.' }, { status: 503 });
    }
  }
  await supabase.rpc('clear_current_user_mfa_recovery_codes');
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store, private' } });
}
