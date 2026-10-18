import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyDeviceToken } from '@/lib/device-token';
import { z } from 'zod';

const heartbeatSchema = z.object({
  device_id: z.string().min(1).max(128),
  metrics: z.object({
    cpu_percent: z.number().finite().min(0).max(100).optional(),
    ram_percent: z.number().finite().min(0).max(100).optional(),
    disk_percent: z.number().finite().min(0).max(100).optional(),
    network_in_kbps: z.number().finite().min(0).max(10_000_000).optional(),
    network_out_kbps: z.number().finite().min(0).max(10_000_000).optional(),
    uptime_seconds: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
    battery_percent: z.number().finite().min(0).max(100).nullable().optional(),
    battery_charging: z.boolean().nullable().optional(),
  }).optional(),
});

/**
 * POST /api/devices/heartbeat
 *
 * Called by the Windows Agent to update its heartbeat and status.
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    const claims = token ? verifyDeviceToken(token) : null;
    if (!claims) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const parsedBody = heartbeatSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'invalid heartbeat payload' }, { status: 400 });
    }
    const { device_id, metrics } = parsedBody.data;

    if (!device_id || device_id !== claims.deviceId) {
      return NextResponse.json(
        { error: 'device identity does not match token' },
        { status: 403 }
      );
    }

    const supabase = await createAdminClient();

    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, org_id, revoked_at, credential_version')
      .eq('device_id', device_id)
      .eq('org_id', claims.orgId)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    const deviceObj = device as { id: string; org_id: string; revoked_at: string | null; credential_version: number };
    if (deviceObj.revoked_at) {
      return NextResponse.json({ error: 'device has been revoked' }, { status: 403 });
    }
    if (claims.credentialVersion !== deviceObj.credential_version) {
      return NextResponse.json({ error: 'device credential has been rotated' }, { status: 401 });
    }

    const { data: heartbeatUpdated, error: updateError } = await supabase
      .from('devices')
      .update({
        status: 'online',
        last_seen: new Date().toISOString(),
      })
      .eq('id', deviceObj.id)
      .eq('credential_version', claims.credentialVersion)
      .is('revoked_at', null)
      .select('id');

    if (updateError) {
      console.error('Heartbeat update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update heartbeat' },
        { status: 500 }
      );
    }
    if (!heartbeatUpdated?.length) {
      const { data: currentDevice } = await supabase.from('devices')
        .select('credential_version,revoked_at').eq('id', deviceObj.id).maybeSingle();
      const revoked = !currentDevice || currentDevice.revoked_at;
      return NextResponse.json({ error: revoked ? 'device has been revoked' : 'device credential has been rotated' }, { status: revoked ? 403 : 401 });
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

    return NextResponse.json({ success: true, received_at: new Date().toISOString() });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
