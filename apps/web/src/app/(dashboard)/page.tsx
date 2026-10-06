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
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Fleet Overview</h1>
        <div className="text-xs font-mono text-slate-400">Last updated: Just now</div>
      </div>

      {/* Row 1: Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Devices', value: stats.totalDevices.toString(), dot: null },
          { label: 'Online', value: stats.online.toString(), dot: 'dot-online' },
          { label: 'Offline', value: stats.offline.toString(), dot: 'dot-offline' },
          { label: 'Warning', value: stats.warning.toString(), dot: 'dot-warning' },
          { label: 'Critical', value: stats.critical.toString(), dot: 'dot-critical' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-center">
            <div className="text-3xl font-mono font-bold text-white mb-1">{stat.value}</div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
              {stat.dot && <span className={`dot ${stat.dot}`} />}
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Secondary Metric Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          `Active Sessions: ${stats.activeSessions}`,
          `Open Incidents: ${stats.openIncidents}`,
          `Unresolved Alerts: ${stats.unresolvedAlerts}`,
          `Pending Commands: 0`
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-4 text-xs font-mono text-slate-300 text-center font-medium shadow-sm">
            {stat}
          </div>
        ))}
      </div>

      {/* Row 3: Alerts & Health Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col h-[320px]">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-slate-200">Recent Alerts</h2>
            <button className="text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors uppercase">View All</button>
          </div>
          <div className="flex-1 overflow-auto pt-4 space-y-3">
            {alertsList.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-12 font-mono">No unresolved system alerts</div>
            ) : (
              alertsList.map((alert, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-slate-800/60 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`dot ${alert.severity === 'critical' ? 'dot-critical' : 'dot-warning'}`} />
                    <span className="font-mono text-white font-medium">{alert.devices?.name || 'Unknown'}</span>
                    <span className="text-slate-300 font-sans">{alert.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col h-[320px]">
          <div className="pb-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-slate-200">Fleet Health Distribution</h2>
          </div>
          <div className="flex-1 p-4 flex flex-col justify-center space-y-6">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-emerald-400 flex items-center gap-2"><span className="dot dot-online" /> Online</span>
                <span className="text-white font-bold">{stats.online}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: stats.totalDevices > 0 ? `${(stats.online / stats.totalDevices) * 100}%` : '0%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-amber-400 flex items-center gap-2"><span className="dot dot-warning" /> Warning</span>
                <span className="text-white font-bold">{stats.warning}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: stats.totalDevices > 0 ? `${(stats.warning / stats.totalDevices) * 100}%` : '0%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-red-400 flex items-center gap-2"><span className="dot dot-critical" /> Critical</span>
                <span className="text-white font-bold">{stats.critical}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: stats.totalDevices > 0 ? `${(stats.critical / stats.totalDevices) * 100}%` : '0%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Device Directory Summary Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="pb-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-200">Recently Active Endpoints</h2>
        </div>
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs font-mono text-left">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Device</th>
                <th className="px-4 py-3 font-semibold">Operating System</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {devicesList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-sans">
                    No devices enrolled yet
                  </td>
                </tr>
              ) : (
                devicesList.map((device, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`dot ${device.status === 'online' ? 'dot-online' : 'dot-offline'}`} />
                        <span className="font-bold text-white">{device.name || device.hostname || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{device.os_version || 'Windows 11'}</td>
                    <td className="px-4 py-3">
                      <span className={`uppercase font-bold ${device.status === 'online' ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {device.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
