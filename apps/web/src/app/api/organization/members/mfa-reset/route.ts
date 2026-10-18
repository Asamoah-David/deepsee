import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const schema = z.object({ userId: z.string().uuid() });

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid member.' }, { status: 400 });

  const supabase = await createClient();
  const { data: orgId, error: authorizationError } = await supabase.rpc('authorize_org_member_mfa_reset', { p_target_user_id: parsed.data.userId });
  if (authorizationError || !orgId) return NextResponse.json({ error: authorizationError?.code === '42501' ? 'An owner or super admin with a verified authenticator is required.' : 'The reset could not be authorized.' }, { status: authorizationError?.code === '42501' ? 403 : 500 });

  const admin = await createAdminClient();
  const { data, error: listError } = await admin.auth.admin.mfa.listFactors({ userId: parsed.data.userId });
  if (listError) return NextResponse.json({ error: 'The member authenticator could not be checked.' }, { status: 503 });
  for (const factor of data.factors.filter((item) => item.factor_type === 'totp')) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ userId: parsed.data.userId, id: factor.id });
    if (error) return NextResponse.json({ error: 'Authenticator reset could not be completed. Contact support before retrying.' }, { status: 503 });
  }
  const { error: clearError } = await admin.rpc('clear_org_member_mfa_recovery_codes', { p_target_user_id: parsed.data.userId });
  if (clearError) return NextResponse.json({ error: 'Authenticator was removed, but recovery credentials could not be cleared. Contact support.' }, { status: 503 });
  const { error: auditError } = await supabase.rpc('record_org_member_mfa_reset', { p_org_id: orgId, p_target_user_id: parsed.data.userId });
  if (auditError) return NextResponse.json({ error: 'Authenticator was reset, but the audit record could not be confirmed.' }, { status: 503 });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store, private' } });
}
