'use client';

interface Deployment {
  id: string;
  packageName: string;
  version: string;
  targetScope: string;
  stagingProgress: string;
  successful: number;
  failed: number;
  pending: number;
  status: 'deploying' | 'completed' | 'paused';
}

export default function DeploymentsPage() {
  const deployments: Deployment[] = [
    {
      id: 'dep-101',
      packageName: 'DeepSee Agent Upgrade',
      version: 'v1.4.2',
      targetScope: 'All Enrolled Devices (142)',
      stagingProgress: 'Staging 2 (10% → 50%)',
      successful: 120,
      failed: 2,
      pending: 20,
      status: 'deploying',
    },
    {
      id: 'dep-100',
      packageName: 'Enterprise VPN Client',
      version: 'v5.2.1',
      targetScope: 'Department: Remote Workers',
      stagingProgress: 'Stage 4 (100%)',
      successful: 45,
      failed: 0,
      pending: 0,
      status: 'completed',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Software Deployments & Rollouts</h1>
          <p className="text-sm text-text-secondary mt-1">
            Safe staged rollout deployment engine (1% → 10% → 50% → 100%), automated verification and pause/rollback controls.
          </p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors">
          New Deployment Campaign
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold text-accent">1</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Active Rollouts</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold text-status-online">165</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Successful Installs</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold text-status-critical">2</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Failed Installs</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg">
          <div className="text-2xl font-mono font-bold text-status-warning">20</div>
          <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Pending Devices</div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Deployment Campaigns</h2>
        </div>

        <div className="divide-y divide-border">
          {deployments.map((d) => (
            <div key={d.id} className="p-5 hover:bg-surface-2/50 transition-colors space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-text-muted">{d.id}</span>
                    <span className="font-bold text-text-primary text-base">{d.packageName}</span>
                    <span className="font-mono text-xs bg-surface-3 px-2 py-0.5 rounded border border-border">{d.version}</span>
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Target: {d.targetScope} • Stage: <span className="text-accent font-medium">{d.stagingProgress}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {d.status === 'deploying' && (
                    <button className="bg-status-warning/10 text-status-warning border border-status-warning/30 hover:bg-status-warning/20 px-3 py-1 rounded text-xs font-mono uppercase">
                      Pause Rollout
                    </button>
                  )}
                  <button className="bg-surface-3 hover:bg-border text-text-primary px-3 py-1 rounded text-xs font-mono uppercase">
                    View Details
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs font-mono pt-2 border-t border-border/50">
                <div className="bg-surface-2 p-2 rounded border border-border">
                  <span className="text-status-online">Successful: {d.successful}</span>
                </div>
                <div className="bg-surface-2 p-2 rounded border border-border">
                  <span className="text-status-critical">Failed: {d.failed}</span>
                </div>
                <div className="bg-surface-2 p-2 rounded border border-border">
                  <span className="text-text-muted">Pending: {d.pending}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
