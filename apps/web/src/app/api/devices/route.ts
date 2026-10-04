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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('devices')
      .select('*', { count: 'exact' })
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
