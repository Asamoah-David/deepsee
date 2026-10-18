import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ requireMfa: z.boolean() });
const headers = { 'Cache-Control': 'no-store, private' };

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_current_org_mfa_policy');
  if (error) return NextResponse.json({ error: 'Organization security policy is unavailable.' }, { status: error.code === '42501' ? 403 : 500, headers });
  return NextResponse.json({ policy: data?.[0] ?? null }, { headers });
}

export async function PUT(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid MFA policy.' }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_current_org_mfa_policy', { p_required: parsed.data.requireMfa });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'An owner or super admin with a verified authenticator is required to change this policy.' : 'The security policy could not be updated.' }, { status: error.code === '42501' ? 403 : 500, headers });
  return NextResponse.json({ ok: true }, { headers });
}
