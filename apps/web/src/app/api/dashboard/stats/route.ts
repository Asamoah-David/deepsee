import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/stats
 *
 * Returns dashboard statistics for the current user's organization.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { count: totalDevices } = await supabase
      .from('devices')
      .select('*', { count: 'exact', head: true });

    const { data: devicesByStatus } = await supabase
      .from('devices')
      .select('status');

    const statusCounts = {
      online: 0,
      offline: 0,
      warning: 0,
      critical: 0,
    };

    if (devicesByStatus) {
      for (const d of devicesByStatus) {
        const s = d.status as keyof typeof statusCounts;
        if (s in statusCounts) {
          statusCounts[s]++;
        }
      }
    }

    const { count: activeSessions } = await supabase
      .from('remote_sessions')
      .select('*', { count: 'exact', head: true })
      .is('ended_at', null);

    const { count: openIncidents } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    const { count: unresolvedAlerts } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false);

    const { data: recentDevices } = await supabase
      .from('devices')
      .select('id, name, hostname, status, os_version, metadata, last_seen')
      .order('last_seen', { ascending: false })
      .limit(10);

    const { data: recentAlerts } = await supabase
      .from('alerts')
      .select('id, type, severity, title, detail, created_at, devices(name)')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      stats: {
        totalDevices: totalDevices || 0,
        online: statusCounts.online || 0,
        offline: statusCounts.offline || 0,
        warning: statusCounts.warning || 0,
        critical: statusCounts.critical || 0,
        activeSessions: activeSessions || 0,
        openIncidents: openIncidents || 0,
        unresolvedAlerts: unresolvedAlerts || 0,
      },
      recentDevices: recentDevices || [],
      recentAlerts: recentAlerts || [],
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
