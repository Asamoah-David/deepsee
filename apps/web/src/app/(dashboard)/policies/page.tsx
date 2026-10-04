'use client';

interface Policy {
  id: string;
  name: string;
  description: string;
  appliedScope: string;
  monitoringLevel: 'Minimal' | 'Standard' | 'Advanced' | 'Custom';
  remoteControl: boolean;
  fileTransfer: boolean;
}

export default function PoliciesPage() {
  const policies: Policy[] = [
    {
      id: 'pol-001',
      name: 'Default Corporate Policy',
      description: 'Standard security rules, hourly telemetry, restricted terminal access.',
      appliedScope: 'Entire Organization (Default)',
      monitoringLevel: 'Standard',
      remoteControl: true,
      fileTransfer: true,
    },
    {
      id: 'pol-002',
      name: 'High-Security Lab Policy',
      description: 'Kiosk enforcement, disabled USB storage, advanced activity telemetry.',
      appliedScope: 'Group: Computer Lab A',
      monitoringLevel: 'Advanced',
      remoteControl: true,
      fileTransfer: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Policies</h1>
          <p className="text-sm text-text-secondary mt-1">
            Global and group-level monitoring policies, capability restrictions, maintenance schedules, and retention rules.
          </p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors">
          Create Policy
        </button>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Enforced Policies</h2>
        </div>

        <div className="divide-y divide-border">
          {policies.map((p) => (
            <div key={p.id} className="p-5 hover:bg-surface-2/50 transition-colors space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-text-muted">{p.id}</span>
                    <span className="font-bold text-text-primary text-base">{p.name}</span>
                    <span className="font-mono text-xs bg-accent/10 text-accent px-2 py-0.5 rounded border border-accent/20">
                      {p.monitoringLevel} Monitoring
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">{p.description}</p>
                </div>
                <button className="bg-surface-3 hover:bg-border text-text-primary px-3 py-1 rounded text-xs font-mono uppercase">
                  Edit Policy
                </button>
              </div>

              <div className="flex gap-6 text-xs font-mono pt-2 border-t border-border/50 text-text-secondary">
                <div>Scope: <span className="text-text-primary">{p.appliedScope}</span></div>
                <div>Remote Control: <span className={p.remoteControl ? 'text-status-online' : 'text-status-critical'}>{p.remoteControl ? 'ENABLED' : 'DISABLED'}</span></div>
                <div>File Transfer: <span className={p.fileTransfer ? 'text-status-online' : 'text-status-critical'}>{p.fileTransfer ? 'ENABLED' : 'DISABLED'}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
