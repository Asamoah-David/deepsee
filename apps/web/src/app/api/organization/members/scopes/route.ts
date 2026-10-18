import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  userId: z.string().uuid(),
  department: z.string().trim().max(100).nullable(),
  deviceGroupScope: z.array(z.string().uuid()).max(100),
  limited: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid member scope.' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_current_org_member_scope', {
    p_target_user_id: parsed.data.userId,
    p_department: parsed.data.department,
    p_device_group_scope: parsed.data.deviceGroupScope,
    p_scope_limited: parsed.data.limited,
  });
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : error.code === '22023' ? 400 : error.code === 'PGRST202' ? 503 : 500;
    const message = error.code === '42501' ? 'You are not allowed to change this member scope or one of the selected groups is outside this organization.' :
      error.code === 'P0002' ? 'That member is no longer in this workspace.' :
        error.code === '22023' ? 'A restricted scope must include a department or at least one device group.' :
          'The member scope could not be saved.';
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
