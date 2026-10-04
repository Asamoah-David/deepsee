'use client';

import { useState } from 'react';

export default function MonitoringPage() {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Monitoring & Telemetry</h1>
          <p className="text-sm text-text-secondary mt-1">
            Real-time and historical fleet CPU, RAM, Disk, Network and Uptime performance telemetry.
          </p>
        </div>
        <div className="flex gap-2 bg-surface p-1 rounded border border-border">
          {(['24h', '7d', '30d'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 text-xs rounded uppercase font-mono ${
                timeframe === t ? 'bg-accent text-white font-medium' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Fleet CPU Utilization (%)</h2>
            <span className="font-mono text-xs text-accent">Avg: 22.4%</span>
          </div>
          <div className="h-48 bg-surface-2 rounded border border-border flex items-end p-4 gap-2">
            {[18, 24, 30, 45, 22, 19, 15, 28, 35, 60, 40, 25, 20, 18, 22, 24].map((v, i) => (
              <div key={i} className="flex-1 bg-accent/80 hover:bg-accent rounded-t transition-all" style={{ height: `${v}%` }} />
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Fleet Memory Usage (%)</h2>
            <span className="font-mono text-xs text-status-warning">Avg: 64.2%</span>
          </div>
          <div className="h-48 bg-surface-2 rounded border border-border flex items-end p-4 gap-2">
            {[60, 62, 65, 68, 70, 66, 64, 63, 65, 72, 75, 68, 64, 62, 64, 65].map((v, i) => (
              <div key={i} className="flex-1 bg-status-warning/80 hover:bg-status-warning rounded-t transition-all" style={{ height: `${v}%` }} />
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Storage Capacity Distribution</h2>
            <span className="font-mono text-xs text-text-muted">Total Fleet Storage: 142 TB</span>
          </div>
          <div className="space-y-4 pt-4">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span>Healthy (&lt;80% used)</span>
                <span>118 Devices</span>
              </div>
              <div className="h-2 bg-surface-3 rounded overflow-hidden">
                <div className="h-full bg-status-online w-[83%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span>Warning (80%-90% used)</span>
                <span>19 Devices</span>
              </div>
              <div className="h-2 bg-surface-3 rounded overflow-hidden">
                <div className="h-full bg-status-warning w-[13%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span>Critical (&gt;90% used)</span>
                <span>5 Devices</span>
              </div>
              <div className="h-2 bg-surface-3 rounded overflow-hidden">
                <div className="h-full bg-status-critical w-[4%]" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Network Bandwidth Telemetry</h2>
            <span className="font-mono text-xs text-text-muted">In / Out Throughput</span>
          </div>
          <div className="h-48 bg-surface-2 rounded border border-border flex items-center justify-center p-4">
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-accent">14.2 Mbps</div>
              <div className="text-xs text-text-secondary mt-1">Inbound Download aggregate</div>
              <div className="text-xl font-mono font-bold text-text-primary mt-3">3.8 Mbps</div>
              <div className="text-xs text-text-secondary mt-1">Outbound Upload aggregate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
