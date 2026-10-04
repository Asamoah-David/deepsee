'use client';

import { useState } from 'react';

export default function DiagnosticsPage() {
  const [running, setLoading] = useState(false);
  const [report, setReport] = useState<boolean>(false);

  const runFleetDiagnostics = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setReport(true);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Diagnostics & Health Packages</h1>
          <p className="text-sm text-text-secondary mt-1">
            Structured automated health diagnostics across CPU, RAM, Disk, Services, Network, Drivers and Windows Updates.
          </p>
        </div>
        <button
          onClick={runFleetDiagnostics}
          disabled={running}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          {running ? 'Running Diagnostic Checks...' : 'Run Fleetwide Diagnostics'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-lg p-5">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary mb-4">
              Diagnostic Categories
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'CPU & Process Diagnostics', status: 'Healthy', details: 'No thermal throttling or runaway processes detected.' },
                { title: 'Memory Allocation Check', status: 'Healthy', details: 'RAM available within normal operating margins.' },
                { title: 'Disk Integrity & Storage', status: 'Warning', details: '5 machines reporting < 10% free space.' },
                { title: 'Windows Services Check', status: 'Healthy', details: 'Print Spooler and critical system services running.' },
                { title: 'Network Connectivity & DNS', status: 'Healthy', details: 'Latency < 12ms to relay server.' },
                { title: 'Windows Security & Patch State', status: 'Warning', details: '12 devices missing KB5034123 cumulative update.' },
              ].map((item, i) => (
                <div key={i} className="bg-surface-2 p-4 rounded border border-border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-text-primary">{item.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                      item.status === 'Healthy' ? 'bg-status-online/10 text-status-online' : 'bg-status-warning/10 text-status-warning'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">{item.details}</p>
                </div>
              ))}
            </div>
          </div>

          {report && (
            <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">
                  Latest Diagnostics Report
                </h2>
                <span className="text-xs font-mono text-text-muted">Generated just now</span>
              </div>
              <div className="font-mono text-xs text-text-secondary space-y-1 bg-surface-2 p-4 rounded border border-border">
                <div>[INFO] Scanning 142 enrolled Windows endpoints...</div>
                <div>[OK] All devices authenticating with valid cryptographic keys.</div>
                <div>[WARN] PC-017: Storage at 97% capacity (38 GB temporary files detected).</div>
                <div>[WARN] PC-089: Windows Update service stopped.</div>
                <div>[OK] Diagnostic package compiled cleanly. Health state: WARNING.</div>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-surface border border-border rounded-lg p-5">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary mb-4">
              Device Health Scorecard
            </h2>
            <div className="space-y-4">
              <div className="bg-surface-2 p-4 rounded border border-border text-center">
                <div className="text-4xl font-mono font-bold text-status-warning">78 / 100</div>
                <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Fleet Health Index</div>
              </div>
              <div className="text-xs text-text-muted space-y-2">
                <div>• Storage warning on 5 devices (-10)</div>
                <div>• Missing Windows updates (-12)</div>
                <div>• 142 total enrolled devices evaluated</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
