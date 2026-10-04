import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/devices/heartbeat
 *
 * Called by the Windows Agent to update its heartbeat and status.
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

    const deviceObj = device as { id: string; org_id: string };

    const { error: updateError } = await supabase
      .from('devices')
      .update({
        status,
        last_seen: new Date().toISOString(),
      })
      .eq('id', deviceObj.id);

    if (updateError) {
      console.error('Heartbeat update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update heartbeat' },
        { status: 500 }
      );
    }

    if (metrics) {
      const { error: metricsError } = await supabase
        .from('device_metrics')
        .insert({
          device_id: deviceObj.id,
          org_id: deviceObj.org_id,
          cpu_percent: metrics.cpu_percent,
          ram_percent: metrics.ram_percent,
          disk_percent: metrics.disk_percent,
          network_in_kbps: metrics.network_in_kbps,
          network_out_kbps: metrics.network_out_kbps,
          uptime_seconds: metrics.uptime_seconds,
          battery_percent: metrics.battery_percent,
          battery_charging: metrics.battery_charging,
        });

      if (metricsError) {
        console.error('Metrics storage error:', metricsError);
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
