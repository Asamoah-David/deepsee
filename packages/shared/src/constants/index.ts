import { FeatureFlags, MemberRole, OrgPlan, RolePermissions } from '../types';

export const ROLE_PERMISSIONS: Record<MemberRole, RolePermissions> = {
  owner: {
    view_device: true, remote_view: true, remote_control: true, file_transfer: true, terminal: true,
    deploy_apps: true, manage_policies: true, manage_users: true, manage_billing: true, view_audit: true,
    full_audit: true, delete_org: true
  },
  super_admin: {
    view_device: true, remote_view: true, remote_control: true, file_transfer: true, terminal: true,
    deploy_apps: true, manage_policies: true, manage_users: true, manage_billing: true, view_audit: true,
    full_audit: true, delete_org: false
  },
  admin: {
    view_device: true, remote_view: true, remote_control: true, file_transfer: true, terminal: true,
    deploy_apps: true, manage_policies: true, manage_users: true, manage_billing: false, view_audit: true,
    full_audit: false, delete_org: false
  },
  it_manager: {
    view_device: true, remote_view: true, remote_control: true, file_transfer: true, terminal: true,
    deploy_apps: true, manage_policies: true, manage_users: false, manage_billing: false, view_audit: true,
    full_audit: false, delete_org: false
  },
  technician: {
    view_device: true, remote_view: true, remote_control: true, file_transfer: true, terminal: true,
    deploy_apps: false, manage_policies: false, manage_users: false, manage_billing: false, view_audit: false,
    full_audit: false, delete_org: false
  },
  help_desk: {
    view_device: true, remote_view: true, remote_control: false, file_transfer: false, terminal: false,
    deploy_apps: false, manage_policies: false, manage_users: false, manage_billing: false, view_audit: false,
    full_audit: false, delete_org: false
  },
  auditor: {
    view_device: true, remote_view: false, remote_control: false, file_transfer: false, terminal: false,
    deploy_apps: false, manage_policies: false, manage_users: false, manage_billing: false, view_audit: true,
    full_audit: true, delete_org: false
  },
  viewer: {
    view_device: true, remote_view: false, remote_control: false, file_transfer: false, terminal: false,
    deploy_apps: false, manage_policies: false, manage_users: false, manage_billing: false, view_audit: false,
    full_audit: false, delete_org: false
  }
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  remote_control: true,
  file_transfer: true,
  terminal: true,
  camera: true,
  audio: true,
  monitoring: true,
  ai_assistant: true,
  session_recording: true,
  automation: true,
  deployments: true,
  customer_portal: true
};

export const PLAN_LIMITS: Record<OrgPlan, { max_devices: number; max_admins: number; }> = { 
  free: { max_devices: 5, max_admins: 2 }, 
  pro: { max_devices: 50, max_admins: 10 }, 
  business: { max_devices: 500, max_admins: 50 }, 
  enterprise: { max_devices: -1, max_admins: -1 }, 
  msp: { max_devices: -1, max_admins: -1 } 
};

export const ALERT_THRESHOLDS = { 
  cpu_high: 90, 
  ram_high: 90, 
  storage_low_gb: 10, 
  offline_minutes: 30 
};

export const COMMAND_TTL_SECONDS = 300; // 5 minutes default
export const HEARTBEAT_INTERVAL_MS = 15000;
export const METRIC_INTERVAL_MS = 30000;
