import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { issueDeviceToken, verifyDeviceToken } from '@/lib/device-token';

const schema = z.object({ timestamp: z.number().int(), nonce: z.string().regex(/^[a-f0-9]{32}$/i), signature: z.string().min(64).max(2048) });

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  const claims = bearer ? verifyDeviceToken(bearer, { allowExpired: true }) : null;
  if (!claims) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Math.abs(Math.floor(Date.now() / 1000) - parsed.data.timestamp) > 300) {
    return NextResponse.json({ error: 'invalid rotation proof' }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const { data: device, error: deviceError } = await supabase.from('devices')
    .select('id,org_id,device_id,public_key,credential_version,revoked_at')
    .eq('device_id', claims.deviceId).eq('org_id', claims.orgId).maybeSingle();
  if (deviceError || !device || device.revoked_at || !device.public_key) {
    return NextResponse.json({ error: 'device unavailable' }, { status: 403 });
  }
  if (claims.devicePublicKey && claims.devicePublicKey !== device.public_key) {
    return NextResponse.json({ error: 'device key has changed; re-enrollment is required' }, { status: 401 });
  }
  const expectedVersion = claims.credentialVersion ?? 1;
  if (expectedVersion > device.credential_version || expectedVersion < device.credential_version - 1) {
    return NextResponse.json({ error: 'device credential is stale; re-enrollment is required' }, { status: 401 });
  }

  const canonical = `POST\n/api/devices/credentials/rotate\n${claims.deviceId}\n${parsed.data.timestamp}\n${parsed.data.nonce.toLowerCase()}`;
  let proofValid = false;
  try {
    const key = createPublicKey({ key: Buffer.from(device.public_key, 'base64'), format: 'der', type: 'pkcs1' });
    proofValid = verifySignature('sha256', Buffer.from(canonical, 'utf8'), key, Buffer.from(parsed.data.signature, 'base64'));
  } catch { proofValid = false; }
  if (!proofValid) return NextResponse.json({ error: 'device key proof could not be verified' }, { status: 401 });

  const { data, error } = await supabase.rpc('rotate_device_credential', {
    p_org_id: claims.orgId,
    p_device_id: claims.deviceId,
    p_expected_version: expectedVersion,
    p_nonce: parsed.data.nonce.toLowerCase(),
    p_request_time: new Date(parsed.data.timestamp * 1000).toISOString(),
  });
  if (error || !data?.length) {
    const status = error?.code === '23505' ? 409 : error?.code === 'P0002' ? 403 : error?.code === '40001' ? 401 : 503;
    return NextResponse.json({ error: status === 409 ? 'rotation request was already used' : status === 401 ? 'device credential is stale' : 'device credential could not be rotated' }, { status });
  }

  const credentialVersion = Number(data[0].credential_version);
  const deviceJwt = issueDeviceToken({ deviceId: claims.deviceId, orgId: claims.orgId, agentVersion: claims.agentVersion || 'unknown', devicePublicKey: device.public_key, credentialVersion });
  return NextResponse.json({ deviceJwt, credentialVersion }, { headers: { 'Cache-Control': 'no-store, private', Pragma: 'no-cache' } });
}
