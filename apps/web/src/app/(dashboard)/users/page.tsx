'use client';

import { useCallback, useEffect, useState } from 'react';

type Member = { user_id: string; email: string | null; role: string; department: string | null; created_at: string; is_self: boolean; can_manage: boolean; can_grant_admin: boolean };
type Invitation = { id: string; email: string; role: string; created_at: string; expires_at: string };
type DeviceGroup = { id: string; name: string };
type MemberScope = { department: string | null; device_group_scope: string[]; device_scope_limited: boolean };
const roles = ['admin', 'it_manager', 'technician', 'help_desk', 'auditor', 'viewer', 'member'] as const;

export default function UsersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<(typeof roles)[number]>('member');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [memberScopes, setMemberScopes] = useState<Record<string, MemberScope>>({});
  const [scopeBusy, setScopeBusy] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/organization/members', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Member list is unavailable.');
      setMembers(result.members as Member[]);
      setGroups(result.groups as DeviceGroup[]);
      const scopeMap: Record<string, MemberScope> = {};
      for (const scope of result.scopes as Array<MemberScope & { user_id: string }>) {
        scopeMap[scope.user_id] = { department: scope.department, device_group_scope: scope.device_group_scope || [], device_scope_limited: scope.device_scope_limited };
      }
      setMemberScopes(scopeMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Member list is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    try {
      const response = await fetch('/api/organization/invitations', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Invitations are unavailable.');
      setInvitations(result.invitations as Invitation[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitations are unavailable.');
    }
  }, []);

  useEffect(() => { void loadMembers(); void loadInvitations(); }, [loadMembers, loadInvitations]);

  const createInvitation = async (event: React.FormEvent) => {
    event.preventDefault(); setInviteBusy(true); setError(null); setNotice(null); setInviteUrl(null);
    try {
      const response = await fetch('/api/organization/invitations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The invitation could not be created.');
      setInviteEmail(''); setInviteUrl(result.inviteUrl as string);
      setNotice(`Invitation created for ${result.invitation.email}. Share the link before it expires in seven days.`);
      await loadInvitations();
    } catch (err) { setError(err instanceof Error ? err.message : 'The invitation could not be created.'); }
    finally { setInviteBusy(false); }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyNotice('Invitation link copied.');
    } catch { setCopyNotice('Clipboard access is unavailable. Select and copy the invitation link.'); }
  };

  const revokeInvitation = async (invitation: Invitation) => {
    if (!window.confirm(`Revoke the pending invitation for ${invitation.email}? Its link will stop working.`)) return;
    setError(null); setNotice(null);
    try {
      const response = await fetch('/api/organization/invitations', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: invitation.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The invitation could not be revoked.');
      setNotice(`Invitation revoked for ${invitation.email}.`);
      await loadInvitations();
    } catch (err) { setError(err instanceof Error ? err.message : 'The invitation could not be revoked.'); }
  };

  const updateRole = async (member: Member, role: string) => {
    setBusyId(member.user_id); setError(null); setNotice(null);
    try {
      const response = await fetch('/api/organization/members', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.user_id, role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The member role could not be updated.');
      setNotice(`Role updated for ${member.email || 'workspace member'}.`);
      await loadMembers();
    } catch (err) { setError(err instanceof Error ? err.message : 'The member role could not be updated.'); }
    finally { setBusyId(null); }
  };

  const saveScope = async (member: Member) => {
    const scope = memberScopes[member.user_id];
    if (!scope) return;
    setScopeBusy(member.user_id); setError(null); setNotice(null);
    try {
      const response = await fetch('/api/organization/members/scopes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.user_id, department: scope.department, deviceGroupScope: scope.device_group_scope, limited: scope.device_scope_limited }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The member scope could not be saved.');
      setNotice(`Device scope updated for ${member.email || 'workspace member'}.`);
      await loadMembers();
    } catch (err) { setError(err instanceof Error ? err.message : 'The member scope could not be saved.'); }
    finally { setScopeBusy(null); }
  };

  const removeMember = async (member: Member) => {
    if (!window.confirm(`Remove ${member.email || 'this member'} from the workspace? Their account and device data will remain intact.`)) return;
    setBusyId(member.user_id); setError(null); setNotice(null);
    try {
      const response = await fetch('/api/organization/members', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.user_id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The member could not be removed.');
      setNotice(`Removed ${member.email || 'workspace member'} from the workspace.`);
      await loadMembers();
    } catch (err) { setError(err instanceof Error ? err.message : 'The member could not be removed.'); }
    finally { setBusyId(null); }
  };

  const resetMemberMfa = async (member: Member) => {
    if (!window.confirm(`Remove ${member.email || 'this member'}'s authenticators and recovery codes? They will need to set up MFA again.`)) return;
    setBusyId(member.user_id); setError(null); setNotice(null);
    try {
      const response = await fetch('/api/organization/members/mfa-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: member.user_id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'MFA reset failed.');
      setNotice(`Authenticator access reset for ${member.email || 'workspace member'}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'MFA reset failed.'); }
    finally { setBusyId(null); }
  };

  return <div className="mx-auto max-w-[1200px] space-y-6">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><p className="text-xs font-medium uppercase tracking-[.12em] text-[#758198]">Administration</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#172033]">Workspace members</h1><p className="mt-1 text-sm text-[#758198]">Review access and roles for this organization.</p></div>
      <button type="button" onClick={() => void loadMembers()} disabled={loading} className="inline-flex h-9 items-center justify-center rounded-md border border-[#d8e0ea] bg-white px-3 text-sm font-medium text-[#29344a] hover:bg-[#f8fafc] disabled:opacity-60">Refresh</button>
    </header>
    {error && <div role="alert" className="rounded-md border border-[#f0c9cb] bg-[#fff5f5] px-4 py-3 text-sm text-[#a43138]">{error}</div>}
    {notice && <div role="status" className="rounded-md border border-[#bfe5d4] bg-[#f1fbf6] px-4 py-3 text-sm text-[#176947]">{notice}</div>}
    <section className="overflow-hidden rounded-lg border border-[#e4e9f0] bg-white shadow-[0_1px_2px_rgba(20,32,55,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4"><h2 className="text-sm font-semibold text-[#172033]">People with workspace access</h2><p className="mt-1 text-xs text-[#758198]">Role changes and access removals are recorded in the audit log.</p></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="bg-[#f8fafc] text-[10px] font-semibold uppercase tracking-[.1em] text-[#758198]"><tr><th className="px-5 py-3">Member</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Department</th><th className="px-5 py-3 text-right">Access since</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-[#edf0f4]">
            {loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#758198]">Loading workspace members…</td></tr> : members.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#758198]">No workspace members were found.</td></tr> : members.map((member) => <tr key={member.user_id}>
              <td className="px-5 py-3.5"><span className="font-medium text-[#29344a]">{member.email || 'Email unavailable'}</span></td>
              <td className="px-4 py-3.5">{member.is_self ? <span className="text-xs capitalize text-[#526078]">{member.role.replace('_', ' ')} · you</span> : member.can_manage ? <select aria-label={`Role for ${member.email || 'member'}`} value={member.role} disabled={busyId === member.user_id} onChange={(event) => void updateRole(member, event.target.value)} className="h-9 rounded-md border border-[#d8e0ea] bg-white px-2.5 text-xs capitalize text-[#29344a] disabled:opacity-60">{roles.filter((role) => member.can_grant_admin || role !== 'admin').map((role) => <option key={role} value={role}>{role.replace('_', ' ')}</option>)}</select> : <span className="inline-flex rounded-full bg-[#edf2ff] px-2.5 py-1 text-xs font-semibold capitalize text-[#315fe8]">{member.role.replace('_', ' ')}</span>}</td>
              <td className="px-4 py-3.5 text-[13px] text-[#526078]">{member.department || '—'}</td>
              <td className="px-5 py-3.5 text-right text-xs tabular-nums text-[#758198]">{new Date(member.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3.5 text-right">{member.can_manage && <div className="inline-flex items-center gap-1">{member.can_grant_admin && <button type="button" onClick={() => void resetMemberMfa(member)} disabled={busyId === member.user_id} className="rounded px-2 py-1 text-xs font-semibold text-[#526078] hover:bg-[#f2f5f9] disabled:opacity-50">Reset MFA</button>}<button type="button" onClick={() => void removeMember(member)} disabled={busyId === member.user_id} className="rounded px-2 py-1 text-xs font-semibold text-[#ad343b] hover:bg-[#fff4f4] disabled:opacity-50">Remove</button></div>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
    <section className="overflow-hidden rounded-lg border border-[#e4e9f0] bg-white shadow-[0_1px_2px_rgba(20,32,55,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4"><h2 className="text-sm font-semibold text-[#172033]">Department and device-group access</h2><p className="mt-1 text-xs leading-5 text-[#758198]">Restricted members only see matching devices and device-linked records. A department and selected groups are combined as an intersection.</p></div>
      <div className="divide-y divide-[#edf0f4]">{members.filter((member) => member.can_manage && !member.is_self).map((member) => {
        const scope = memberScopes[member.user_id];
        if (!scope) return null;
        const setScope = (next: Partial<MemberScope>) => setMemberScopes((current) => ({ ...current, [member.user_id]: { ...scope, ...next } }));
        return <details key={member.user_id} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span><span className="block text-sm font-medium text-[#29344a]">{member.email || 'Email unavailable'}</span><span className="mt-1 block text-xs text-[#758198]">{scope.device_scope_limited ? `Restricted · ${[scope.department, scope.device_group_scope.length ? `${scope.device_group_scope.length} groups` : null].filter(Boolean).join(' · ')}` : 'Full organization device access'}</span></span><span className="text-xs font-semibold text-[#315fe8]">Edit scope</span></summary>
          <div className="mt-4 grid gap-4 border-t border-[#edf0f4] pt-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-medium text-[#526078]">Department filter<input maxLength={100} value={scope.department || ''} onChange={(event) => setScope({ department: event.target.value || null })} placeholder="All departments" className="h-9 w-full rounded-md border border-[#d8e0ea] px-3 text-sm font-normal text-[#29344a]" /></label>
            <fieldset className="space-y-2"><legend className="text-xs font-medium text-[#526078]">Allowed device groups</legend>{groups.length === 0 ? <p className="text-xs text-[#758198]">Create device groups in Organization settings before restricting by group.</p> : <div className="grid max-h-28 gap-1 overflow-y-auto rounded-md border border-[#e4e9f0] p-2">{groups.map((group) => <label key={group.id} className="flex items-center gap-2 text-xs text-[#29344a]"><input type="checkbox" checked={scope.device_group_scope.includes(group.id)} onChange={(event) => setScope({ device_group_scope: event.target.checked ? [...scope.device_group_scope, group.id] : scope.device_group_scope.filter((id) => id !== group.id) })} />{group.name}</label>)}</div>}</fieldset>
            <label className="flex items-start gap-2 text-xs leading-5 text-[#526078] sm:col-span-2"><input type="checkbox" checked={scope.device_scope_limited} onChange={(event) => setScope({ device_scope_limited: event.target.checked })} className="mt-1" /><span><span className="font-semibold text-[#29344a]">Restrict device access to this department and/or selected groups</span><span className="block text-[#758198]">At least one department or group is required. Disabling this returns the member to full-organization device visibility.</span></span></label>
            <button type="button" disabled={scopeBusy === member.user_id} onClick={() => void saveScope(member)} className="h-9 w-fit rounded-md bg-[#315fe8] px-3 text-sm font-semibold text-white hover:bg-[#254fc9] disabled:opacity-60">{scopeBusy === member.user_id ? 'Saving…' : 'Save scope'}</button>
          </div>
        </details>;
      })}{members.filter((member) => member.can_manage && !member.is_self).length === 0 && <p className="px-5 py-8 text-center text-sm text-[#758198]">No other members are available to scope.</p>}</div>
    </section>
    <section className="overflow-hidden rounded-lg border border-[#e4e9f0] bg-white shadow-[0_1px_2px_rgba(20,32,55,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4"><h2 className="text-sm font-semibold text-[#172033]">Invite a teammate</h2><p className="mt-1 text-xs text-[#758198]">Create a single-use link tied to the invited email. It expires after seven days.</p></div>
      <form onSubmit={createInvitation} className="grid gap-3 p-5 sm:grid-cols-[minmax(220px,1fr)_180px_auto] sm:items-end">
        <div className="space-y-1.5"><label htmlFor="inviteEmail" className="text-xs font-medium text-[#526078]">Work email</label><input id="inviteEmail" type="email" required maxLength={254} autoComplete="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="teammate@company.com" className="h-10 w-full rounded-md border border-[#d8e0ea] bg-white px-3 text-sm text-[#172033] placeholder:text-[#9aa4b4] focus:border-[#315fe8] focus:outline-none focus:ring-2 focus:ring-blue-100" /></div>
        <div className="space-y-1.5"><label htmlFor="inviteRole" className="text-xs font-medium text-[#526078]">Workspace role</label><select id="inviteRole" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as (typeof roles)[number])} className="h-10 w-full rounded-md border border-[#d8e0ea] bg-white px-3 text-sm capitalize text-[#29344a]">{roles.filter((role) => role !== 'admin' || members.some((member) => member.is_self && member.can_grant_admin)).map((role) => <option key={role} value={role}>{role.replace('_', ' ')}</option>)}</select></div>
        <button type="submit" disabled={inviteBusy} className="inline-flex h-10 items-center justify-center rounded-md bg-[#315fe8] px-4 text-sm font-semibold text-white hover:bg-[#254fc9] disabled:cursor-not-allowed disabled:opacity-60">{inviteBusy ? 'Creating…' : 'Create invite link'}</button>
      </form>
      {inviteUrl && <div className="mx-5 mb-5 rounded-md border border-[#d9e4fa] bg-[#f6f8fd] p-4"><label htmlFor="inviteUrl" className="text-xs font-semibold text-[#29344a]">Share this invitation link</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input id="inviteUrl" readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-md border border-[#d8e0ea] bg-white px-3 text-xs text-[#526078]" /><button type="button" onClick={() => void copyInvite()} className="h-10 rounded-md border border-[#d8e0ea] bg-white px-3 text-xs font-semibold text-[#29344a] hover:bg-[#f8fafc]">Copy link</button></div>{copyNotice && <p role="status" className="mt-2 text-xs text-[#176947]">{copyNotice}</p>}<p className="mt-2 text-xs leading-5 text-[#758198]">Anyone with the link can view the invitation details, but joining requires an account that matches the invited email.</p></div>}
      <div className="border-t border-[#edf0f4] px-5 py-4"><h3 className="text-sm font-semibold text-[#172033]">Pending invitations</h3>{invitations.length === 0 ? <p className="mt-2 text-xs text-[#758198]">No pending invitations.</p> : <ul className="mt-3 divide-y divide-[#edf0f4]">{invitations.map((invitation) => <li key={invitation.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-[#29344a]">{invitation.email}</p><p className="mt-0.5 text-xs capitalize text-[#758198]">{invitation.role.replace('_', ' ')} · expires {new Date(invitation.expires_at).toLocaleDateString()}</p></div><button type="button" onClick={() => void revokeInvitation(invitation)} className="w-fit rounded px-2 py-1 text-xs font-semibold text-[#ad343b] hover:bg-[#fff4f4]">Revoke</button></li>)}</ul>}</div>
    </section>
    <p className="text-xs leading-5 text-[#758198]">Invitations require the recipient to sign in with the invited email. Role changes, access removals, and invitation events are written to the organization audit history.</p>
  </div>;
}
