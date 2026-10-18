'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type Group = { id: string; name: string; description: string | null; created_at: string };

export default function DeviceGroupsPanel({ canManage }: { canManage: boolean }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/organization/device-groups', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Device groups are unavailable.');
      setGroups(result.groups as Group[]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Device groups are unavailable.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const createGroup = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch('/api/organization/device-groups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The device group could not be created.');
      setName(''); setDescription(''); setNotice(`Created ${result.group.name}.`); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The device group could not be created.'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-lg border border-[#e4e9f0] bg-white p-5">
    <h2 className="text-sm font-semibold text-[#172033]">Device groups</h2>
    <p className="mt-1 text-sm leading-6 text-[#758198]">Use groups to assign device visibility to workspace members.</p>
    {error && <p role="alert" className="mt-3 text-sm text-[#a43138]">{error}</p>}
    {notice && <p role="status" className="mt-3 text-sm text-[#176947]">{notice}</p>}
    {canManage && <form onSubmit={createGroup} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <label className="sr-only" htmlFor="device-group-name">Group name</label><input id="device-group-name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Finance workstations" className="h-9 rounded-md border border-[#d8e0ea] px-3 text-sm" />
      <label className="sr-only" htmlFor="device-group-description">Description</label><input id="device-group-description" maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional description" className="h-9 rounded-md border border-[#d8e0ea] px-3 text-sm" />
      <button type="submit" disabled={busy} className="h-9 rounded-md bg-[#315fe8] px-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Creating…' : 'Create group'}</button>
    </form>}
    <ul className="mt-4 divide-y divide-[#edf0f4]">{groups.map((group) => <li key={group.id} className="py-3"><p className="text-sm font-medium text-[#29344a]">{group.name}</p><p className="mt-0.5 text-xs text-[#758198]">{group.description || 'No description'}</p></li>)}{groups.length === 0 && <li className="py-4 text-sm text-[#758198]">No device groups yet.</li>}</ul>
  </section>;
}
