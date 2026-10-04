export default function IncidentsPage() {
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
        <button className="bg-accent text-white px-4 py-2 rounded text-sm font-medium">Create Incident</button>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-5 flex items-center justify-between hover:border-accent/50 transition-colors cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <span className={`dot ${i === 1 ? 'dot-critical' : 'dot-warning'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">
                  {i === 1 ? 'Network connectivity dropping in Branch Office B' : 'Windows Update KB5034441 Failing repeatedly'}
                </h3>
                <div className="flex gap-4 text-sm text-text-secondary">
                  <span className="font-mono">INC-{1042 + i}</span>
                  <span>Opened {i * 2} days ago</span>
                  <span>Affected devices: <span className="font-mono">{i * 5 + 3}</span></span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="bg-surface-3 px-2 py-1 rounded text-xs font-medium uppercase tracking-wider text-text-primary">Investigating</div>
              <div className="text-xs text-text-muted">Assigned to: admin@acme.com</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
