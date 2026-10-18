import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const updateSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'it_manager', 'technician', 'help_desk', 'auditor', 'viewer', 'member']),
});
const removeSchema = z.object({ userId: z.string().uuid() });

function sameOrigin(request: NextRequest) {
  return request.headers.get('origin') === request.nextUrl.origin;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET() {
  const supabase = await createClient();
  const [membersResult, scopesResult, groupsResult] = await Promise.all([
    supabase.rpc('list_current_org_members'),
    supabase.rpc('list_current_org_member_scopes'),
    supabase.from('device_groups').select('id,name').order('name'),
  ]);
  const error = membersResult.error || scopesResult.error || groupsResult.error;
  if (error) {
    console.error('[organization.members.list] data fetch failed', { code: error.code ?? null });
    const status = error.code === '42501' ? 403 : 500;
    return errorResponse(status === 403 ? 'You do not have permission to manage workspace members.' : 'Member list is unavailable. Apply the latest database migrations and try again.', status);
  }
  return NextResponse.json({ members: membersResult.data ?? [], scopes: scopesResult.data ?? [], groups: groupsResult.data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return errorResponse('Invalid request origin.', 403);
  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) return errorResponse('Choose a valid member and role.', 400);

  const supabase = await createClient();
  const { error } = await supabase.rpc('manage_current_org_member', {
    p_target_user_id: parsed.data.userId,
    p_new_role: parsed.data.role,
    p_remove: false,
  });
  if (error) return errorResponse(
    error.code === '42501' ? 'You are not allowed to make that membership change.' :
      error.code === 'P0002' ? 'That member is no longer in this workspace.' :
        error.code === 'PGRST202' ? 'Apply the latest database migrations before managing members.' :
          'The member role could not be updated.',
    error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : error.code === 'PGRST202' ? 503 : 500,
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return errorResponse('Invalid request origin.', 403);
  const payload = await request.json().catch(() => null);
  const parsed = removeSchema.safeParse(payload);
  if (!parsed.success) return errorResponse('Choose a valid member.', 400);

  const supabase = await createClient();
  const { error } = await supabase.rpc('manage_current_org_member', {
    p_target_user_id: parsed.data.userId,
    p_new_role: null,
    p_remove: true,
  });
  if (error) return errorResponse(
    error.code === '42501' ? 'You are not allowed to remove that member.' :
      error.code === 'P0002' ? 'That member is no longer in this workspace.' :
        error.code === 'PGRST202' ? 'Apply the latest database migrations before managing members.' :
          'The member could not be removed.',
    error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : error.code === 'PGRST202' ? 503 : 500,
  );
  return NextResponse.json({ ok: true });
}
