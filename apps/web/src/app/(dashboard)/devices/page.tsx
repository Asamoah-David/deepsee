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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Device Directory</h1>
          <p className="text-sm text-slate-400 mt-1">
            Enrolled persistent Windows computers across your organization network.
          </p>
        </div>
        <Link
          href="/enrollment"
          className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          Add Device
        </Link>
      </div>

      <div className="flex gap-4 items-center bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
        <input
          type="text"
          placeholder="Filter by name, IP address, tag, or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3.5 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500"
        />
        <div className="flex gap-1.5 font-mono text-xs">
          {['All', 'Online', 'Offline', 'Warning', 'Critical'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === f
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left whitespace-nowrap">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Device Name</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">OS Version</th>
                <th className="px-6 py-4 font-semibold">CPU</th>
                <th className="px-6 py-4 font-semibold">RAM</th>
                <th className="px-6 py-4 font-semibold">Storage</th>
                <th className="px-6 py-4 font-semibold">Last Seen</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 font-sans">
                    Loading endpoint directory...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 font-sans">
                    No devices found. {total === 0 ? 'Enroll your first device to get started.' : ''}
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`dot ${getStatusDot(device.status)}`} />
                        <span className="font-bold text-white">{device.name || device.hostname}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-300 capitalize font-bold">{device.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{device.os_version || 'Windows 11'}</td>
                    <td className="px-6 py-4 font-mono text-slate-300">{device.metadata?.cpu ? `${device.metadata.cpu}%` : '-'}</td>
                    <td className="px-6 py-4 font-mono text-slate-300">{device.metadata?.ram ? `${device.metadata.ram}%` : '-'}</td>
                    <td className="px-6 py-4 font-mono text-slate-300">{device.metadata?.storage ? `${device.metadata.storage}%` : '-'}</td>
                    <td className="px-6 py-4 text-slate-500 text-[11px]">{formatDate(device.last_seen)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3 font-mono text-xs">
                        <Link
                          href={`/devices/${device.id}`}
                          className="text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider"
                        >
                          Profile
                        </Link>
                        <Link
                          href={`/devices/${device.id}/screen`}
                          className="text-white hover:text-slate-200 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded border border-slate-700 font-bold uppercase tracking-wider"
                        >
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
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500 mt-auto bg-slate-950/40">
          <div>Showing {devices.length} of {total} entries</div>
        </div>
      </div>
    </div>
  );
}
