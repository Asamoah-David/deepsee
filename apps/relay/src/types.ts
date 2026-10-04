export type ClientType = 'agent' | 'admin';

/** Remote session modes (§17, §157). */
export type SessionMode = 'view_only' | 'control' | 'support' | 'admin';

export interface AgentIdentity {
  type: 'agent';
  deviceId: string;
  orgId: string;
  agentVersion: string;
}

export interface AdminIdentity {
  type: 'admin';
  userId: string;
  orgId: string;
  role: string;
  sessionId: string;
}

export type ClientIdentity = AgentIdentity | AdminIdentity;

import { WebSocket } from 'ws';

export interface ViewerSession {
  ws: WebSocket;
  adminId: string;
  mode: SessionMode;
  connectedAt: Date;
}

export interface Room {
  deviceId: string;
  orgId: string;
  agent: WebSocket | null;
  agentConnectedAt: Date | null;
  viewers: Map<string, ViewerSession>; // sessionId -> ViewerSession
}

export type MessageType = 
  | 'screen.frame'        // binary JPEG frame from agent
  | 'screen.subscribe'    // admin wants to view screen
  | 'screen.unsubscribe'
  | 'input.mouse'         // mouse event from admin to agent
  | 'input.keyboard'      // keyboard event from admin to agent
  | 'command.send'        // command from admin
  | 'command.result'      // result from agent
  | 'file.list'           // file listing request
  | 'file.list.result'
  | 'file.upload.start'
  | 'file.upload.chunk'
  | 'file.download.start'
  | 'file.download.chunk'
  | 'device.heartbeat'    // agent heartbeat
  | 'device.metrics'      // agent metrics update
  | 'device.status'       // agent status change
  | 'session.start'
  | 'session.end'
  | 'ping'
  | 'pong';

export interface RelayMessage {
  id: string;
  type: MessageType;
  payload?: unknown;
  timestamp: number;
}
