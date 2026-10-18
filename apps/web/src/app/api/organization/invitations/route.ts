import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(['admin', 'it_manager', 'technician', 'help_desk', 'auditor', 'viewer', 'member']),
});
const revokeSchema = z.object({ invitationId: z.string().uuid() });
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/i);
const noStore = { 'Cache-Control': 'no-store' };

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: noStore });
}

function sameOrigin(request: NextRequest) {
  return request.headers.get('origin') === request.nextUrl.origin;
}

function hashToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const token = request.nextUrl.searchParams.get('token');
  if (token) {
    const parsed = tokenSchema.safeParse(token);
    if (!parsed.success) return responseError('This invitation is invalid or expired.', 404);
    const { data, error } = await supabase.rpc('get_org_invitation_by_token', { p_token_hash: hashToken(parsed.data) });
    if (error) {
      console.error('[organization.invitations.lookup] RPC failed', { code: error.code ?? null });
      return responseError('Invitation details are temporarily unavailable.', 503);
    }
    if (!data?.length) return responseError('This invitation is invalid or expired.', 404);
    return NextResponse.json({ invitation: data[0] }, { headers: noStore });
  }

  const { data, error } = await supabase.rpc('list_current_org_invitations');
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === 'PGRST202' ? 503 : 500;
    return responseError(status === 403 ? 'You do not have permission to manage workspace invitations.' : 'Invitations are unavailable.', status);
  }
  return NextResponse.json({ invitations: data ?? [] }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return responseError('Invalid request origin.', 403);
  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) return responseError('Enter a valid email address and role.', 400);

  const token = randomBytes(32).toString('hex');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_current_org_invitation', {
    p_email: parsed.data.email,
    p_role: parsed.data.role,
    p_token_hash: hashToken(token),
  });
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === '23505' ? 409 : error.code === '22023' ? 400 : error.code === 'PGRST202' ? 503 : 500;
    const message = error.code === '42501' ? 'You do not have permission to invite this role.' :
      error.code === '23505' ? 'This email is already a member or has a pending invitation.' :
        error.code === '22023' ? 'The invitation details are invalid.' :
          'The invitation could not be created.';
    return responseError(message, status);
  }
  const invitation = data?.[0];
  if (!invitation) return responseError('The invitation could not be created.', 500);
  return NextResponse.json({
    invitation,
    inviteUrl: new URL(`/invite/accept?token=${token}`, request.nextUrl.origin).toString(),
  }, { status: 201, headers: noStore });
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return responseError('Invalid request origin.', 403);
  const payload = await request.json().catch(() => null);
  const parsed = tokenSchema.safeParse(payload && typeof payload === 'object' ? (payload as { token?: unknown }).token : null);
  if (!parsed.success) return responseError('This invitation is invalid or expired.', 404);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('accept_org_invitation', { p_token_hash: hashToken(parsed.data) });
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : error.code === '23505' ? 409 : error.code === 'PGRST202' ? 503 : 500;
    const message = error.code === '42501' ? 'Sign in with the email address that received this invitation.' :
      error.code === 'P0002' ? 'This invitation is invalid, expired, or already used.' :
        error.code === '23505' ? 'This account already has access to the organization.' :
          'The invitation could not be accepted.';
    return responseError(message, status);
  }
  return NextResponse.json({ organization: data?.[0] ?? null }, { headers: noStore });
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return responseError('Invalid request origin.', 403);
  const payload = await request.json().catch(() => null);
  const parsed = revokeSchema.safeParse(payload);
  if (!parsed.success) return responseError('Choose a valid invitation.', 400);

  const supabase = await createClient();
  const { error } = await supabase.rpc('revoke_current_org_invitation', { p_invitation_id: parsed.data.invitationId });
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : error.code === 'PGRST202' ? 503 : 500;
    return responseError(status === 403 ? 'You are not allowed to revoke this invitation.' : 'The invitation could not be revoked.', status);
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}
