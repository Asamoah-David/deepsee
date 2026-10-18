import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid device.' }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.rpc('revoke_current_org_device', { p_device_id: id });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'You do not have permission to revoke this device.' : error.code === 'P0002' ? 'Device not found.' : 'The device could not be revoked.' }, { status: error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : 500 });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
