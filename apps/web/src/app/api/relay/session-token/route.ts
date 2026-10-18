import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { issueAdminRelayToken } from '@/lib/device-token';

type SessionMode = 'view_only' | 'control' | 'support' | 'admin';

const roleModes: Record<string, SessionMode[]> = {
  owner: ['view_only', 'control', 'support', 'admin'],
  super_admin: ['view_only', 'control', 'support', 'admin'],
  admin: ['view_only', 'control', 'support', 'admin'],
  technician: ['view_only', 'control', 'support'],
  help_desk: ['view_only', 'support'],
  viewer: ['view_only'],
  auditor: ['view_only'],
};

/** Issue a five-minute, single-device relay credential from current membership. */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const requestedDevice = searchParams.get('deviceId');
    const mode = (searchParams.get('mode') || 'view_only') as SessionMode;
    if (!requestedDevice || !['view_only', 'control', 'support', 'admin'].includes(mode)) {
      return NextResponse.json({ error: 'deviceId and a valid session mode are required' }, { status: 400 });
    }

    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, device_id, org_id, revoked_at')
      .eq('id', requestedDevice)
      .single();
    if (deviceError || !device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    if ((device as { revoked_at: string | null }).revoked_at) {
      return NextResponse.json({ error: 'Device has been revoked' }, { status: 403 });
    }

    const deviceRecord = device as { device_id: string; org_id: string };
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('org_id', deviceRecord.org_id)
      .single();
    if (membershipError || !membership) return NextResponse.json({ error: 'No organization membership found' }, { status: 403 });

    const member = membership as { role: string };
    if (!roleModes[member.role]?.includes(mode)) {
      return NextResponse.json({ error: 'Your role does not permit this session mode' }, { status: 403 });
    }
    const token = issueAdminRelayToken({
      userId: user.id,
      orgId: deviceRecord.org_id,
      deviceId: deviceRecord.device_id,
      role: member.role,
    });
    return NextResponse.json({ token, relayDeviceId: deviceRecord.device_id, expiresIn: 300 }, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Relay session authorization failed:', error);
    return NextResponse.json({ error: 'Could not authorize remote session' }, { status: 500 });
  }
}
