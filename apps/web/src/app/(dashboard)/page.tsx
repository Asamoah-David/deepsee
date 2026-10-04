import { Suspense } from 'react';

async function DashboardStats() {
  const response = await fetch('/api/dashboard/stats', {
    cache: 'no-store',
  });

  if (!response.ok) {
    return <div className="text-text-secondary">Failed to load dashboard data</div>;
  }

  const data = await response.json();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Fleet Overview</h1>
        <div className="text-sm text-text-secondary">Last updated: Just now</div>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Devices', value: data.stats.totalDevices.toString(), dot: null },
          { label: 'Online', value: data.stats.online.toString(), dot: 'dot-online' },
          { label: 'Offline', value: data.stats.offline.toString(), dot: 'dot-offline' },
          { label: 'Warning', value: data.stats.warning.toString(), dot: 'dot-warning' },
          { label: 'Critical', value: data.stats.critical.toString(), dot: 'dot-critical' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-4 flex flex-col justify-center">
            <div className="text-3xl font-mono font-medium text-text-primary mb-1">{stat.value}</div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              {stat.dot && <span className={`dot ${stat.dot}`} />}
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Secondary Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          `Active Sessions: ${data.stats.activeSessions}`,
          `Open Incidents: ${data.stats.openIncidents}`,
          `Open Tickets: 0`,
          `Pending Commands: 0`
        ].map((stat, i) => (
          <div key={i} className="bg-surface-2 rounded py-2 px-4 text-sm font-medium text-text-secondary text-center border border-border">
            {stat}
          </div>
        ))}
      </div>

      {/* Row 3 */}
      <div className="flex gap-6 h-[300px]">
        {/* Left: Alerts */}
        <div className="w-[60%] bg-surface border border-border rounded-lg flex flex-col">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Recent Alerts</h2>
            <button className="text-xs text-accent hover:underline">View All</button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {data.recentAlerts.length === 0 ? (
              <div className="text-sm text-text-secondary text-center py-8">No unresolved alerts</div>
            ) : (
              data.recentAlerts.map((alert: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`dot ${alert.severity === 'critical' ? 'dot-critical' : 'dot-warning'}`} />
                    <span className="font-mono text-text-primary">{alert.devices?.name || 'Unknown'}</span>
                    <span className="text-text-secondary">{alert.title}</span>
                  </div>
                  <span className="text-xs text-text-muted font-mono">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Health */}
        <div className="w-[40%] bg-surface border border-border rounded-lg flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Fleet Health</h2>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-center space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-status-online flex items-center gap-2"><span className="dot dot-online" /> Online</span>
                <span className="font-mono">{data.stats.online}</span>
              </div>
              <div className="h-2 bg-surface-3 rounded overflow-hidden">
                <div
                  className="h-full bg-status-online"
                  style={{ width: data.stats.totalDevices > 0 ? `${(data.stats.online / data.stats.totalDevices) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-status-warning flex items-center gap-2"><span className="dot dot-warning" /> Warning</span>
                <span className="font-mono">{data.stats.warning}</span>
              </div>
              <div className="h-2 bg-surface-3 rounded overflow-hidden">
                <div
                  className="h-full bg-status-warning"
                  style={{ width: data.stats.totalDevices > 0 ? `${(data.stats.warning / data.stats.totalDevices) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-status-critical flex items-center gap-2"><span className="dot dot-critical" /> Critical</span>
                <span className="font-mono">{data.stats.critical}</span>
              </div>
              <div className="h-2 bg-surface-3 rounded overflow-hidden">
                <div
                  className="h-full bg-status-critical"
                  style={{ width: data.stats.totalDevices > 0 ? `${(data.stats.critical / data.stats.totalDevices) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4 */}
      <div className="flex gap-6 h-[400px]">
        {/* Left: Active Devices */}
        <div className="w-[60%] bg-surface border border-border rounded-lg flex flex-col">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Recently Active Devices</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-2 text-text-muted sticky top-0 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">OS</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentDevices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                      No devices enrolled yet
                    </td>
                  </tr>
                ) : (
                  data.recentDevices.map((device: any, i: number) => (
                    <tr key={i} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`dot ${device.status === 'online' ? 'dot-online' : 'dot-offline'}`} />
                          <span className="font-mono font-medium text-text-primary">{device.name || device.hostname || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{device.os_version || 'Unknown'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-${device.status === 'online' ? 'status-online' : 'text-text-secondary'}`}>
                          {device.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted">
                        {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Active Sessions */}
        <div className="w-[40%] bg-surface border border-border rounded-lg flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Active Sessions</h2>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            {data.stats.activeSessions === 0 ? (
              <div className="text-sm text-text-secondary text-center py-8">No active remote sessions</div>
            ) : (
              <div className="text-sm text-text-secondary text-center py-8">
                {data.stats.activeSessions} active session(s)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-text-secondary">Loading...</div>}>
      <DashboardStats />
    </Suspense>
  );
}
