'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Device {
  id: string;
  name: string;
  hostname: string;
  status: string;
  os_version: string;
  last_seen: string;
  metadata: {
    cpu?: number;
    ram?: number;
    storage?: number;
  };
  group_ids: string[];
  department: string | null;
  revoked_at: string | null;
}
type DeviceGroup = { id: string; name: string };

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [canManageOrg, setCanManageOrg] = useState(false);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [busyDevice, setBusyDevice] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.append('status', statusFilter.toLowerCase());
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/devices?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch devices');

      const data = await response.json();
      setDevices(data.devices || []);
      setTotal(data.total || 0);
      setCanManageOrg(Boolean(data.canManageOrg));
      const groupResponse = await fetch('/api/organization/device-groups', { cache: 'no-store' });
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroups(groupData.groups || []);
      }
    } catch (err) {
      console.error('Fetch devices error:', err);
      setError('We could not load the device directory. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  const updatePlacement = async (device: Device, form: HTMLFormElement) => {
    const values = new FormData(form);
    setBusyDevice(device.id); setOperationMessage(null); setError(null);
    try {
      const response = await fetch(`/api/devices/${device.id}/placement`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: String(values.get('department') || '').trim() || null, groupIds: values.getAll('groupId').map(String) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Device placement could not be saved.');
      setOperationMessage(`Access groups updated for ${device.name}.`);
      await fetchDevices();
    } catch (err) { setError(err instanceof Error ? err.message : 'Device placement could not be saved.'); }
    finally { setBusyDevice(null); }
  };

  const revokeDevice = async (device: Device) => {
    if (!window.confirm(`Revoke ${device.name || device.hostname || 'this device'}? It will be blocked from heartbeats and new remote sessions.`)) return;
    setBusyDevice(device.id); setOperationMessage(null); setError(null);
    try {
      const response = await fetch(`/api/devices/${device.id}/revoke`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Device revocation failed.');
      setOperationMessage(`Revoked ${device.name || device.hostname}.`);
      await fetchDevices();
    } catch (err) { setError(err instanceof Error ? err.message : 'Device revocation failed.'); }
    finally { setBusyDevice(null); }
  };

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'online': return 'dot-online';
      case 'offline': return 'dot-offline';
      case 'warning': return 'dot-warning';
      case 'critical': return 'dot-critical';
      default: return 'dot-offline';
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[.12em] text-[#758198]">Inventory</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#172033]">Devices</h2>
          <p className="mt-1 text-sm text-[#758198]">Review connection status and recent activity across enrolled devices.</p>
        </div>
        <Link
          href="/enrollment"
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#315fe8] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#254fc9]"
        >
          Enroll a device
        </Link>
      </div>

      {error && <div role="alert" className="flex items-center justify-between gap-4 rounded-md border border-[#f0c9cb] bg-[#fff5f5] px-4 py-3 text-sm text-[#a43138]">{error}<button type="button" onClick={fetchDevices} className="shrink-0 font-semibold underline">Retry</button></div>}
      {operationMessage && <div role="status" className="rounded-md border border-[#bfe5d4] bg-[#f1fbf6] px-4 py-3 text-sm text-[#176947]">{operationMessage}</div>}

      <div className="flex flex-col gap-3 rounded-lg border border-[#e4e9f0] bg-white p-4 shadow-[0_1px_2px_rgba(20,32,55,.03)] lg:flex-row lg:items-center">
        <input
          type="text"
          aria-label="Search devices"
          placeholder="Search by device name or hostname"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-md border border-[#d8e0ea] bg-white px-3.5 text-sm text-[#172033] placeholder:text-[#9aa4b4] focus:border-[#315fe8] focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <div role="group" aria-label="Filter devices by status" className="flex flex-wrap gap-1.5">
          {['All', 'Online', 'Offline', 'Warning', 'Critical'].map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={statusFilter === f}
              onClick={() => setStatusFilter(f)}
              className={`min-h-9 rounded-md px-3 text-xs font-medium transition-colors ${
                statusFilter === f
                  ? 'border border-[#cdd9ff] bg-[#edf2ff] text-[#315fe8]'
                  : 'border border-transparent text-[#526078] hover:bg-[#f1f4f8]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e4e9f0] bg-white shadow-[0_1px_2px_rgba(20,32,55,.03)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm whitespace-nowrap">
            <thead className="border-b border-[#edf0f4] bg-[#f8fafc] text-[10px] font-semibold uppercase tracking-[.1em] text-[#758198]">
              <tr>
                <th scope="col" className="px-5 py-3">Device</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">OS version</th>
                <th scope="col" className="px-4 py-3">CPU</th>
                <th scope="col" className="px-4 py-3">Memory</th>
                <th scope="col" className="px-4 py-3">Storage</th>
                <th scope="col" className="px-4 py-3">Last seen</th>
                <th scope="col" className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-[#758198]" aria-live="polite">
                    Loading devices…
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-[#29344a]">{total === 0 ? 'No devices enrolled yet' : 'No matching devices'}</p>
                    <p className="mt-1 text-xs text-[#758198]">{total === 0 ? 'Enroll a Windows device to see its status here.' : 'Try a different search or status filter.'}</p>
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device.id} className="border-b border-[#edf0f4] transition-colors last:border-0 hover:bg-[#fafbfd]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`dot ${getStatusDot(device.status)}`} />
                        <span className="font-medium text-[#29344a]">{device.name || device.hostname || 'Unnamed device'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs capitalize text-[#526078]">{device.status || 'Unknown'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#526078]">{device.os_version || '—'}</td>
                    <td className="px-4 py-3.5 text-[13px] tabular-nums text-[#526078]">{device.metadata?.cpu != null ? `${device.metadata.cpu}%` : '—'}</td>
                    <td className="px-4 py-3.5 text-[13px] tabular-nums text-[#526078]">{device.metadata?.ram != null ? `${device.metadata.ram}%` : '—'}</td>
                    <td className="px-4 py-3.5 text-[13px] tabular-nums text-[#526078]">{device.metadata?.storage != null ? `${device.metadata.storage}%` : '—'}</td>
                    <td className="px-4 py-3.5 text-xs text-[#758198]">{formatDate(device.last_seen)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3 text-xs font-semibold">
                        <Link
                          href={`/devices/${device.id}`}
                          className="text-[#315fe8] hover:text-[#254fc9]"
                        >
                          Profile
                        </Link>
                        <Link
                          href={device.revoked_at ? `/devices/${device.id}` : `/devices/${device.id}/screen`}
                          className="rounded border border-[#d8e0ea] bg-white px-2.5 py-1.5 text-[#526078] hover:bg-[#f8fafc]"
                        >
                          {device.revoked_at ? 'Revoked' : 'View screen'}
                        </Link>
                        {canManageOrg && !device.revoked_at && <button type="button" onClick={() => void revokeDevice(device)} disabled={busyDevice === device.id} className="rounded border border-[#e8c4c6] px-2.5 py-1.5 text-[#a43138] hover:bg-[#fff5f5] disabled:opacity-50">Revoke</button>}
                      </div>
                      {canManageOrg && !device.revoked_at && <details className="mt-2 text-left">
                        <summary className="cursor-pointer text-[11px] font-semibold text-[#315fe8]">Assign department / groups</summary>
                        <form onSubmit={(event) => { event.preventDefault(); void updatePlacement(device, event.currentTarget); }} className="mt-2 w-[260px] space-y-2 rounded-md border border-[#e4e9f0] bg-white p-3 shadow-sm">
                          <label className="block text-[11px] font-medium text-[#526078]">Department<input name="department" maxLength={100} defaultValue={device.department || ''} placeholder="Unassigned" className="mt-1 h-8 w-full rounded border border-[#d8e0ea] px-2 text-xs font-normal" /></label>
                          <fieldset><legend className="mb-1 text-[11px] font-medium text-[#526078]">Device groups</legend>{groups.length === 0 ? <p className="text-[11px] text-[#758198]">Create a group under Organization.</p> : <div className="max-h-24 space-y-1 overflow-y-auto">{groups.map((group) => <label key={group.id} className="flex items-center gap-2 text-[11px] text-[#29344a]"><input type="checkbox" name="groupId" value={group.id} defaultChecked={device.group_ids?.includes(group.id)} />{group.name}</label>)}</div>}</fieldset>
                          <button type="submit" disabled={busyDevice === device.id} className="h-8 rounded bg-[#315fe8] px-2.5 text-xs font-semibold text-white disabled:opacity-50">{busyDevice === device.id ? 'Saving…' : 'Save placement'}</button>
                        </form>
                      </details>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#edf0f4] bg-[#f8fafc] px-5 py-3 text-xs text-[#758198]">
          <div>Showing {devices.length} of {total} devices</div>
        </div>
      </div>
    </div>
  );
}
