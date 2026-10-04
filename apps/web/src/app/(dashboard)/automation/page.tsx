'use client';

import { useState } from 'react';

interface WorkflowRule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  enabled: boolean;
  executions: number;
}

export default function AutomationPage() {
  const [rules, setRules] = useState<WorkflowRule[]>([
    {
      id: 'wf-001',
      name: 'Auto-Clear Temporary Disk Space',
      trigger: 'WHEN Storage < 10 GB',
      condition: 'IF Temp Files > 2 GB',
      action: 'THEN Run Approved Cleanup & Recheck',
      enabled: true,
      executions: 142,
    },
    {
      id: 'wf-002',
      name: 'Print Spooler Recovery',
      trigger: 'WHEN Service PrintSpooler Stops',
      condition: 'IF Retries < 3',
      action: 'THEN Restart Service & Notify IT Manager',
      enabled: true,
      executions: 28,
    },
    {
      id: 'wf-003',
      name: 'App Crash Diagnostic Package',
      trigger: 'WHEN Application Crash Detected',
      condition: 'IF Crash Count > 2 in 5m',
      action: 'THEN Collect Diagnostic Logs & Create Incident',
      enabled: true,
      executions: 12,
    },
  ]);

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automation Engine & Workflows</h1>
          <p className="text-sm text-text-secondary mt-1">
            Trigger → Condition → Action → Verification rules, self-healing remediation, and Action Marketplace.
          </p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors">
          Create New Workflow
        </button>
      </div>

      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary mb-4">
          Action Marketplace Prebuilt Workflows
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { title: 'Fix Printing', desc: 'Checks spooler, clears queues, restarts service.' },
            { title: 'Clear Temp Files', desc: 'Safely removes cached temporary OS files.' },
            { title: 'Network Diagnostics', desc: 'Pings gateway, resets DNS cache, reports status.' },
            { title: 'Force Health Check', desc: 'Compiles full hardware and software status.' },
          ].map((item, i) => (
            <div key={i} className="bg-surface-2 p-4 rounded border border-border flex flex-col justify-between">
              <div>
                <div className="font-medium text-sm text-text-primary">{item.title}</div>
                <div className="text-xs text-text-secondary mt-1">{item.desc}</div>
              </div>
              <button className="mt-4 text-xs text-accent hover:underline font-medium text-left">
                Run On Fleet →
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Configured Workflows</h2>
          <span className="text-xs font-mono text-text-muted">{rules.length} Active Rules</span>
        </div>

        <div className="divide-y divide-border">
          {rules.map((r) => (
            <div key={r.id} className="p-4 hover:bg-surface-2/50 transition-colors flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-text-muted">{r.id}</span>
                  <span className="font-medium text-text-primary text-sm">{r.name}</span>
                </div>
                <div className="font-mono text-xs text-text-secondary">
                  <span className="text-accent">{r.trigger}</span> • <span>{r.condition}</span> • <span className="text-status-online">{r.action}</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-text-primary">{r.executions}</div>
                  <div className="text-[10px] uppercase text-text-muted">Executions</div>
                </div>
                <button
                  onClick={() => toggleRule(r.id)}
                  className={`px-3 py-1 rounded text-xs font-mono uppercase font-medium ${
                    r.enabled ? 'bg-status-online/10 text-status-online border border-status-online/30' : 'bg-surface-3 text-text-muted'
                  }`}
                >
                  {r.enabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
