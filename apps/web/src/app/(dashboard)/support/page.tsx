'use client';

import { useState } from 'react';

interface Ticket {
  id: string;
  title: string;
  device: string;
  reporter: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

export default function SupportPage() {
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

  const tickets: Ticket[] = [
    {
      id: 'TCK-2048',
      title: 'Accounting software fails to launch after Windows update',
      device: 'PC-017 (Lab A)',
      reporter: 'john.student@school.edu',
      assignee: 'Technician A',
      priority: 'high',
      status: 'open',
      createdAt: '25m ago',
    },
    {
      id: 'TCK-2047',
      title: 'Receipt printer spooler hanging in POS terminal',
      device: 'POS-003',
      reporter: 'store.manager@company.com',
      assignee: 'Help Desk B',
      priority: 'urgent',
      status: 'in_progress',
      createdAt: '1h 10m ago',
    },
    {
      id: 'TCK-2046',
      title: 'Request temporary USB access for data migration',
      device: 'Admin-PC-02',
      reporter: 'alice.admin@company.com',
      assignee: 'Unassigned',
      priority: 'medium',
      status: 'open',
      createdAt: '3h 40m ago',
    },
  ];

  const filtered = tickets.filter(t => filter === 'all' || t.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IT Support & Incident Ticketing</h1>
          <p className="text-sm text-text-secondary mt-1">
            End-user support requests, technician assignment, diagnostic attachments, and resolution tracking.
          </p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors">
          Create Support Ticket
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold text-status-warning">3</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Open Tickets</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold text-accent">1</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">In Progress</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold text-status-online">18m</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Avg Resolution Time</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold text-status-online">98%</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">First-Contact Resolution</div>
        </div>
      </div>

      <div className="flex gap-2 bg-surface p-3 rounded-lg border border-border">
        {(['all', 'open', 'in_progress', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-sm capitalize ${
              filter === f ? 'bg-surface-3 text-text-primary font-medium' : 'text-text-secondary hover:bg-surface-3'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-2 text-text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 font-medium">Ticket ID</th>
              <th className="px-6 py-3 font-medium">Issue Title</th>
              <th className="px-6 py-3 font-medium">Device</th>
              <th className="px-6 py-3 font-medium">Reporter</th>
              <th className="px-6 py-3 font-medium">Assignee</th>
              <th className="px-6 py-3 font-medium">Priority</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-surface-2/50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs">{t.id}</td>
                <td className="px-6 py-4 font-medium text-text-primary">{t.title}</td>
                <td className="px-6 py-4 font-mono text-xs text-text-secondary">{t.device}</td>
                <td className="px-6 py-4 text-text-secondary text-xs">{t.reporter}</td>
                <td className="px-6 py-4 text-text-secondary text-xs">{t.assignee}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${
                    t.priority === 'urgent' ? 'bg-status-critical/10 text-status-critical font-bold' :
                    t.priority === 'high' ? 'bg-status-warning/10 text-status-warning' : 'bg-surface-3 text-text-secondary'
                  }`}>
                    {t.priority}
                  </span>
                </td>
                <td className="px-6 py-4 capitalize text-xs">
                  <span className="font-mono">{t.status.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-accent hover:underline text-xs font-medium uppercase tracking-wider mr-3">
                    Start Session
                  </button>
                  <button className="text-text-secondary hover:text-text-primary text-xs font-medium uppercase tracking-wider">
                    Resolve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
