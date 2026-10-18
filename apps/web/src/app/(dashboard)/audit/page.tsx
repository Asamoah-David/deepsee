'use client';

import { useCallback, useEffect, useState } from 'react';

type AuditEntry = { id: number; user_id: string | null; user_email: string | null; device_id: string | null; action: string; target_type: string | null; target_id: string | null; result: string | null; created_at: string };

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);

  const load = useCallback(async (cursor: string | null = null) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      if (cursor) params.set('before', cursor);
      const response = await fetch(`/api/organization/audit?${params}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Audit history is unavailable.');
      setEntries(result.entries ?? []); setBefore(result.entries?.length === 50 ? result.entries.at(-1)?.created_at ?? null : null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Audit history is unavailable.'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  const exportCsv = () => {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [['Timestamp', 'Actor', 'Action', 'Target', 'Result', 'Device ID'], ...entries.map((entry) => [entry.created_at, entry.user_email || entry.user_id || 'System', entry.action, [entry.target_type, entry.target_id].filter(Boolean).join(':'), entry.result, entry.device_id])];
    const blob = new Blob([rows.map((row) => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `deepsee-audit-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div className="mx-auto flex h-full max-w-[1200px] flex-col space-y-5">
    <header><p className="text-xs font-medium uppercase tracking-[.12em] text-[#758198]">Governance</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#172033]">Audit history</h1><p className="mt-1 text-sm text-[#758198]">Tenant-scoped records of membership, security, and device changes.</p></header>
    <section className="flex flex-col gap-3 rounded-lg border border-[#e4e9f0] bg-white p-4 sm:flex-row sm:items-center">
      <label className="sr-only" htmlFor="audit-search">Search audit history</label><input id="audit-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action, actor, or target" className="h-10 min-w-0 flex-1 rounded-md border border-[#d8e0ea] px-3 text-sm text-[#29344a] placeholder:text-[#9aa4b4] focus:border-[#315fe8] focus:outline-none focus:ring-2 focus:ring-blue-100" />
      <button type="button" onClick={exportCsv} disabled={!entries.length || loading} className="h-10 rounded-md border border-[#d8e0ea] px-3 text-sm font-medium text-[#29344a] hover:bg-[#f8fafc] disabled:opacity-50">Export visible records</button>
    </section>
    {error && <div role="alert" className="rounded-md border border-[#f0c9cb] bg-[#fff5f5] px-4 py-3 text-sm text-[#a43138]">{error}</div>}
    <section className="flex-1 overflow-hidden rounded-lg border border-[#e4e9f0] bg-white">
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f8fafc] text-[10px] font-semibold uppercase tracking-[.1em] text-[#758198]"><tr><th className="px-5 py-3">Timestamp</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Target</th><th className="px-5 py-3">Result</th></tr></thead><tbody className="divide-y divide-[#edf0f4]">
        {loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#758198]">Loading audit history…</td></tr> : entries.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#758198]">No audit records match this search.</td></tr> : entries.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap px-5 py-3.5 text-xs tabular-nums text-[#758198]">{new Date(entry.created_at).toLocaleString()}</td><td className="px-4 py-3.5 text-[#526078]">{entry.user_email || 'System'}</td><td className="px-4 py-3.5 font-medium text-[#29344a]">{entry.action}</td><td className="max-w-[260px] truncate px-4 py-3.5 font-mono text-xs text-[#526078]" title={[entry.target_type, entry.target_id].filter(Boolean).join(':')}>{[entry.target_type, entry.target_id].filter(Boolean).join(':') || '—'}</td><td className="px-5 py-3.5 text-xs capitalize text-[#526078]">{entry.result || 'recorded'}</td></tr>)}
      </tbody></table></div>
    </section>
    <div className="flex items-center justify-between"><p className="text-xs text-[#758198]">Showing up to 50 records at a time.</p><button type="button" disabled={!before || loading} onClick={() => void load(before)} className="h-9 rounded-md border border-[#d8e0ea] px-3 text-xs font-semibold text-[#29344a] disabled:opacity-50">Load older records</button></div>
  </div>;
}
