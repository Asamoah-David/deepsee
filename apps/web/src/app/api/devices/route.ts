import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/devices
 *
 * Returns list of devices for the current user's organization.
 *
 * §14 (device directory): Every enrolled device has a device profile.
 * §86 (tenant isolation): RLS automatically filters to user's organizations.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const { data: membership } = await supabase.from('memberships').select('role').eq('user_id', user.id).order('created_at').limit(1).maybeSingle();
    const canManageOrg = ['owner', 'super_admin', 'admin'].includes((membership as { role?: string } | null)?.role ?? '');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('devices')
      .select('id,device_id,name,hostname,status,os_version,last_seen,metadata,group_ids,department,revoked_at', { count: 'exact' })
      .order('last_seen', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,hostname.ilike.%${search}%,device_id.ilike.%${search}%`);
    }

    const { data: devices, count, error } = await query;

    if (error) {
      console.error('Devices fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
    }

    return NextResponse.json({
      devices: devices || [],
      canManageOrg,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Devices error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
