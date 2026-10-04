import { AlertSeverity, DeviceHealthScore, DeviceStatus, MemberRole, RolePermissions } from '../types';
import { ROLE_PERMISSIONS } from '../constants';

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function getDeviceStatusColor(status: DeviceStatus): string {
  switch (status) {
    case 'online': return 'bg-emerald-500';
    case 'offline': return 'bg-slate-500';
    case 'connecting': return 'bg-blue-500';
    case 'degraded': return 'bg-yellow-500';
    case 'enrolling': return 'bg-purple-500';
    case 'updating': return 'bg-cyan-500';
    case 'error': return 'bg-red-500';
    default: return 'bg-slate-500';
  }
}

export function getHealthColor(score: DeviceHealthScore): string {
  switch (score) {
    case 'healthy': return 'text-emerald-500';
    case 'warning': return 'text-yellow-500';
    case 'critical': return 'text-red-500';
    default: return 'text-slate-500';
  }
}

export function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'info': return 'text-blue-500';
    case 'warning': return 'text-yellow-500';
    case 'critical': return 'text-red-500';
    default: return 'text-slate-500';
  }
}

export function roleHasPermission(role: MemberRole, permission: keyof RolePermissions): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

export function generateEnrollmentCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

export function formatRelativeTime(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const time = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const now = Date.now();
  const diffInSeconds = (time - now) / 1000;
  
  if (Math.abs(diffInSeconds) < 60) {
    return 'just now';
  }
  
  const diffInMinutes = diffInSeconds / 60;
  if (Math.abs(diffInMinutes) < 60) {
    return rtf.format(Math.round(diffInMinutes), 'minute');
  }
  
  const diffInHours = diffInMinutes / 60;
  if (Math.abs(diffInHours) < 24) {
    return rtf.format(Math.round(diffInHours), 'hour');
  }
  
  const diffInDays = diffInHours / 24;
  if (Math.abs(diffInDays) < 30) {
    return rtf.format(Math.round(diffInDays), 'day');
  }
  
  const diffInMonths = diffInDays / 30;
  if (Math.abs(diffInMonths) < 12) {
    return rtf.format(Math.round(diffInMonths), 'month');
  }
  
  const diffInYears = diffInDays / 365;
  return rtf.format(Math.round(diffInYears), 'year');
}

export function isDeviceOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  
  // A device is considered online if it was seen within the last 30 seconds
  // Allowing some buffer for network delays
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffInMs = now.getTime() - lastSeenDate.getTime();
  
  return diffInMs < 30000;
}
