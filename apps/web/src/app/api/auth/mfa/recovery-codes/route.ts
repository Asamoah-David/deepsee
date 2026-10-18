import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const codes = Array.from({ length: 10 }, () => {
    const raw = randomBytes(16).toString('hex');
    return raw.match(/.{1,8}/g)!.join('-').toUpperCase();
  });
  const hashes = codes.map((code) => createHash('sha256').update(code.replaceAll('-', '').toLowerCase()).digest('hex'));
  const { error } = await supabase.rpc('replace_current_user_mfa_recovery_codes', { p_code_hashes: hashes });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'Complete an authenticator challenge before generating recovery codes.' : 'Recovery codes could not be generated.' }, { status: error.code === '42501' ? 403 : 500 });
  return NextResponse.json({ codes }, { headers: { 'Cache-Control': 'no-store, private', Pragma: 'no-cache' } });
}
