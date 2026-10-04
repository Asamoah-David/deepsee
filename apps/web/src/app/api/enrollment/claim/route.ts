import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

/**
 * POST /api/enrollment/claim
 *
 * Called by the Windows Agent during enrollment to claim an enrollment session
 * and register the device.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enrollment_code, device_id, hostname, os_version, hardware, network } = body;

    if (!enrollment_code || !device_id || !hostname) {
      return NextResponse.json(
        { error: 'enrollment_code, device_id, and hostname are required' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    const { data: session, error: sessionError } = await supabase
      .from('enrollment_sessions')
      .select('*')
      .eq('code', enrollment_code)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid or expired enrollment code' },
        { status: 404 }
      );
    }

    const sessionObj = session as { id: string; org_id: string };

    const { data: existingDevice } = await supabase
      .from('devices')
      .select('id')
      .eq('device_id', device_id)
      .single();

    if (existingDevice) {
      return NextResponse.json(
        { error: 'Device already enrolled' },
        { status: 409 }
      );
    }

    const public_key = randomUUID();

    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .insert({
        org_id: sessionObj.org_id,
        device_id,
        name: hostname,
        hostname,
        public_key,
        status: 'online',
        os_version,
        hardware: hardware || {},
        network: network || {},
        last_seen: new Date().toISOString(),
      })
      .select()
      .single();

    if (deviceError || !device) {
      console.error('Device creation error:', deviceError);
      return NextResponse.json(
        { error: 'Failed to create device' },
        { status: 500 }
      );
    }

    const deviceObj = device as { id: string; device_id: string; name: string; org_id: string };

    const { error: updateError } = await supabase
      .from('enrollment_sessions')
      .update({
        used_at: new Date().toISOString(),
        device_id: deviceObj.id,
      })
      .eq('id', sessionObj.id);

    if (updateError) {
      console.error('Session update error:', updateError);
    }

    const device_token = Buffer.from(
      JSON.stringify({
        device_id: deviceObj.id,
        org_id: deviceObj.org_id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
      })
    ).toString('base64');

    return NextResponse.json({
      success: true,
      device: {
        id: deviceObj.id,
        device_id: deviceObj.device_id,
        name: deviceObj.name,
      },
      relay_url: process.env.NEXT_PUBLIC_RELAY_URL,
      device_token,
    });
  } catch (error) {
    console.error('Enrollment claim error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
