'use client';

import { useState } from 'react';

interface AppItem {
  id: string;
  name: string;
  publisher: string;
  version: string;
  installedCount: number;
  status: 'approved' | 'unapproved' | 'required';
}

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<'all' | 'approved' | 'unapproved' | 'required'>('all');

  const apps: AppItem[] = [
    {
      id: 'app-1',
      name: 'Google Chrome',
      publisher: 'Google LLC',
      version: '121.0.6167.160',
      installedCount: 142,
      status: 'approved',
    },
    {
      id: 'app-2',
      name: 'DeepSee Agent',
      publisher: 'DeepSee Corp',
      version: '1.4.0',
      installedCount: 142,
      status: 'required',
    },
    {
      id: 'app-3',
      name: 'BitTorrent Client',
      publisher: 'BitTorrent Inc',
      version: '7.10.5',
      installedCount: 3,
      status: 'unapproved',
    },
    {
      id: 'app-4',
      name: 'Microsoft Visual Studio Code',
      publisher: 'Microsoft Corporation',
      version: '1.86.0',
      installedCount: 88,
      status: 'approved',
    },
  ];

  const filtered = apps.filter(a => filter === 'all' || a.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Software & Applications</h1>
          <p className="text-sm text-text-secondary mt-1">
            Global fleet application inventory, approved software enforcement, and unauthorized software detection.
          </p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors">
          Deploy Package
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold">184</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Unique Applications</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold text-status-online">142</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Fully Compliant PCs</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold text-status-warning">3</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Unapproved Apps</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold text-status-critical">2</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Missing Required Apps</div>
        </div>
      </div>

      <div className="flex gap-2 bg-surface p-3 rounded-lg border border-border">
        {(['all', 'approved', 'required', 'unapproved'] as const).map((f) => (
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

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-2 text-text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 font-medium">Application Name</th>
              <th className="px-6 py-3 font-medium">Publisher</th>
              <th className="px-6 py-3 font-medium">Version</th>
              <th className="px-6 py-3 font-medium">Installed Devices</th>
              <th className="px-6 py-3 font-medium">Compliance Policy</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-surface-2/50 transition-colors">
                <td className="px-6 py-4 font-mono font-medium text-text-primary">{a.name}</td>
                <td className="px-6 py-4 text-text-secondary">{a.publisher}</td>
                <td className="px-6 py-4 font-mono text-xs">{a.version}</td>
                <td className="px-6 py-4 font-mono text-xs">{a.installedCount} PCs</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${
                    a.status === 'required' ? 'bg-accent/10 text-accent' :
                    a.status === 'approved' ? 'bg-status-online/10 text-status-online' : 'bg-status-critical/10 text-status-critical'
                  }`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-accent hover:underline text-xs font-medium uppercase tracking-wider mr-3">
                    Deploy
                  </button>
                  {a.status === 'unapproved' && (
                    <button className="text-status-critical hover:underline text-xs font-medium uppercase tracking-wider">
                      Uninstall Fleetwide
                    </button>
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
