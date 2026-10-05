'use client';

import { useState } from 'react';
import Link from 'next/link';

interface WallDevice {
  id: string;
  name: string;
  os: string;
  status: 'online' | 'offline' | 'warning' | 'critical';
  cpu: number;
  ram: number;
  group: string;
}

export default function LiveWallPage() {
  const [selectedGroup, setSelectedGroup] = useState('All');

  const wallDevices: WallDevice[] = [
    { id: 'pc-001', name: 'PC-017 (Lab A)', os: 'Win 11', status: 'online', cpu: 24, ram: 68, group: 'Computer Lab A' },
    { id: 'pc-002', name: 'Admin-PC-01', os: 'Win 11', status: 'online', cpu: 12, ram: 42, group: 'Administration' },
    { id: 'pc-003', name: 'POS-003', os: 'Win 10', status: 'warning', cpu: 82, ram: 85, group: 'Retail POS' },
    { id: 'pc-004', name: 'Exam-PC-04', os: 'Win 11', status: 'offline', cpu: 0, ram: 0, group: 'Computer Lab A' },
    { id: 'pc-005', name: 'IT-PC-01', os: 'Win 11', status: 'online', cpu: 32, ram: 55, group: 'IT Support' },
    { id: 'pc-006', name: 'Library-PC-02', os: 'Win 10', status: 'online', cpu: 15, ram: 40, group: 'Library' },
  ];

  const filtered = wallDevices.filter((d) => selectedGroup === 'All' || d.group === selectedGroup);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Fleet Wall</h1>
          <p className="text-sm text-text-secondary mt-1">
            Real-time live multi-device screen thumbnail grid for IT operations, computer labs, and monitoring rooms.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-surface-2 border border-border rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-accent text-text-primary"
          >
            <option value="All">All Device Groups</option>
            <option value="Computer Lab A">Computer Lab A</option>
            <option value="Administration">Administration</option>
            <option value="Retail POS">Retail POS</option>
            <option value="IT Support">IT Support</option>
            <option value="Library">Library</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1">
        {filtered.map((device) => (
          <div
            key={device.id}
            className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col group hover:border-accent transition-colors shadow-sm"
          >
            <div className="p-3 border-b border-border bg-surface-2 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`dot ${
                    device.status === 'online'
                      ? 'dot-online'
                      : device.status === 'warning'
                      ? 'dot-warning'
                      : 'dot-offline'
                  }`}
                />
                <span className="font-mono font-bold text-text-primary">{device.name}</span>
              </div>
              <span className="text-text-muted font-mono">{device.os}</span>
            </div>

            <div className="flex-1 bg-black flex items-center justify-center min-h-[160px] relative">
              {device.status === 'offline' ? (
                <span className="text-text-muted text-xs font-mono uppercase tracking-wider">OFFLINE</span>
              ) : (
                <div className="w-full h-full p-4 flex flex-col justify-between bg-surface-2/20 font-mono text-[10px] text-text-muted border border-border/20 m-2 rounded">
                  <div className="flex justify-between">
                    <span>{device.group}</span>
                    <span className="text-status-online">1080p 30fps</span>
                  </div>
                  <div className="text-center text-xs text-text-secondary">
                    Windows 11 Live Desktop Stream Active
                  </div>
                  <div className="flex justify-between">
                    <span>CPU: {device.cpu}%</span>
                    <span>RAM: {device.ram}%</span>
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                <Link
                  href={`/devices/${device.id}/screen`}
                  className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-xs font-mono font-medium uppercase tracking-wider shadow-lg"
                >
                  Remote Control
                </Link>
                <Link
                  href={`/devices/${device.id}`}
                  className="bg-surface-3 hover:bg-border text-text-primary px-3 py-1.5 rounded text-xs font-mono font-medium uppercase tracking-wider shadow-lg"
                >
                  Profile
                </Link>
              </div>
            </div>

            <div className="p-2 border-t border-border bg-surface-2 flex justify-between text-[10px] text-text-secondary font-mono">
              <span>Status: <span className="uppercase text-text-primary">{device.status}</span></span>
              <span>Group: {device.group}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
