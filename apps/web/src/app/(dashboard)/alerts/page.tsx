export default function AlertsPage() {
  return (
    <div className="flex flex-col h-full space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Active Alerts</h1>
      
      <div className="flex gap-4 items-center bg-surface p-3 rounded-lg border border-border">
        <div className="flex gap-2">
          {['All', 'Critical', 'Warning', 'Resolved'].map((f, i) => (
            <button key={f} className={`px-3 py-1.5 rounded text-sm ${i === 0 ? 'bg-surface-3 text-text-primary' : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-2 text-text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Severity</th>
              <th className="px-6 py-4 font-medium">Device</th>
              <th className="px-6 py-4 font-medium">Alert</th>
              <th className="px-6 py-4 font-medium">Time</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <tr key={i} className="hover:bg-surface-2/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`dot ${i < 3 ? 'dot-critical' : 'dot-warning'}`} />
                    <span className="text-text-secondary">{i < 3 ? 'Critical' : 'Warning'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono font-medium">WIN-DEV-{100 + i}</td>
                <td className="px-6 py-4 text-text-secondary">
                  {i < 3 ? 'Disk usage exceeded 95%' : 'CPU usage > 90% for 10m'}
                </td>
                <td className="px-6 py-4 text-text-muted font-mono">{i * 12}m ago</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-accent hover:text-accent-hover text-xs uppercase tracking-wider font-medium mr-4">View</button>
                  <button className="text-text-primary hover:text-white text-xs uppercase tracking-wider font-medium">Resolve</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
