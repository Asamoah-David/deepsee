import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/devices/heartbeat
 *
 * Called by the Windows Agent to update its heartbeat and status.
 *
 * §76 (persistent connection): Agent authenticates, server recognizes device, device becomes ONLINE.
 * §104 (device status): ONLINE, OFFLINE, CONNECTING, DEGRADED, ENROLLING, UPDATING, ERROR.
 * §107 (device notifications): Agent can report device online, offline, etc.
 *
 * This endpoint is excluded from authentication middleware because the agent
 * authenticates with a device token, not a user session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_id, status = 'online', metrics } = body;

    if (!device_id) {
      return NextResponse.json(
        { error: 'device_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Find the device by device_id
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, org_id')
      .eq('device_id', device_id)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Update device heartbeat and status
    const { error: updateError } = await supabase.rpc('update_device_heartbeat', {
      p_device_id: (device as any).id,
      p_org_id: (device as any).org_id,
      p_status: status,
    } as any);

    if (updateError) {
      console.error('Heartbeat update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update heartbeat' },
        { status: 500 }
      );
    }

    // If metrics are provided, store them
    if (metrics) {
      const { error: metricsError } = await supabase
        .from('device_metrics')
        .insert({
          device_id: (device as any).id,
          org_id: (device as any).org_id,
          cpu_percent: metrics.cpu_percent,
          ram_percent: metrics.ram_percent,
          disk_percent: metrics.disk_percent,
          network_in_kbps: metrics.network_in_kbps,
          network_out_kbps: metrics.network_out_kbps,
          uptime_seconds: metrics.uptime_seconds,
          battery_percent: metrics.battery_percent,
          battery_charging: metrics.battery_charging,
        } as any);

      if (metricsError) {
        console.error('Metrics storage error:', metricsError);
        // Don't fail the heartbeat if metrics storage fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
