import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

/**
 * POST /api/enrollment/claim
 *
 * Called by the Windows Agent during enrollment to claim an enrollment session
 * and register the device.
 *
 * §72 (enrollment link): User clicks link, downloads agent, runs installer.
 * §73 (USB enrollment): User runs installer with enrollment code.
 * §74 (enrollment security): Enrollment code is temporary, device receives permanent identity.
 * §75 (device identity): Every device receives a unique cryptographic identity.
 *
 * This endpoint is excluded from authentication middleware because the agent
 * authenticates with the enrollment code, not a user session.
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

    // Find the enrollment session
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

    // Check if device_id already exists
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

    // Generate device keys (in production, this would be done by the agent)
    // For now, we'll generate a placeholder
    const public_key = randomUUID(); // Placeholder - should be actual RSA public key from agent

    // Create the device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .insert({
        org_id: (session as any).org_id,
        device_id,
        name: hostname,
        hostname,
        public_key,
        status: 'online',
        os_version,
        hardware: hardware || {},
        network: network || {},
        last_seen: new Date().toISOString(),
      } as any)
      .select()
      .single() as any;

    if (deviceError) {
      console.error('Device creation error:', deviceError);
      return NextResponse.json(
        { error: 'Failed to create device' },
        { status: 500 }
      );
    }

    // Mark enrollment session as used
    const { error: updateError } = await supabase
      .from('enrollment_sessions')
      .update({
        used_at: new Date().toISOString(),
        device_id: device.id,
      } as any)
      .eq('id', (session as any).id) as any;

    if (updateError) {
      console.error('Session update error:', updateError);
    }

    // Generate a device-specific JWT token for subsequent authentication
    // In production, this would be signed with the server's private key
    const device_token = Buffer.from(
      JSON.stringify({
        device_id: device.id,
        org_id: device.org_id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
      })
    ).toString('base64');

    return NextResponse.json({
      success: true,
      device: {
        id: device.id,
        device_id: device.device_id,
        name: device.name,
      },
      // Relay server configuration
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
