'use client';

import { useState } from 'react';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const exportReport = (format: 'csv' | 'json' | 'pdf', type: string) => {
    setDownloading(`${type}-${format}`);
    setTimeout(() => {
      setDownloading(null);
      alert(`Exported ${type} as ${format.toUpperCase()} successfully.`);
    }, 600);
  };

  const reportTypes = [
    { id: 'inventory', name: 'Device Hardware & OS Inventory', desc: 'Complete fleet asset list with serial numbers, OS build, CPU/RAM specs.' },
    { id: 'health', name: 'Fleet Health & Diagnostics Summary', desc: 'Health state scores, storage issues, patch compliance and stopped services.' },
    { id: 'software', name: 'Installed Software & Compliance', desc: 'All installed applications, version distribution, and unapproved software.' },
    { id: 'audit', name: 'Administrative Action Audit Log', desc: 'Complete record of remote sessions, command executions, and setting edits.' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Reports & Data Export</h1>
          <p className="text-sm text-text-secondary mt-1">
            Export structured fleet inventory, diagnostic health, software compliance, and audit logs to CSV, JSON, or PDF.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {reportTypes.map((r) => (
          <div key={r.id} className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between space-y-4">
            <div>
              <h2 className="font-bold text-base text-text-primary">{r.name}</h2>
              <p className="text-xs text-text-secondary mt-1">{r.desc}</p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              {(['csv', 'json', 'pdf'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => exportReport(fmt, r.id)}
                  disabled={downloading === `${r.id}-${fmt}`}
                  className="flex-1 bg-surface-2 hover:bg-surface-3 text-text-primary py-1.5 rounded text-xs font-mono uppercase font-medium border border-border transition-colors disabled:opacity-50"
                >
                  {downloading === `${r.id}-${fmt}` ? 'Exporting...' : `Export ${fmt.toUpperCase()}`}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
