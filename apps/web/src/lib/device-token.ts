import { createHmac, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/lib/env';

export interface DeviceTokenClaims {
  type: 'agent';
  deviceId: string;
  orgId: string;
  agentVersion: string;
  devicePublicKey: string;
  credentialVersion: number;
  iat: number;
  exp: number;
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function issueDeviceToken(input: Omit<DeviceTokenClaims, 'type' | 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ ...input, type: 'agent', iat: now, exp: now + 60 * 60 });
  const content = `${header}.${payload}`;
  const signature = createHmac('sha256', serverEnv().SUPABASE_JWT_SECRET)
    .update(content)
    .digest('base64url');
  return `${content}.${signature}`;
}

export function issueAdminRelayToken(input: {
  userId: string;
  orgId: string;
  deviceId: string;
  role: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: input.userId,
    role: 'authenticated',
    app_metadata: { org_id: input.orgId, role: input.role },
    deviceId: input.deviceId,
    iat: now,
    exp: now + 5 * 60,
  });
  const content = `${header}.${payload}`;
  const signature = createHmac('sha256', serverEnv().SUPABASE_JWT_SECRET)
    .update(content)
    .digest('base64url');
  return `${content}.${signature}`;
}

export function verifyDeviceToken(token: string, options: { allowExpired?: boolean } = {}): DeviceTokenClaims | null {
  const [header, payload, signature, extra] = token.split('.');
  if (!header || !payload || !signature || extra !== undefined) return null;

  const content = `${header}.${payload}`;
  const expected = createHmac('sha256', serverEnv().SUPABASE_JWT_SECRET)
    .update(content)
    .digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const parsedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as { alg?: string };
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<DeviceTokenClaims>;
    if (parsedHeader.alg !== 'HS256' || claims.type !== 'agent') return null;
    const credentialVersion = claims.credentialVersion ?? 1;
    if (!claims.deviceId || !claims.orgId || !Number.isInteger(credentialVersion) || credentialVersion < 1 || !claims.exp) return null;
    if (!options.allowExpired && claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return { ...claims, credentialVersion } as DeviceTokenClaims;
  } catch {
    return null;
  }
}
