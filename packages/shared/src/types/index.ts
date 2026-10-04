// Organization
export type OrgPlan = 'free' | 'pro' | 'business' | 'enterprise' | 'msp';
export type MemberRole = 'owner' | 'super_admin' | 'admin' | 'it_manager' | 'technician' | 'help_desk' | 'auditor' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  settings: OrgSettings;
  feature_flags: FeatureFlags;
  created_at: string;
}

export interface OrgSettings {
  monitoring_level: 'minimal' | 'standard' | 'advanced' | 'custom';
  session_recording_enabled: boolean;
  retention_days: { activity: number; audit: number; recordings: number; metrics: number; };
  max_devices: number;
  max_admins: number;
  require_approval_for: string[];
  allowed_countries?: string[];
}

export interface FeatureFlags {
  remote_control: boolean;
  file_transfer: boolean;
  terminal: boolean;
  camera: boolean;
  audio: boolean;
  monitoring: boolean;
  ai_assistant: boolean;
  session_recording: boolean;
  automation: boolean;
  deployments: boolean;
  customer_portal: boolean;
}

// Device
export type DeviceStatus = 'online' | 'offline' | 'connecting' | 'degraded' | 'enrolling' | 'updating' | 'error';
export type DeviceHealthScore = 'healthy' | 'warning' | 'critical';

export interface Device {
  id: string;
  org_id: string;
  device_id: string;
  name: string;
  hostname: string;
  status: DeviceStatus;
  os_version: string;
  agent_version: string;
  last_seen: string | null;
  hardware: DeviceHardware;
  network: DeviceNetwork;
  capabilities: DeviceCapabilities;
  assigned_user_id: string | null;
  group_ids: string[];
  tags: string[];
  asset_info: AssetInfo;
  created_at: string;
  updated_at: string;
}

export interface DeviceHardware {
  manufacturer?: string;
  model?: string;
  cpu_name?: string;
  cpu_cores?: number;
  cpu_logical_processors?: number;
  ram_gb?: number;
  disks?: DiskInfo[];
  gpu_name?: string;
  monitors?: MonitorInfo[];
  bios_version?: string;
  serial_number?: string;
}

export interface DiskInfo {
  name: string;
  label?: string;
  type: 'SSD' | 'HDD' | 'Unknown';
  total_gb: number;
  free_gb: number;
  file_system: string;
}

export interface MonitorInfo {
  index: number;
  name: string;
  width: number;
  height: number;
  is_primary: boolean;
}

export interface DeviceNetwork {
  hostname?: string;
  domain?: string;
  adapters?: NetworkAdapter[];
  public_ip?: string;
  local_ip?: string;
}

export interface NetworkAdapter {
  name: string;
  mac_address?: string;
  ip_address?: string;
  speed_mbps?: number;
  is_wifi: boolean;
  is_connected: boolean;
}

export interface DeviceCapabilities {
  screen_view: boolean;
  remote_control: boolean;
  file_transfer: boolean;
  terminal: boolean;
  audio: boolean;
  camera: boolean;
  location: boolean;
  monitoring: boolean;
  automation: boolean;
}

export interface AssetInfo {
  asset_number?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  assigned_user?: string;
  department?: string;
  location?: string;
  cost?: number;
  lifecycle_status?: 'active' | 'maintenance' | 'retired' | 'spare';
}

// Metrics
export interface DeviceMetrics {
  id: number;
  device_id: string;
  org_id: string;
  recorded_at: string;
  cpu_percent: number;
  ram_percent: number;
  disk_percent: number;
  network_in_kbps: number;
  network_out_kbps: number;
  uptime_seconds: number;
  battery_percent: number | null;
  battery_charging: boolean | null;
}

// Alert
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'cpu_high' | 'ram_high' | 'storage_low' | 'device_offline' | 'service_stopped' | 'app_crash' | 'update_failed' | 'network_issue' | 'agent_outdated' | 'custom';

export interface Alert {
  id: string;
  org_id: string;
  device_id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  detail: Record<string, unknown>;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

// Command
export type CommandStatus = 'pending' | 'running' | 'success' | 'failed' | 'timeout' | 'cancelled' | 'device_offline' | 'permission_denied';
export type CommandType = 
  | 'system.restart' | 'system.shutdown' | 'system.lock' | 'system.logoff' | 'system.sleep'
  | 'service.start' | 'service.stop' | 'service.restart' | 'service.status'
  | 'process.list' | 'process.kill'
  | 'software.list' | 'software.install' | 'software.uninstall'
  | 'file.list' | 'file.read' | 'file.write' | 'file.delete' | 'file.move' | 'file.copy'
  | 'terminal.execute'
  | 'diagnostics.run' | 'diagnostics.report'
  | 'monitoring.snapshot'
  | 'screen.screenshot'
  | 'announcement.send'
  | 'workflow.execute';

export interface Command {
  id: string;
  org_id: string;
  device_id: string;
  issued_by: string;
  type: CommandType;
  payload: Record<string, unknown>;
  status: CommandStatus;
  result: Record<string, unknown> | null;
  expires_at: string;
  created_at: string;
  completed_at: string | null;
}

// Remote Session
export type SessionMode = 'view_only' | 'control' | 'support' | 'admin';
export interface RemoteSession {
  id: string;
  org_id: string;
  device_id: string;
  admin_id: string;
  mode: SessionMode;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  metadata: Record<string, unknown>;
}

// Workflow
export type TriggerType = 'manual' | 'scheduled' | 'event' | 'alert';
export interface WorkflowStep {
  id: string;
  type: 'command' | 'condition' | 'wait' | 'notification' | 'webhook';
  config: Record<string, unknown>;
  on_success?: string;
  on_failure?: string;
}
export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  description: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  steps: WorkflowStep[];
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Incident
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';
export interface Incident {
  id: string;
  org_id: string;
  title: string;
  status: IncidentStatus;
  severity: AlertSeverity;
  device_ids: string[];
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

// Ticket
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export interface Ticket {
  id: string;
  org_id: string;
  device_id: string;
  reported_by: string;
  assigned_to: string | null;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  resolved_at: string | null;
}

// RBAC
export interface RolePermissions {
  view_device: boolean;
  remote_view: boolean;
  remote_control: boolean;
  file_transfer: boolean;
  terminal: boolean;
  deploy_apps: boolean;
  manage_policies: boolean;
  manage_users: boolean;
  manage_billing: boolean;
  view_audit: boolean;
  full_audit: boolean;
  delete_org: boolean;
}

// API Responses
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// WebSocket/Relay message types
export interface RelayMessage {
  id: string;
  type: string;
  payload?: unknown;
  timestamp: number;
}

export interface HeartbeatPayload {
  device_id: string;
  org_id: string;
  agent_version: string;
  metrics: Pick<DeviceMetrics, 'cpu_percent' | 'ram_percent' | 'disk_percent' | 'network_in_kbps' | 'network_out_kbps' | 'uptime_seconds'>;
  status: DeviceStatus;
}

export interface MouseEventPayload {
  x: number;
  y: number;
  type: 'move' | 'click' | 'dblclick' | 'mousedown' | 'mouseup' | 'scroll';
  button?: 'left' | 'right' | 'middle';
  delta_y?: number;
  monitor_index?: number;
}

export interface KeyboardEventPayload {
  type: 'keydown' | 'keyup' | 'keypress';
  key: string;
  code: string;
  modifiers: { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean; };
}
