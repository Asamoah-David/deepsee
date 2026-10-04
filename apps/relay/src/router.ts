import { WebSocket } from 'ws';
import { AgentIdentity, AdminIdentity, RelayMessage } from './types';
import { RoomManager } from './rooms';
import { logger } from './logger';
import { errorMessage } from './errors';

/**
 * Envelope for admin -> relay control messages.
 *
 * Typed instead of `any` so that a malformed message is a compile-time or
 * explicit-runtime concern rather than an accidental property access.
 */
export interface AdminMessage {
  type?: string;
  deviceId?: string;
  payload?: { deviceId?: string };
}

export { errorMessage };

export function handleAgentMessage(
  identity: AgentIdentity, 
  rooms: RoomManager, 
  ws: WebSocket, 
  data: Buffer | string
): void {
  // If binary, it's likely a screen frame
  if (Buffer.isBuffer(data)) {
    // We could potentially parse headers, but for now just broadcast to viewers
    rooms.broadcastToViewers(identity.deviceId, data);
    return;
  }

  try {
    const msg = JSON.parse(data as string) as RelayMessage;
    
    switch (msg.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      case 'device.heartbeat':
      case 'device.metrics':
      case 'command.result':
      case 'file.list.result':
      case 'file.download.chunk':
        rooms.broadcastToViewers(identity.deviceId, data);
        break;
      default:
        logger.debug('router', `Agent unhandled message type: ${msg.type}`, { deviceId: identity.deviceId });
        rooms.broadcastToViewers(identity.deviceId, data); // Default pass-through
    }
  } catch (err: unknown) {
    logger.warn('router', `Agent sent invalid JSON: ${errorMessage(err)}`, {
      deviceId: identity.deviceId,
    });
  }
}

export function handleAdminMessage(
  identity: AdminIdentity, 
  rooms: RoomManager, 
  ws: WebSocket, 
  data: Buffer | string
): void {
  // Admins mostly send JSON commands
  if (Buffer.isBuffer(data)) {
    logger.warn('router', `Admin sent binary data (not expected)`, { adminId: identity.userId });
    return;
  }

  try {
    const msg = JSON.parse(data as string) as AdminMessage;
    
    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      return;
    }

    const deviceId = msg.deviceId || msg.payload?.deviceId;
    if (!deviceId) {
      logger.warn('router', 'Admin message missing deviceId', { type: msg.type });
      return;
    }

    const room = rooms.getRoom(deviceId);
    if (!room) {
      logger.warn('router', `Admin sent message for unknown room: ${deviceId}`);
      return;
    }

    if (room.orgId !== identity.orgId) {
      logger.warn('router', `Tenant isolation violation: admin ${identity.userId} tried to message device ${deviceId}`);
      return;
    }

    // Forward relevant messages to the agent
    switch (msg.type) {
      case 'command.send':
      case 'input.mouse':
      case 'input.keyboard':
      case 'file.list':
      case 'file.download.start':
      case 'file.upload.start':
      case 'file.upload.chunk':
        rooms.routeToAgent(deviceId, identity.orgId, data);
        break;
      case 'screen.subscribe':
        logger.info('router', `Admin subscribed to screen`, { adminId: identity.userId, deviceId });
        // Optionally forward to agent to trigger screen streaming
        rooms.routeToAgent(deviceId, identity.orgId, data);
        break;
      case 'screen.unsubscribe':
        logger.info('router', `Admin unsubscribed from screen`, { adminId: identity.userId, deviceId });
        rooms.routeToAgent(deviceId, identity.orgId, data);
        break;
      default:
        logger.debug('router', `Admin unhandled message type: ${msg.type}`, { adminId: identity.userId });
        rooms.routeToAgent(deviceId, identity.orgId, data); // Default pass-through
    }
  } catch (err: unknown) {
    logger.warn('router', `Admin sent invalid JSON: ${errorMessage(err)}`, {
      adminId: identity.userId,
    });
  }
}
