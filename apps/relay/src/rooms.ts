import { WebSocket } from 'ws';
import { Room, ViewerSession } from './types';
import { logger } from './logger';
import { metrics } from './metrics';

export class RoomManager {
  private rooms = new Map<string, Room>();

  registerAgent(deviceId: string, orgId: string, ws: WebSocket): void {
    let room = this.rooms.get(deviceId);
    if (!room) {
      room = {
        deviceId,
        orgId,
        agent: null,
        agentConnectedAt: null,
        viewers: new Map<string, ViewerSession>()
      };
      this.rooms.set(deviceId, room);
    }

    if (room.orgId !== orgId) {
      logger.warn('room', `Org mismatch on agent registration: device=${deviceId} room_org=${room.orgId} request_org=${orgId}`);
      ws.close(1008, 'Organization mismatch');
      return;
    }

    if (room.agent) {
      logger.warn('room', `Agent already registered for device, kicking old agent: device=${deviceId}`);
      try {
        room.agent.close(1000, 'Replaced by new connection');
      } catch {
        // The previous socket may already be closing or destroyed. Closing is
        // best-effort: the new agent is registered below regardless, and losing
        // the stale reference is the only thing that matters here.
      }
    }

    room.agent = ws;
    room.agentConnectedAt = new Date();
    logger.info('room', `Agent registered: device=${deviceId} org=${orgId}`);
    
    this.updateMetrics();
  }

  unregisterAgent(deviceId: string): void {
    const room = this.rooms.get(deviceId);
    if (room) {
      room.agent = null;
      room.agentConnectedAt = null;
      logger.info('room', `Agent unregistered: device=${deviceId}`);
      
      // Notify viewers
      this.broadcastToViewers(deviceId, JSON.stringify({
        id: crypto.randomUUID(),
        type: 'device.status',
        payload: { status: 'offline' },
        timestamp: Date.now()
      }));

      // Cleanup room if empty
      if (room.viewers.size === 0) {
        this.rooms.delete(deviceId);
      }
      this.updateMetrics();
    }
  }

  joinViewer(deviceId: string, orgId: string, sessionId: string, adminId: string, mode: ViewerSession['mode'], ws: WebSocket): boolean {
    let room = this.rooms.get(deviceId);
    if (!room) {
      // Allow viewers to wait for agent to connect
      room = {
        deviceId,
        orgId,
        agent: null,
        agentConnectedAt: null,
        viewers: new Map<string, ViewerSession>()
      };
      this.rooms.set(deviceId, room);
    }

    if (room.orgId !== orgId) {
      logger.warn('room', `Tenant isolation violation attempt: admin=${adminId} org=${orgId} tried to access device=${deviceId} in org=${room.orgId}`);
      return false; // critical for tenant isolation
    }

    room.viewers.set(sessionId, { ws, adminId, mode, connectedAt: new Date() });
    logger.info('room', `Viewer joined: device=${deviceId} admin=${adminId} session=${sessionId} mode=${mode}`);
    this.updateMetrics();
    
    // Tell viewer about agent status
    if (room.agent) {
      ws.send(JSON.stringify({
        id: crypto.randomUUID(),
        type: 'device.status',
        payload: { status: 'online' },
        timestamp: Date.now()
      }));
    }
    
    return true;
  }

  leaveViewer(deviceId: string, sessionId: string): void {
    const room = this.rooms.get(deviceId);
    if (room) {
      room.viewers.delete(sessionId);
      logger.info('room', `Viewer left: device=${deviceId} session=${sessionId}`);
      
      if (!room.agent && room.viewers.size === 0) {
        this.rooms.delete(deviceId);
      }
      this.updateMetrics();
    }
  }

  getRoom(deviceId: string): Room | undefined {
    return this.rooms.get(deviceId);
  }

  routeToAgent(deviceId: string, orgId: string, message: Buffer | string): boolean {
    const room = this.rooms.get(deviceId);
    if (room && room.orgId === orgId && room.agent && room.agent.readyState === WebSocket.OPEN) {
      room.agent.send(message);
      return true;
    }
    return false;
  }

  broadcastToViewers(deviceId: string, data: Buffer | string): void {
    const room = this.rooms.get(deviceId);
    if (room) {
      for (const viewer of room.viewers.values()) {
        if (viewer.ws.readyState === WebSocket.OPEN) {
          viewer.ws.send(data);
        }
      }
    }
  }
  
  private updateMetrics() {
    let agentCount = 0;
    let viewerCount = 0;
    for (const room of this.rooms.values()) {
      if (room.agent) agentCount++;
      viewerCount += room.viewers.size;
    }
    metrics.setAgents(agentCount);
    metrics.setViewers(viewerCount);
  }

  getStats() {
    return {
      totalRooms: this.rooms.size,
      connectedAgents: Array.from(this.rooms.values()).filter(r => r.agent).length,
      totalViewers: Array.from(this.rooms.values()).reduce((acc, r) => acc + r.viewers.size, 0)
    };
  }
}
