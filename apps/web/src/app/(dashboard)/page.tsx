import { createClient } from '@/lib/supabase/server';

interface RecentAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  created_at: string;
  devices?: {
    name?: string;
  } | null;
}

interface RecentDevice {
  id: string;
  name?: string;
  hostname?: string;
  status?: string;
  os_version?: string;
  last_seen?: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { count: totalDevices } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true });

  const { data: devicesByStatus } = await supabase
    .from('devices')
    .select('status');

  const statusCounts = {
    online: 0,
    offline: 0,
    warning: 0,
    critical: 0,
  };

  if (devicesByStatus) {
    for (const d of devicesByStatus) {
      const s = d.status as keyof typeof statusCounts;
      if (s in statusCounts) {
        statusCounts[s]++;
      }
    }
  }

  const { count: activeSessions } = await supabase
    .from('remote_sessions')
    .select('*', { count: 'exact', head: true })
    .is('ended_at', null);

  const { count: openIncidents } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');

  const { count: unresolvedAlerts } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('resolved', false);

  const { data: recentDevices } = await supabase
    .from('devices')
    .select('id, name, hostname, status, os_version, metadata, last_seen')
    .order('last_seen', { ascending: false })
    .limit(10);

  const { data: recentAlerts } = await supabase
    .from('alerts')
    .select('id, type, severity, title, detail, created_at, devices(name)')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(10);

  const stats = {
    totalDevices: totalDevices || 0,
    online: statusCounts.online || 0,
    offline: statusCounts.offline || 0,
    warning: statusCounts.warning || 0,
    critical: statusCounts.critical || 0,
    activeSessions: activeSessions || 0,
    openIncidents: openIncidents || 0,
    unresolvedAlerts: unresolvedAlerts || 0,
  };

  const devicesList = (recentDevices || []) as RecentDevice[];
  const alertsList = (recentAlerts || []) as unknown as RecentAlert[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Fleet Overview</h1>
        <div className="text-sm text-text-secondary">Last updated: Just now</div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Devices', value: stats.totalDevices.toString(), dot: null },
          { label: 'Online', value: stats.online.toString(), dot: 'dot-online' },
          { label: 'Offline', value: stats.offline.toString(), dot: 'dot-offline' },
          { label: 'Warning', value: stats.warning.toString(), dot: 'dot-warning' },
          { label: 'Critical', value: stats.critical.toString(), dot: 'dot-critical' },
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

      <div className="grid grid-cols-4 gap-4">
        {[
          `Active Sessions: ${stats.activeSessions}`,
          `Open Incidents: ${stats.openIncidents}`,
          `Unresolved Alerts: ${stats.unresolvedAlerts}`,
          `Pending Commands: 0`
        ].map((stat, i) => (
          <div key={i} className="bg-surface-2 rounded py-2 px-4 text-sm font-medium text-text-secondary text-center border border-border">
            {stat}
          </div>
        ))}
      </div>

      <div className="flex gap-6 h-[300px]">
        <div className="w-[60%] bg-surface border border-border rounded-lg flex flex-col">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Recent Alerts</h2>
            <button className="text-xs text-accent hover:underline">View All</button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {alertsList.length === 0 ? (
              <div className="text-sm text-text-secondary text-center py-8">No unresolved alerts</div>
            ) : (
              alertsList.map((alert, i) => (
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

        <div className="w-[40%] bg-surface border border-border rounded-lg flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Fleet Health</h2>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-center space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-status-online flex items-center gap-2"><span className="dot dot-online" /> Online</span>
                <span className="font-mono">{stats.online}</span>
              </div>
              <div className="h-2 bg-surface-3 rounded overflow-hidden">
                <div
                  className="h-full bg-status-online"
                  style={{ width: stats.totalDevices > 0 ? `${(stats.online / stats.totalDevices) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-status-warning flex items-center gap-2"><span className="dot dot-warning" /> Warning</span>
                <span className="font-mono">{stats.warning}</span>
              </div>
              <div className="h-2 bg-surface-3 rounded overflow-hidden">
                <div
                  className="h-full bg-status-warning"
                  style={{ width: stats.totalDevices > 0 ? `${(stats.warning / stats.totalDevices) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-status-critical flex items-center gap-2"><span className="dot dot-critical" /> Critical</span>
                <span className="font-mono">{stats.critical}</span>
              </div>
              <div className="h-2 bg-surface-3 rounded overflow-hidden">
                <div
                  className="h-full bg-status-critical"
                  style={{ width: stats.totalDevices > 0 ? `${(stats.critical / stats.totalDevices) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 h-[400px]">
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
                {devicesList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                      No devices enrolled yet
                    </td>
                  </tr>
                ) : (
                  devicesList.map((device, i) => (
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

        <div className="w-[40%] bg-surface border border-border rounded-lg flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Active Sessions</h2>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            {stats.activeSessions === 0 ? (
              <div className="text-sm text-text-secondary text-center py-8">No active remote sessions</div>
            ) : (
              <div className="text-sm text-text-secondary text-center py-8">
                {stats.activeSessions} active session(s)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
