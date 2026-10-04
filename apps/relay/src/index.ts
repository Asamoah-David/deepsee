import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import { verifyToken } from './auth';
import { RoomManager } from './rooms';
import { handleAgentMessage, handleAdminMessage } from './router';
import { logger } from './logger';
import { errorMessage } from './errors';
import { metrics } from './metrics';
import type { ClientIdentity, SessionMode } from './types';

const PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_PAYLOAD = 10 * 1024 * 1024; // 10MB ceiling for frames and file chunks.

/** How often to probe each socket for liveness. */
const HEARTBEAT_INTERVAL_MS = 30_000;

/** Modes accepted from the query string. Anything else is rejected, not coerced. */
const VALID_MODES: readonly SessionMode[] = ['view_only', 'control', 'support', 'admin'];

/**
 * Socket extended with liveness state.
 *
 * `isAlive` must live on the socket object itself. It previously existed only as
 * a closure variable inside the pong handler while the ping loop read
 * `ws.isAlive`, so the flag was permanently `undefined`. The loop then treated
 * every socket as dead on its first pass and terminated it, meaning no client
 * could hold a connection for more than one heartbeat interval - which breaks
 * §76 (persistent connection) and §218 (reconnect with backoff).
 */
interface TrackedSocket extends WebSocket {
  isAlive: boolean;
  identity: ClientIdentity;
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(metrics.getMetricsText());
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: MAX_PAYLOAD,
});
const roomManager = new RoomManager();

server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const identity = verifyToken(token);
    if (!identity) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, identity);
    });
  } catch (err: unknown) {
    logger.error('server', `Upgrade error: ${errorMessage(err)}`);

wss.on('connection', (ws: WebSocket, request: http.IncomingMessage, identity: ClientIdentity) => {
  metrics.incrementConnections();

  // Attach liveness state to the socket itself so the ping loop and the pong
  // handler observe the same variable.
  const socket = ws as TrackedSocket;
  socket.isAlive = true;
  socket.identity = identity;
  ws.on('pong', () => {
    socket.isAlive = true;
  });

  const url = new URL(request.url || '', `http://${request.headers.host}`);

  if (identity.type === 'agent') {
    roomManager.registerAgent(identity.deviceId, identity.orgId, ws);

    ws.on('message', (data: Buffer | string) => {
      metrics.addMessage(Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));
      handleAgentMessage(identity, roomManager, ws, data);
    });

    ws.on('close', () => {
      roomManager.unregisterAgent(identity.deviceId);
    });
  } else {
    // Admins target a device either at connect time (query string) or per
    // message. Both paths are supported: the screen view opens a socket bound to
    // one device, while a support session may act on several.
    const deviceId = url.searchParams.get('deviceId');
    const rawMode = url.searchParams.get('mode');
    const mode: SessionMode =
      rawMode && (VALID_MODES as readonly string[]).includes(rawMode)
        ? (rawMode as SessionMode)
        : 'view_only';

    if (rawMode && mode === 'view_only' && rawMode !== 'view_only') {
      logger.warn('router', 'Rejected unknown session mode, defaulted to view_only', {
        adminId: identity.userId,
        requestedMode: rawMode,
      });
    }

    if (deviceId) {
      const joined = roomManager.joinViewer(
        deviceId,
        identity.orgId,
        identity.sessionId,
        identity.userId,
        mode,
        ws,
      );

      if (!joined) {
        ws.close(1008, 'Tenant isolation violation or room unavailable');
        return;
      }
    } else {
      logger.warn('router', 'Admin connected without specifying deviceId', {
        adminId: identity.userId,
      });
    }

    ws.on('message', (data: Buffer | string) => {
      metrics.addMessage(Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));
      handleAdminMessage(identity, roomManager, ws, data);
    });

    ws.on('close', () => {
      if (deviceId) {
        roomManager.leaveViewer(deviceId, identity.sessionId);
      }
    });
  }

  ws.on('error', (err: Error) => {
    logger.error('server', `WebSocket error: ${err.message}`, { type: identity.type });
  });
});

// Liveness probe. Sockets that fail to answer a ping are terminated so a
// half-open TCP connection (routine on restrictive corporate networks, §82)
// cannot leave a device reporting as online indefinitely (§229).
const interval = setInterval(() => {
  wss.clients.forEach((client) => {
    const socket = client as TrackedSocket;
    if (socket.isAlive === false) {
      logger.debug('server', 'Terminating unresponsive socket', {
        type: socket.identity?.type ?? 'unknown',
      });
      socket.terminate();
      return;
    }
    socket.isAlive = false;
    socket.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => {
  clearInterval(interval);
});

server.listen(PORT, () => {
  logger.info('server', `Relay server listening on port ${PORT}`);
});

function shutdown(signal: string) {
  logger.info('server', `Shutting down relay server (${signal})`);
  clearInterval(interval);
  wss.close();
  server.close(() => {
    process.exit(0);
  });
  // Lingering sockets can keep the server open. A wedged deploy is worse than a
  // slightly abrupt disconnect, and agents reconnect by design (§218).
  setTimeout(() => process.exit(0), 5_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

    socket.destroy();
  }
});