import * as jwt from 'jsonwebtoken';
import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { ClientIdentity } from './types';
import { logger } from './logger';
import { errorMessage } from './errors';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!JWT_SECRET) {
  logger.error(
    'auth',
    'SUPABASE_JWT_SECRET is not set. Every connection will be rejected. Set it in the service environment.',
  );
}

/**
 * Claims consumed from a JWT presented on the WebSocket upgrade.
 *
 * `app_metadata` is the only metadata namespace Supabase reserves for
 * server-side writes. `user_metadata` is deliberately not trusted.
 */
interface TokenClaims {
  sub?: string;
  role?: string;
  type?: string;
  deviceId?: string;
  orgId?: string;
  agentVersion?: string;
  credentialVersion?: number;
  devicePublicKey?: string;
  app_metadata?: { org_id?: string; role?: string };
  user_metadata?: { org_id?: string };
  exp?: number;
}

/**
 * Roles that must never authenticate against the relay.
 *
 * The Supabase anon and service_role API keys are themselves JWTs signed with
 * the same JWT secret as user access tokens. Without this denylist, presenting a
 * copied API key would be accepted as an authenticated administrator.
 */
const FORBIDDEN_ROLES = new Set(['anon', 'service_role', 'supabase_admin']);
const seenDeviceProofs = new Map<string, number>();

/**
 * Verifies a relay token and resolves it to a client identity.
 *
 * TWO RULES THAT MUST NOT BE RELAXED:
 *
 * 1. The tenant is read ONLY from `app_metadata.org_id`.
 *
 *    The previous implementation fell back to `user_metadata.org_id` and then to
 *    a top-level `org_id` claim. This was a critical tenant-isolation hole:
 *    Supabase permits an end user to write their own `user_metadata`, so any
 *    authenticated user of any tenant could set `user_metadata.org_id` to a
 *    victim tenant's id and be granted relay access to that tenant's devices.
 *    That directly violates §86 (never rely on client-controlled values for
 *    tenant isolation) and §215 (tenant identifiers enforced on the websocket
 *    control channel). `app_metadata` is server-writable only, so it is trusted.
 *
 * 2. The check fails closed.
 *
 *    A token that is cryptographically valid but does not carry a trusted tenant
 *    claim is rejected, rather than being assumed to belong somewhere (§141).
 */
export function verifyToken(token: string): ClientIdentity | null {
  if (!JWT_SECRET) {
    logger.error('auth', 'Cannot verify token: JWT secret is missing');
    return null;
  }

  let claims: TokenClaims;
  try {
    const decoded: unknown = jwt.verify(token, JWT_SECRET);
    if (typeof decoded !== 'object' || decoded === null) {
      logger.warn('auth', 'Token payload is not an object');
      return null;
    }
    claims = decoded as TokenClaims;
  } catch (err: unknown) {
    logger.error('auth', `Token verification failed: ${errorMessage(err)}`);
    return null;
  }

  if (typeof claims.role === 'string' && FORBIDDEN_ROLES.has(claims.role)) {
    logger.warn('auth', 'Rejected a token carrying a non-user API role', {
      role: claims.role,
    });
    return null;
  }

  // ---- Windows Agent identity ----
  if (claims.type === 'agent') {
    if (typeof claims.deviceId !== 'string' || typeof claims.orgId !== 'string') {
      logger.warn('auth', 'Invalid agent token structure');
      return null;
    }
    if (!Number.isInteger(claims.credentialVersion ?? 1) || (claims.credentialVersion ?? 1) < 1 || !Number.isInteger(claims.exp)) {
      logger.warn('auth', 'Invalid device credential claims');
      return null;
    }
    if (typeof claims.devicePublicKey !== 'string') {
      logger.warn('auth', 'Rejected a device credential without a bound public key');
      return null;
    }
    return {
      type: 'agent',
      deviceId: claims.deviceId,
      orgId: claims.orgId,
      agentVersion: claims.agentVersion || 'unknown',
      devicePublicKey: claims.devicePublicKey,
      credentialVersion: claims.credentialVersion ?? 1,
      expiresAt: claims.exp! * 1000,
    };
  }

  // ---- Administrator identity ----
  const userId = claims.sub;
  const orgId = claims.app_metadata?.org_id;

  // Surface tampering attempts. A client-supplied tenant claim is not merely
  // ignored, it is treated as a signal worth recording (§233, §146).
  if (claims.user_metadata?.org_id && claims.user_metadata.org_id !== orgId) {
    logger.warn('auth', 'Rejected token: client-writable user_metadata attempted to set a tenant', {
      userId: userId ?? 'unknown',
      attemptedOrgId: claims.user_metadata.org_id,
      trustedOrgId: orgId ?? 'none',
    });
    return null;
  }

  if (typeof userId !== 'string' || typeof orgId !== 'string') {
    logger.warn('auth', 'Could not resolve a trusted tenant claim from token');
    return null;
  }

  return {
    type: 'admin',
    userId,
    orgId,
    role: claims.app_metadata?.role || 'authenticated',
    deviceId: typeof claims.deviceId === 'string' ? claims.deviceId : undefined,
    sessionId: crypto.randomUUID(),
  };
}

/** Verify a fresh, key-bound proof for each agent WebSocket handshake. */
export function verifyAgentRelayProof(
  identity: Extract<ClientIdentity, { type: 'agent' }>,
  timestampValue: string | null,
  nonceValue: string | null,
  signatureValue: string | null,
): Promise<boolean> {
  if (!timestampValue || !nonceValue || !signatureValue || !/^\d{10}$/.test(timestampValue) || !/^[a-f0-9]{32}$/i.test(nonceValue)) return Promise.resolve(false);
  const timestamp = Number(timestampValue);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return Promise.resolve(false);
  const nonce = nonceValue.toLowerCase();
  const replayKey = `${identity.deviceId}:${nonce}`;
  const now = Date.now();
  for (const [key, expiresAt] of seenDeviceProofs) if (expiresAt <= now) seenDeviceProofs.delete(key);
  if (seenDeviceProofs.has(replayKey)) return Promise.resolve(false);

  const canonical = `deepsee-relay-v1\n${identity.deviceId}\n${timestamp}\n${nonce}`;
  try {
    const key = createPublicKey({ key: Buffer.from(identity.devicePublicKey, 'base64'), format: 'der', type: 'pkcs1' });
    const valid = verifySignature('sha256', Buffer.from(canonical, 'utf8'), key, Buffer.from(signatureValue, 'base64'));
    if (!valid) return Promise.resolve(false);
    if (seenDeviceProofs.size > 50_000) return Promise.resolve(false);
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('auth', 'Shared device handshake authorization is not configured');
      return Promise.resolve(false);
    }
    return fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/authorize_device_relay_handshake`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_org_id: identity.orgId, p_device_id: identity.deviceId, p_credential_version: identity.credentialVersion, p_nonce: nonce, p_request_time: new Date(timestamp * 1000).toISOString() }),
      signal: AbortSignal.timeout(3_000),
    }).then(async (response) => {
      if (!response.ok) {
        logger.warn('auth', 'Shared device handshake authorization failed', { status: response.status });
        return false;
      }
      const authorized: unknown = await response.json();
      if (authorized !== true) return false;
      seenDeviceProofs.set(replayKey, now + 5 * 60 * 1000);
      return true;
    }).catch((error: unknown) => {
      logger.warn('auth', `Shared device handshake authorization unavailable: ${errorMessage(error)}`);
      return false;
    });
  } catch { return Promise.resolve(false); }
}
