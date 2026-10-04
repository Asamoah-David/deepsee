export default function AuditPage() {
  return (
    <div className="flex flex-col h-full space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
      
      <div className="flex gap-4 items-center bg-surface p-3 rounded-lg border border-border">
        <input 
          type="text" 
          placeholder="Search logs..." 
          className="w-[300px] bg-surface-2 border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
        />
        <button className="bg-surface-3 text-text-primary px-3 py-1.5 rounded text-sm hover:bg-border transition-colors">
          Export CSV
        </button>
      </div>
      
      <div className="flex-1 bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-2 text-text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Timestamp</th>
              <th className="px-6 py-4 font-medium">Admin</th>
              <th className="px-6 py-4 font-medium">Action</th>
              <th className="px-6 py-4 font-medium">Target</th>
              <th className="px-6 py-4 font-medium">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <tr key={i} className="hover:bg-surface-2/50 transition-colors">
                <td className="px-6 py-4 font-mono text-text-muted">2026-10-02 14:{30 - i}:00</td>
                <td className="px-6 py-4 text-text-secondary">admin@acme.com</td>
                <td className="px-6 py-4 text-text-primary">
                  {i % 3 === 0 ? 'Device Reboot Command' : i % 2 === 0 ? 'Remote Session Started' : 'Settings Updated'}
                </td>
                <td className="px-6 py-4 font-mono text-text-secondary">
                  {i % 3 === 0 || i % 2 === 0 ? `PC-0${10 + i}` : 'Organization'}
                </td>
                <td className="px-6 py-4 font-mono text-text-muted">192.168.1.100</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
