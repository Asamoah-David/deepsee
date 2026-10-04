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
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.append('status', statusFilter.toLowerCase());
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/devices?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch devices');

      const data = await response.json();
      setDevices(data.devices || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Fetch devices error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

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
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
        <Link
          href="/enrollment"
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          Add Device
        </Link>
      </div>

      <div className="flex gap-4 items-center bg-surface p-3 rounded-lg border border-border">
        <input
          type="text"
          placeholder="Search by name, IP, or tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          {['All', 'Online', 'Offline', 'Warning', 'Critical'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded text-sm ${statusFilter === f ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-surface-2 text-text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Device Name</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">OS</th>
                <th className="px-6 py-4 font-medium">CPU</th>
                <th className="px-6 py-4 font-medium">RAM</th>
                <th className="px-6 py-4 font-medium">Storage</th>
                <th className="px-6 py-4 font-medium">Last Seen</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-text-secondary">
                    Loading devices...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-text-secondary">
                    No devices found. {total === 0 ? 'Enroll your first device to get started.' : ''}
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device.id} className="hover:bg-surface-2/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`dot ${getStatusDot(device.status)}`} />
                        <span className="font-mono font-medium text-text-primary">{device.name || device.hostname}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-text-secondary capitalize">{device.status}</span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">{device.os_version || 'Unknown'}</td>
                    <td className="px-6 py-4 font-mono">{device.metadata?.cpu ? `${device.metadata.cpu}%` : '-'}</td>
                    <td className="px-6 py-4 font-mono">{device.metadata?.ram ? `${device.metadata.ram}%` : '-'}</td>
                    <td className="px-6 py-4 font-mono">{device.metadata?.storage ? `${device.metadata.storage}%` : '-'}</td>
                    <td className="px-6 py-4 text-text-muted text-xs">{formatDate(device.last_seen)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/devices/${device.id}`} className="text-accent hover:text-accent-hover text-xs uppercase tracking-wider font-medium">
                          View
                        </Link>
                        <Link href={`/devices/${device.id}/screen`} className="text-text-primary hover:text-white text-xs uppercase tracking-wider font-medium">
                          Control
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-text-secondary mt-auto bg-surface-2/30">
          <div>Showing {devices.length} of {total} entries</div>
        </div>
      </div>
    </div>
  );
}
