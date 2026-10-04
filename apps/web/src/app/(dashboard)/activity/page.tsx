'use client';

import { useState } from 'react';

interface EventItem {
  id: string;
  time: string;
  device: string;
  type: string;
  description: string;
  actor: string;
}

export default function ActivityPage() {
  const [filter, setFilter] = useState('');

  const events: EventItem[] = [
    {
      id: 'evt-100',
      time: '08:41 AM',
      device: 'PC-017 (Lab A)',
      type: 'STATUS_CHANGE',
      description: 'Device connected and became ONLINE',
      actor: 'System Agent',
    },
    {
      id: 'evt-101',
      time: '08:44 AM',
      device: 'PC-017 (Lab A)',
      type: 'USER_SESSION',
      description: 'User interactive login detected (Domain\\Student01)',
      actor: 'Windows OS',
    },
    {
      id: 'evt-102',
      time: '09:10 AM',
      device: 'PC-017 (Lab A)',
      type: 'SERVICE_CHANGE',
      description: 'Service PrintSpooler restarted via automated workflow',
      actor: 'Automation Engine',
    },
    {
      id: 'evt-103',
      time: '09:25 AM',
      device: 'PC-017 (Lab A)',
      type: 'REMOTE_SESSION',
      description: 'Administrator sarah.tech initiated Remote Control session',
      actor: 'sarah.tech@company.com',
    },
  ];

  const filtered = events.filter(e =>
    !filter || e.device.toLowerCase().includes(filter.toLowerCase()) || e.description.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Universal Activity Timeline</h1>
          <p className="text-sm text-text-secondary mt-1">
            Chronological device event timeline, administrative actions, and &quot;What Changed?&quot; state diff engine.
          </p>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-surface p-3 rounded-lg border border-border">
        <input
          type="text"
          placeholder="Filter by device, event description, or actor..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Recent Event Log</h2>
          <span className="text-xs font-mono text-text-muted">Showing {filtered.length} Events</span>
        </div>

        <div className="divide-y divide-border">
          {filtered.map((e) => (
            <div key={e.id} className="p-4 hover:bg-surface-2/50 transition-colors flex items-start justify-between text-sm">
              <div className="flex items-start gap-4">
                <div className="font-mono text-xs text-text-muted mt-0.5">{e.time}</div>
                <div>
                  <div className="font-mono font-medium text-text-primary">{e.device}</div>
                  <div className="text-text-secondary mt-1">{e.description}</div>
                  <div className="text-xs text-text-muted font-mono mt-1">Actor: {e.actor}</div>
                </div>
              </div>
              <span className="font-mono text-xs bg-surface-3 px-2 py-1 rounded text-text-secondary">
                {e.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
