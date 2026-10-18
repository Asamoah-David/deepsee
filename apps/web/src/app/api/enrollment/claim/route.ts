import { NextRequest, NextResponse } from 'next/server';
import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { issueDeviceToken } from '@/lib/device-token';

/** Atomically claim a one-time enrollment code and issue a signed device JWT. */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid enrollment request' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const code = input['code'];
    const deviceId = input['deviceId'];
    const hostname = input['hostname'];
    const publicKey = input['publicKey'];
    const proofSignature = input['proofSignature'];
    const proofTimestamp = input['proofTimestamp'];
    const proofNonce = input['proofNonce'];
    const osVersion = input['osVersion'];
    const agentVersion = input['agentVersion'];

    if (
      typeof code !== 'string' || !/^(?:[A-F0-9]{8}|[A-F0-9]{32})$/i.test(code) ||
      typeof deviceId !== 'string' || deviceId.length > 128 ||
      typeof hostname !== 'string' || hostname.trim().length === 0 || hostname.length > 255 ||
      typeof publicKey !== 'string' || publicKey.length < 64 || publicKey.length > 8192
      || typeof proofSignature !== 'string' || proofSignature.length > 2048
      || typeof proofTimestamp !== 'number' || !Number.isInteger(proofTimestamp)
      || Math.abs(Math.floor(Date.now() / 1000) - proofTimestamp) > 300
      || typeof proofNonce !== 'string' || !/^[a-f0-9]{32}$/i.test(proofNonce)
    ) {
      return NextResponse.json({ error: 'Invalid enrollment request fields' }, { status: 400 });
    }

    const normalizedCode = code.toUpperCase();
    const normalizedHostname = hostname.trim();
    const proofMessage = `${normalizedCode}\n${deviceId}\n${normalizedHostname}\n${proofTimestamp}\n${proofNonce.toLowerCase()}`;
    let proofValid = false;
    try {
      const key = createPublicKey({ key: Buffer.from(publicKey, 'base64'), format: 'der', type: 'pkcs1' });
      proofValid = verifySignature('sha256', Buffer.from(proofMessage, 'utf8'), key, Buffer.from(proofSignature, 'base64'));
    } catch {
      proofValid = false;
    }
    if (!proofValid) return NextResponse.json({ error: 'Device key proof could not be verified' }, { status: 401 });

    const supabase = await createAdminClient();
    const { data, error } = await supabase.rpc('claim_enrollment_session', {
      p_code: normalizedCode,
      p_device_id: deviceId,
      p_hostname: normalizedHostname,
      p_public_key: publicKey,
      p_os_version: typeof osVersion === 'string' ? osVersion.slice(0, 255) : null,
      p_hardware: {
        fingerprint: typeof input['hardwareFingerprint'] === 'string'
          ? input['hardwareFingerprint'].slice(0, 256)
          : null,
      },
      p_network: {},
      p_agent_version: typeof agentVersion === 'string' ? agentVersion.slice(0, 64) : null,
    });

    if (error || !Array.isArray(data) || data.length !== 1) {
      if (error?.message.includes('invalid_or_expired_enrollment')) {
        return NextResponse.json({ error: 'Invalid or expired enrollment code' }, { status: 404 });
      }
      if (error?.code === '23505') {
        return NextResponse.json({ error: 'Device is already enrolled' }, { status: 409 });
      }
      console.error('Enrollment claim failed:', error);
      return NextResponse.json({ error: 'Enrollment could not be completed' }, { status: 500 });
    }

    const device = data[0] as { id: string; org_id: string; device_id: string; name: string };
    const deviceJwt = issueDeviceToken({
      deviceId: device.device_id,
      orgId: device.org_id,
      agentVersion: typeof agentVersion === 'string' ? agentVersion.slice(0, 64) : 'unknown',
      devicePublicKey: publicKey,
      credentialVersion: 1,
    });

    return NextResponse.json({
      success: true,
      deviceId: device.device_id,
      orgId: device.org_id,
      deviceJwt,
      credentialVersion: 1,
      relayUrl: publicEnv.NEXT_PUBLIC_RELAY_URL,
    });
  } catch (error) {
    console.error('Enrollment claim error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
