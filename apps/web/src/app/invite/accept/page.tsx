'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Invitation = { email: string; role: string; org_name: string; expires_at: string };

export default function AcceptInvitationPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const currentToken = new URLSearchParams(window.location.search).get('token') || '';
    setToken(currentToken);
    if (!/^[a-f0-9]{64}$/i.test(currentToken)) {
      setError('This invitation link is invalid. Ask an organization administrator for a new link.');
      setChecking(false);
      return;
    }
    let active = true;
    void Promise.all([
      fetch(`/api/organization/invitations?token=${encodeURIComponent(currentToken)}`, { cache: 'no-store' }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'This invitation is unavailable.');
        return result.invitation as Invitation;
      }),
      createClient().auth.getUser(),
    ]).then(([invite, { data }]) => {
      if (!active) return;
      setInvitation(invite);
      setSignedInEmail(data.user?.email?.toLowerCase() ?? null);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'This invitation is unavailable.');
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  const accept = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch('/api/organization/invitations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'This invitation could not be accepted.');
      setNotice(`You joined ${result.organization?.org_name || invitation?.org_name}. Opening your workspace…`);
      router.replace('/'); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'This invitation could not be accepted.'); }
    finally { setBusy(false); }
  };

  const authenticateAndJoin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invitation) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const supabase = createClient();
      if (mode === 'signup') {
        const next = `/invite/accept?token=${encodeURIComponent(token)}`;
        const { data, error: authError } = await supabase.auth.signUp({
          email: invitation.email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (authError) throw new Error(authError.message);
        if (!data.session) {
          setNotice('Confirm your email using the message we sent. Then return to this invitation link to join the workspace.');
          return;
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: invitation.email, password });
        if (authError) throw new Error(authError.message);
      }
      setSignedInEmail(invitation.email.toLowerCase());
      setPassword('');
      await accept();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign-in failed. Please try again.'); }
    finally { setBusy(false); }
  };

  const matchingAccount = signedInEmail && invitation && signedInEmail === invitation.email.toLowerCase();
  const differentAccount = signedInEmail && invitation && signedInEmail !== invitation.email.toLowerCase();

  return <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-5 py-10">
    <section className="w-full max-w-[480px] rounded-xl border border-[#e4e9f0] bg-white p-7 shadow-[0_8px_30px_rgba(24,39,75,.06)] sm:p-9">
      <Link href="/login" className="flex w-fit items-center gap-2.5 text-[#172033] no-underline"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#315fe8] text-sm font-bold text-white">D</span><span className="text-base font-semibold">DeepSee</span></Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[.12em] text-[#315fe8]">Workspace invitation</p>
      <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-[#172033]">Join your team</h1>
      {checking ? <p className="mt-3 text-sm text-[#758198]">Checking invitation…</p> : invitation ? <>
        <div className="mt-4 rounded-lg border border-[#e4e9f0] bg-[#f8fafc] p-4"><p className="text-sm text-[#526078]">You’ve been invited to</p><p className="mt-1 text-lg font-semibold text-[#172033]">{invitation.org_name}</p><p className="mt-2 text-xs text-[#758198]">{invitation.email} · <span className="capitalize">{invitation.role.replace('_', ' ')}</span> · expires {new Date(invitation.expires_at).toLocaleDateString()}</p></div>
        {differentAccount ? <div className="mt-5 rounded-md border border-[#f0c9cb] bg-[#fff5f5] p-4 text-sm text-[#a43138]"><p>You are signed in as {signedInEmail}. Use the invited email {invitation.email} to join.</p><button type="button" onClick={async () => { await createClient().auth.signOut(); setSignedInEmail(null); }} className="mt-3 font-semibold underline">Sign out</button></div> : matchingAccount ? <button type="button" onClick={() => void accept()} disabled={busy} className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#315fe8] px-4 text-sm font-semibold text-white hover:bg-[#254fc9] disabled:opacity-60">{busy ? 'Joining…' : `Join ${invitation.org_name}`}</button> : <>
          <div className="mt-6 flex rounded-md border border-[#e4e9f0] bg-[#f8fafc] p-1"><button type="button" onClick={() => setMode('signup')} className={`flex-1 rounded px-3 py-2 text-xs font-semibold ${mode === 'signup' ? 'bg-white text-[#172033] shadow-sm' : 'text-[#758198]'}`}>Create account</button><button type="button" onClick={() => setMode('signin')} className={`flex-1 rounded px-3 py-2 text-xs font-semibold ${mode === 'signin' ? 'bg-white text-[#172033] shadow-sm' : 'text-[#758198]'}`}>I have an account</button></div>
          <form onSubmit={authenticateAndJoin} className="mt-4 space-y-4"><div><label htmlFor="inviteEmail" className="text-xs font-medium text-[#526078]">Invited email</label><input id="inviteEmail" readOnly value={invitation.email} className="mt-1.5 h-10 w-full rounded-md border border-[#d8e0ea] bg-[#f8fafc] px-3 text-sm text-[#526078]" /></div><div><label htmlFor="invitePassword" className="text-xs font-medium text-[#526078]">Password</label><input id="invitePassword" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#d8e0ea] bg-white px-3 text-sm text-[#172033] focus:border-[#315fe8] focus:outline-none focus:ring-2 focus:ring-blue-100" /></div><button type="submit" disabled={busy} className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#315fe8] px-4 text-sm font-semibold text-white hover:bg-[#254fc9] disabled:opacity-60">{busy ? 'Working…' : mode === 'signup' ? 'Create account and join' : 'Sign in and join'}</button></form>
        </>}
      </> : null}
      {error && <div role="alert" className="mt-4 rounded-md border border-[#f0c9cb] bg-[#fff5f5] px-4 py-3 text-sm text-[#a43138]">{error}</div>}
      {notice && <div role="status" className="mt-4 rounded-md border border-[#bfe5d4] bg-[#f1fbf6] px-4 py-3 text-sm text-[#176947]">{notice}</div>}
      <p className="mt-6 border-t border-[#edf0f4] pt-5 text-xs leading-5 text-[#758198]">Joining gives this account the role shown above in this organization. The invitation can only be used once and must be accepted before it expires.</p>
    </section>
  </main>;
}
