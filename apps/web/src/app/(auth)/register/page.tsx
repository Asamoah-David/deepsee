'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [existingUser, setExistingUser] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !active) return;
        const { data: memberships } = await supabase.from('memberships').select('org_id').eq('user_id', user.id).limit(1);
        if (!active) return;
        if (memberships?.length) {
          router.replace('/');
          return;
        }
        setExistingUser(true);
      } catch {
        // A new visitor can still see the registration form. Submission will
        // report a clear service-unavailable message if Supabase is offline.
      } finally {
        if (active) setCheckingSession(false);
      }
    };
    void checkSession();
    return () => { active = false; };
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const supabase = createClient();
      if (!existingUser) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/register?setup=organization')}` },
        });
        if (signUpError) { setError(signUpError.message); return; }
        if (!data.user) { setError('Unable to create the account. Please try again.'); return; }
        if (!data.session) {
          setError('Your account was created. Confirm your email, then sign in to finish setting up the organization.');
          return;
        }
      }
      const orgResponse = await fetch('/api/auth/create-organization', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgName }) });
      const orgData = await orgResponse.json();
      if (!orgResponse.ok || orgData.error) { setError(orgData.error || 'Organization setup failed. Please try again.'); return; }
      router.push('/'); router.refresh();
    } catch {
      setError('Unable to create your workspace right now. Please try again.');
    } finally { setLoading(false); }
  };

  return <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(440px,.82fr)]">
    <section className="dark-panel relative hidden overflow-hidden bg-[#111b2e] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
      <div className="absolute inset-0 opacity-[.16]" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <Link href="/login" className="relative flex w-fit items-center gap-3 text-white no-underline"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-sm font-bold">D</span><span className="text-base font-semibold">DeepSee</span></Link>
      <div className="relative max-w-xl pb-8"><p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-300">Get started</p><h1 className="mt-5 text-4xl font-semibold leading-[1.14] tracking-tight xl:text-[46px]">Set up your team workspace.</h1><p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Create an organization and administrator account to begin connecting your Windows devices.</p><div className="mt-10 max-w-lg rounded-lg border border-white/10 bg-white/[.04] p-5"><p className="text-sm font-semibold">Built for clear operations</p><p className="mt-2 text-sm leading-6 text-slate-400">Start with your team and device inventory. Add people and operational workflows as your workspace grows.</p></div></div>
      <p className="relative text-xs text-slate-500">DeepSee · Device operations workspace</p>
    </section>
    <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
      <div className="w-full max-w-[410px]">
        <div className="mb-9 flex items-center gap-3 lg:hidden"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#315fe8] text-sm font-bold text-white">D</span><span className="text-base font-semibold text-[#172033]">DeepSee</span></div>
      <div><p className="text-xs font-semibold uppercase tracking-[.13em] text-[#315fe8]">Organization setup</p><h2 className="mt-2 text-[28px] font-semibold tracking-tight text-[#172033]">{existingUser ? 'Finish your workspace setup' : 'Create your workspace'}</h2><p className="mt-2 text-sm leading-6 text-[#758198]">{existingUser ? 'Create an organization for your signed-in account.' : 'Set up your organization and first administrator account.'}</p></div>
        {error && <div role="alert" className="mt-5 rounded-md border border-[#f0c9cb] bg-[#fff5f5] px-4 py-3 text-sm text-[#a43138]">{error}</div>}
        <form onSubmit={handleRegister} className="mt-7 space-y-4">
          <div className="space-y-1.5"><label className="text-[13px] font-medium text-[#29344a]" htmlFor="orgName">Organization name</label><input id="orgName" type="text" autoComplete="organization" required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Corporation" className="h-11 w-full rounded-md border border-[#d8e0ea] bg-white px-3.5 text-sm text-[#172033] placeholder:text-[#9aa4b4] shadow-sm focus:border-[#315fe8] focus:outline-none focus:ring-2 focus:ring-blue-100" /></div>
          {!existingUser && <>
            <div className="space-y-1.5"><label className="text-[13px] font-medium text-[#29344a]" htmlFor="email">Administrator work email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="h-11 w-full rounded-md border border-[#d8e0ea] bg-white px-3.5 text-sm text-[#172033] placeholder:text-[#9aa4b4] shadow-sm focus:border-[#315fe8] focus:outline-none focus:ring-2 focus:ring-blue-100" /></div>
            <div className="space-y-1.5"><label className="text-[13px] font-medium text-[#29344a]" htmlFor="password">Password</label><input id="password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="h-11 w-full rounded-md border border-[#d8e0ea] bg-white px-3.5 text-sm text-[#172033] placeholder:text-[#9aa4b4] shadow-sm focus:border-[#315fe8] focus:outline-none focus:ring-2 focus:ring-blue-100" /><p className="text-xs text-[#758198]">Use at least 6 characters.</p></div>
          </>}
          <button type="submit" disabled={loading || checkingSession} className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#315fe8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#254fc9] disabled:cursor-not-allowed disabled:opacity-60">{checkingSession || loading ? 'Setting up…' : existingUser ? 'Create organization' : 'Create workspace'}</button>
        </form>
        <p className="mt-6 border-t border-[#edf0f4] pt-5 text-center text-sm text-[#758198]">Already have a workspace? <Link href="/login" className="font-semibold text-[#315fe8] hover:text-[#254fc9]">Sign in</Link></p>
      </div>
    </section>
  </main>;
}
