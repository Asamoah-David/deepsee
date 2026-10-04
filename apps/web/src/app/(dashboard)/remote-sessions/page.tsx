'use client';

import { useState } from 'react';

interface Session {
  id: string;
  deviceName: string;
  adminName: string;
  mode: 'view_only' | 'control' | 'support' | 'admin';
  startedAt: string;
  duration: string;
  status: 'active' | 'completed';
  recordingAvailable: boolean;
}

export default function RemoteSessionsPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [search, setSearch] = useState('');

  const sessions: Session[] = [
    {
      id: 'sess-101',
      deviceName: 'PC-017 (Lab A)',
      adminName: 'john.doe@company.com',
      mode: 'control',
      startedAt: '10 minutes ago',
      duration: '10m 24s',
      status: 'active',
      recordingAvailable: false,
    },
    {
      id: 'sess-100',
      deviceName: 'Admin-PC-01',
      adminName: 'sarah.tech@company.com',
      mode: 'support',
      startedAt: '45 minutes ago',
      duration: '32m 10s',
      status: 'completed',
      recordingAvailable: true,
    },
    {
      id: 'sess-099',
      deviceName: 'POS-Terminal-03',
      adminName: 'alex.support@company.com',
      mode: 'view_only',
      startedAt: '2 hours ago',
      duration: '15m 02s',
      status: 'completed',
      recordingAvailable: true,
    },
  ];

  const filtered = sessions.filter((s) => {
    if (filter === 'active' && s.status !== 'active') return false;
    if (filter === 'completed' && s.status !== 'completed') return false;
    if (search && !s.deviceName.toLowerCase().includes(search.toLowerCase()) && !s.adminName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Remote Sessions</h1>
          <p className="text-sm text-text-secondary mt-1">
            Real-time and historic remote desktop control, screen mirroring, and diagnostic sessions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold">1</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Active Sessions</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold">24</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Sessions Today</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold">18m</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Avg Duration</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold text-accent">100%</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Audit Log Coverage</div>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-surface p-3 rounded-lg border border-border">
        <input
          type="text"
          placeholder="Search by device or administrator..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-sm capitalize ${
                filter === f ? 'bg-surface-3 text-text-primary font-medium' : 'text-text-secondary hover:bg-surface-3'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-2 text-text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 font-medium">Session ID</th>
              <th className="px-6 py-3 font-medium">Device</th>
              <th className="px-6 py-3 font-medium">Administrator</th>
              <th className="px-6 py-3 font-medium">Mode</th>
              <th className="px-6 py-3 font-medium">Started</th>
              <th className="px-6 py-3 font-medium">Duration</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-surface-2/50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs">{s.id}</td>
                <td className="px-6 py-4 font-mono font-medium text-text-primary">{s.deviceName}</td>
                <td className="px-6 py-4 text-text-secondary">{s.adminName}</td>
                <td className="px-6 py-4">
                  <span className="uppercase text-xs font-mono bg-surface-3 px-2 py-0.5 rounded border border-border">
                    {s.mode}
                  </span>
                </td>
                <td className="px-6 py-4 text-text-secondary text-xs">{s.startedAt}</td>
                <td className="px-6 py-4 font-mono text-xs">{s.duration}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`dot ${s.status === 'active' ? 'dot-online' : 'dot-offline'}`} />
                    <span className="capitalize text-xs font-medium">{s.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {s.status === 'active' ? (
                    <button className="text-accent hover:underline text-xs font-medium uppercase tracking-wider">
                      Join Session
                    </button>
                  ) : s.recordingAvailable ? (
                    <button className="text-text-secondary hover:text-text-primary text-xs font-medium uppercase tracking-wider">
                      View Recording
                    </button>
                  ) : (
                    <span className="text-xs text-text-muted">Logged</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
