'use client';

import { useState } from 'react';

interface FileTransfer {
  id: string;
  sourceDevice: string;
  targetDevice: string;
  filename: string;
  size: string;
  progress: number;
  status: 'transferring' | 'completed' | 'queued' | 'failed';
}

export default function FilesPage() {
  const [selectedTab, setSelectedTab] = useState<'transfers' | 'sync' | 'p2p'>('transfers');

  const transfers: FileTransfer[] = [
    {
      id: 'ft-001',
      sourceDevice: 'Command Center',
      targetDevice: 'PC-017 (Lab A)',
      filename: 'DiagnosticTool_v2.4.exe',
      size: '48.5 MB',
      progress: 74,
      status: 'transferring',
    },
    {
      id: 'ft-002',
      sourceDevice: 'PC-101',
      targetDevice: 'PC-102',
      filename: 'Lab_Data_20250210.zip',
      size: '1.2 GB',
      progress: 100,
      status: 'completed',
    },
    {
      id: 'ft-003',
      sourceDevice: 'Command Center',
      targetDevice: 'Fleet (14 Devices)',
      filename: 'SecurityPolicy_Update.msi',
      size: '12.8 MB',
      progress: 0,
      status: 'queued',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Files & Transfer Manager</h1>
          <p className="text-sm text-text-secondary mt-1">
            Remote file management, encrypted P2P device transfers, folder synchronization, and chunked downloads.
          </p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors">
          New File Transfer
        </button>
      </div>

      <div className="flex border-b border-border">
        {(['transfers', 'sync', 'p2p'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${
              selectedTab === tab ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'transfers' ? 'Active & Queued Transfers' : tab === 'sync' ? 'Folder Sync Jobs' : 'P2P Direct Links'}
          </button>
        ))}
      </div>

      {selectedTab === 'transfers' && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">File Transfer Queue</h2>
            <span className="text-xs text-text-muted font-mono">{transfers.length} Active Jobs</span>
          </div>

          <table className="w-full text-sm text-left">
            <thead className="bg-surface-2 text-text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 font-medium">Job ID</th>
                <th className="px-6 py-3 font-medium">Filename</th>
                <th className="px-6 py-3 font-medium">Source → Target</th>
                <th className="px-6 py-3 font-medium">Size</th>
                <th className="px-6 py-3 font-medium">Progress</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-surface-2/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{t.id}</td>
                  <td className="px-6 py-4 font-mono font-medium text-text-primary">{t.filename}</td>
                  <td className="px-6 py-4 text-text-secondary text-xs">
                    {t.sourceDevice} → {t.targetDevice}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{t.size}</td>
                  <td className="px-6 py-4">
                    <div className="w-32">
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span>{t.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-3 rounded overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${t.progress}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize text-xs">
                    <span className={`px-2 py-0.5 rounded font-mono ${
                      t.status === 'completed' ? 'bg-status-online/10 text-status-online' :
                      t.status === 'transferring' ? 'bg-accent/10 text-accent' : 'bg-surface-3 text-text-secondary'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-status-critical hover:underline text-xs font-medium uppercase tracking-wider">
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTab === 'sync' && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-semibold">Configured Folder Sync Jobs</h2>
              <p className="text-sm text-text-secondary">Keep directories automatically synchronized across managed Windows computers.</p>
            </div>
            <button className="bg-surface-3 hover:bg-border text-text-primary px-3 py-1.5 rounded text-sm font-medium">
              Create Sync Rule
            </button>
          </div>
          <div className="space-y-3">
            <div className="bg-surface-2 p-4 rounded border border-border flex justify-between items-center">
              <div>
                <div className="font-mono text-sm font-medium">PC-001/Documents/Company ↔ PC-002/Documents/Company</div>
                <div className="text-xs text-text-muted mt-1">Two-Way • Sync on change • Version History Enabled</div>
              </div>
              <span className="text-xs bg-status-online/10 text-status-online px-2 py-1 rounded font-mono">ACTIVE</span>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'p2p' && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Peer-to-Peer Encryption Channels</h2>
          <p className="text-sm text-text-secondary">
            Direct peer-to-peer transfers bypass control plane relays whenever possible using WebRTC/TLS direct sockets.
          </p>
          <div className="bg-surface-2 p-4 rounded border border-border text-sm text-text-secondary">
            P2P transport active for 2 connected nodes. Relay fallback ready on port 8080.
          </div>
        </div>
      )}
    </div>
  );
}
