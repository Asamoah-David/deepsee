import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 50)));
  const beforeValue = request.nextUrl.searchParams.get('before');
  const before = beforeValue && !Number.isNaN(Date.parse(beforeValue)) ? new Date(beforeValue).toISOString() : null;
  const search = (request.nextUrl.searchParams.get('search') || '').trim().slice(0, 100) || null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_current_org_audit_logs', { p_limit: limit, p_before: before, p_search: search });
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === 'PGRST202' ? 503 : 500;
    return NextResponse.json({ error: status === 403 ? 'You do not have permission to view this audit history.' : 'Audit history is unavailable. Apply the latest database migrations and try again.' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ entries: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}
