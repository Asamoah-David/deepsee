import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ department: z.string().trim().max(100).nullable(), groupIds: z.array(z.string().uuid()).max(100) });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid device.' }, { status: 400 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid department and group list.' }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.rpc('update_current_org_device_placement', {
    p_device_id: id, p_department: parsed.data.department, p_group_ids: parsed.data.groupIds,
  });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'You do not have permission to change this device placement.' : 'The device placement could not be saved.' }, { status: error.code === '42501' ? 403 : 500 });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
