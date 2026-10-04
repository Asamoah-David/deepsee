import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/stats
 *
 * Returns dashboard statistics for the current user's organization.
 *
 * §12 (command center dashboard): Shows total devices, online/offline status,
 * health metrics, active sessions, open incidents, etc.
 * §86 (tenant isolation): RLS automatically filters to user's organizations.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Get total devices
    const { count: totalDevices, error: devicesError } = await supabase
      .from('devices')
      .select('*', { count: 'exact', head: true });

    if (devicesError) {
      console.error('Devices count error:', devicesError);
    }

    // Get devices by status
    const { data: devicesByStatus } = await supabase
      .from('devices')
      .select('status');

    const statusCounts = {
      online: 0,
      offline: 0,
      warning: 0,
      critical: 0,
    };

    devicesByStatus?.forEach((device: any) => {
      const status = device.status as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    });

    // Get active remote sessions
    const { count: activeSessions, error: sessionsError } = await supabase
      .from('remote_sessions')
      .select('*', { count: 'exact', head: true })
      .is('ended_at', null);

    if (sessionsError) {
      console.error('Sessions count error:', sessionsError);
    }

    // Get open incidents
    const { count: openIncidents, error: incidentsError } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    if (incidentsError) {
      console.error('Incidents count error:', incidentsError);
    }

    // Get unresolved alerts
    const { count: unresolvedAlerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false);

    if (alertsError) {
      console.error('Alerts count error:', alertsError);
    }

    // Get recent devices
    const { data: recentDevices, error: recentError } = await supabase
      .from('devices')
      .select('id, name, hostname, status, os_version, metadata')
      .order('last_seen', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Recent devices error:', recentError);
    }

    // Get recent alerts
    const { data: recentAlerts, error: recentAlertsError } = await supabase
      .from('alerts')
      .select('id, type, severity, title, detail, created_at, devices(name)')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentAlertsError) {
      console.error('Recent alerts error:', recentAlertsError);
    }

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
