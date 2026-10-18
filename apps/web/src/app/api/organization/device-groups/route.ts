import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(240).optional() });

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: membership } = await supabase.from('memberships').select('org_id').eq('user_id', user.id).order('created_at').limit(1).maybeSingle();
  if (!membership) return NextResponse.json({ error: 'No organization membership found.' }, { status: 403 });
  const { data, error } = await supabase.from('device_groups').select('id,name,description,created_at').eq('org_id', membership.org_id).order('name');
  if (error) return NextResponse.json({ error: 'Device groups are unavailable.' }, { status: 500 });
  return NextResponse.json({ groups: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a group name between 2 and 80 characters.' }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_current_org_device_group', {
    p_name: parsed.data.name,
    p_description: parsed.data.description ?? null,
  });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'You do not have permission to create device groups.' : error.code === '23505' ? 'A group with that name already exists.' : 'The device group could not be created.' }, { status: error.code === '42501' ? 403 : error.code === '23505' ? 409 : 500 });
  return NextResponse.json({ group: data?.[0] }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
