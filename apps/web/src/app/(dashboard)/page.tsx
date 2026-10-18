import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

interface RecentAlert {
  id: string; severity: string; title: string; created_at: string;
  devices?: { name?: string } | null;
}
interface RecentDevice {
  id: string; name?: string; hostname?: string; status?: string; os_version?: string; last_seen?: string;
}

const metrics = [
  { key: 'totalDevices', label: 'Total devices', tone: 'neutral' },
  { key: 'online', label: 'Online', tone: 'green' },
  { key: 'offline', label: 'Offline', tone: 'slate' },
  { key: 'warning', label: 'Needs attention', tone: 'amber' },
  { key: 'critical', label: 'Critical', tone: 'red' },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const [totalResult, statusesResult, sessionsResult, incidentsResult, alertsCountResult, devicesResult, alertsResult] = await Promise.all([
    supabase.from('devices').select('*', { count: 'exact', head: true }),
    supabase.from('devices').select('status'),
    supabase.from('remote_sessions').select('*', { count: 'exact', head: true }).is('ended_at', null),
    supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('resolved', false),
    supabase.from('devices').select('id, name, hostname, status, os_version, last_seen').order('last_seen', { ascending: false }).limit(8),
    supabase.from('alerts').select('id, severity, title, created_at, devices(name)').eq('resolved', false).order('created_at', { ascending: false }).limit(5),
  ]);
  const statusCounts = { online: 0, offline: 0, warning: 0, critical: 0 };
  for (const row of statusesResult.data ?? []) {
    const status = row.status as keyof typeof statusCounts;
    if (status in statusCounts) statusCounts[status] += 1;
  }
  const stats = {
    totalDevices: totalResult.count ?? 0,
    ...statusCounts,
    activeSessions: sessionsResult.count ?? 0,
    openIncidents: incidentsResult.count ?? 0,
    unresolvedAlerts: alertsCountResult.count ?? 0,
  };
  const hasLoadError = [totalResult, statusesResult, sessionsResult, incidentsResult, alertsCountResult, devicesResult, alertsResult].some((result) => result.error);
  const devices = (devicesResult.data ?? []) as RecentDevice[];
  const alerts = (alertsResult.data ?? []) as unknown as RecentAlert[];
  const healthRows = [
    { label: 'Online', value: stats.online, dot: 'dot-online', bar: 'bg-[#1d9a70]' },
    { label: 'Offline', value: stats.offline, dot: 'dot-offline', bar: 'bg-[#aab4c2]' },
    { label: 'Needs attention', value: stats.warning, dot: 'dot-warning', bar: 'bg-[#d58a22]' },
    { label: 'Critical', value: stats.critical, dot: 'dot-critical', bar: 'bg-[#d14c52]' },
  ];
  const summary = [
    { label: 'Active sessions', value: stats.activeSessions, href: '/remote-sessions' },
    { label: 'Open incidents', value: stats.openIncidents, href: '/incidents' },
    { label: 'Unresolved alerts', value: stats.unresolvedAlerts, href: '/alerts' },
  ];

  return <div className="mx-auto max-w-[1440px] space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-medium uppercase tracking-[.12em] text-[#758198]">Fleet operations</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#172033]">Overview</h2>
        <p className="mt-1 text-sm text-[#758198]">A current view of the devices and activity in your workspace.</p>
      </div>
      <div className="flex gap-2">
        <Link href="/devices" className="inline-flex h-10 items-center rounded-md border border-[#d8e0ea] bg-white px-4 text-sm font-medium text-[#29344a] shadow-sm transition hover:bg-[#f8fafc]">View devices</Link>
        <Link href="/enrollment" className="inline-flex h-10 items-center rounded-md bg-[#315fe8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#254fc9]">Enroll a device</Link>
      </div>
    </div>

    {hasLoadError && <div role="status" className="rounded-md border border-[#f1d8ad] bg-[#fff9ed] px-4 py-3 text-sm text-[#80520e]">Some fleet data could not be loaded. Values may be incomplete.</div>}

    <section aria-label="Device counts" className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {metrics.map((metric) => <div key={metric.key} className="rounded-lg border border-[#e4e9f0] bg-white p-4 shadow-[0_1px_2px_rgba(20,32,55,.03)] sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#526078]">{metric.label}</span>
          {metric.key !== 'totalDevices' && <span className={`dot dot-${metric.key === 'warning' ? 'warning' : metric.key}`} aria-hidden="true" />}
        </div>
        <div className={`mt-3 text-[30px] font-semibold leading-none tracking-tight ${metric.tone === 'green' ? 'text-[#15805d]' : metric.tone === 'amber' ? 'text-[#ad6b12]' : metric.tone === 'red' ? 'text-[#bd3c43]' : 'text-[#172033]'}`}>{stats[metric.key].toLocaleString()}</div>
      </div>)}
    </section>

    <section aria-label="Workspace activity" className="grid gap-3 md:grid-cols-3">
      {summary.map((item) => <Link key={item.label} href={item.href} className="group flex items-center justify-between rounded-lg border border-[#e4e9f0] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(20,32,55,.03)] transition hover:border-[#cbd6e7]">
        <span className="text-sm font-medium text-[#526078] group-hover:text-[#315fe8]">{item.label}</span><span className="text-xl font-semibold tabular-nums text-[#172033]">{item.value}</span>
      </Link>)}
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
      <section className="overflow-hidden rounded-lg border border-[#e4e9f0] bg-white shadow-[0_1px_2px_rgba(20,32,55,.03)]">
        <div className="flex items-center justify-between border-b border-[#edf0f4] px-5 py-4">
          <div><h3 className="text-sm font-semibold text-[#172033]">Recently seen devices</h3><p className="mt-0.5 text-xs text-[#758198]">Latest device activity recorded by the control plane</p></div>
          <Link href="/devices" className="text-xs font-semibold text-[#315fe8] hover:text-[#254fc9]">All devices <span aria-hidden="true">→</span></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-sm">
            <thead className="bg-[#f8fafc] text-[10px] font-semibold uppercase tracking-[.1em] text-[#758198]"><tr><th scope="col" className="px-5 py-3">Device</th><th scope="col" className="px-4 py-3">Operating system</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-5 py-3 text-right">Last seen</th></tr></thead>
            <tbody className="divide-y divide-[#edf0f4]">
              {devices.length === 0 ? <tr><td colSpan={4} className="px-5 py-12 text-center"><p className="text-sm font-medium text-[#29344a]">No devices yet</p><p className="mt-1 text-xs text-[#758198]">Enroll a Windows device to see its status here.</p></td></tr> : devices.map((device) => <tr key={device.id} className="transition-colors hover:bg-[#fafbfd]">
                <td className="px-5 py-3.5"><Link href={`/devices/${device.id}`} className="flex items-center gap-2.5 font-medium text-[#29344a] hover:text-[#315fe8]"><span className={`dot dot-${device.status === 'online' ? 'online' : device.status === 'warning' ? 'warning' : device.status === 'critical' ? 'critical' : 'offline'}`} />{device.name || device.hostname || 'Unnamed device'}</Link></td>
                <td className="px-4 py-3.5 text-[13px] text-[#526078]">{device.os_version || '—'}</td>
                <td className="px-4 py-3.5"><span className="text-xs capitalize text-[#526078]">{device.status || 'Unknown'}</span></td>
                <td className="px-5 py-3.5 text-right text-xs tabular-nums text-[#758198]">{device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-5">
        <section className="rounded-lg border border-[#e4e9f0] bg-white p-5 shadow-[0_1px_2px_rgba(20,32,55,.03)]">
          <div className="mb-5"><h3 className="text-sm font-semibold text-[#172033]">Device status</h3><p className="mt-0.5 text-xs text-[#758198]">Distribution across enrolled devices</p></div>
          <div className="space-y-4">{healthRows.map((row) => <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-[#526078]"><span className={`dot ${row.dot}`} />{row.label}</span><span className="font-semibold tabular-nums text-[#29344a]">{row.value}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#edf0f4]"><div className={`h-full rounded-full ${row.bar}`} style={{ width: `${stats.totalDevices > 0 ? Math.min(100, (row.value / stats.totalDevices) * 100) : 0}%` }} /></div>
          </div>)}</div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#e4e9f0] bg-white shadow-[0_1px_2px_rgba(20,32,55,.03)]">
          <div className="flex items-center justify-between border-b border-[#edf0f4] px-5 py-4"><div><h3 className="text-sm font-semibold text-[#172033]">Open alerts</h3><p className="mt-0.5 text-xs text-[#758198]">Unresolved events requiring review</p></div><Link href="/alerts" className="text-xs font-semibold text-[#315fe8] hover:text-[#254fc9]">View all</Link></div>
          <div className="divide-y divide-[#edf0f4]">
            {alerts.length === 0 ? <p className="px-5 py-8 text-center text-xs text-[#758198]">No unresolved alerts.</p> : alerts.map((alert) => <div key={alert.id} className="flex gap-3 px-5 py-3.5">
              <span className={`mt-1.5 dot ${alert.severity === 'critical' ? 'dot-critical' : alert.severity === 'warning' ? 'dot-warning' : 'dot-offline'}`} />
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-[#29344a]">{alert.title}</p><p className="mt-0.5 truncate text-xs text-[#758198]">{alert.devices?.name || 'Device'} · {new Date(alert.created_at).toLocaleString()}</p></div>
            </div>)}</div>
        </section>
      </div>
    </div>
  </div>;
}
