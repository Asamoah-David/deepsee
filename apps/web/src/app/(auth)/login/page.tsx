'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const getSafeNextPath = () => {
    const next = new URLSearchParams(window.location.search).get('next');
    return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
      ? next
      : '/';
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('auth') === 'callback-failed') {
      setError('That account link is invalid or expired. Request a new password reset link and try again.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(result?.error || (response.status >= 500
          ? 'Sign-in is temporarily unavailable. Please try again.'
          : 'Email or password is incorrect.'));
        return;
      }
      // The same-origin response has now committed the server-set session
      // cookies before this full navigation reaches middleware.
      window.location.assign(getSafeNextPath());
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      setError(message.includes('fetch') || message.includes('network')
        ? 'The authentication service could not be reached. Check your connection and try again.'
        : 'Unable to sign in right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async () => {
    setError(null);
    setRecoveryMessage(null);
    if (!email.trim()) {
      setRecoveryMessage('Enter your work email above and select “Forgot password?” again.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (resetError) { setRecoveryMessage(resetError.message); return; }
      setRecoveryMessage('If an account exists for that address, password reset instructions have been sent.');
    } catch {
      setRecoveryMessage('The authentication service is not reachable. Try again when it is available.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(420px,.82fr)]">
    <section className="dark-panel relative hidden overflow-hidden bg-[#111b2e] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
      <div className="absolute inset-0 opacity-[.16]" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <Link href="/login" className="relative flex w-fit items-center gap-3 text-white no-underline"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-sm font-bold">D</span><span className="text-base font-semibold">DeepSee</span></Link>
      <div className="relative max-w-xl pb-8">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-300">Windows fleet operations</p>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.14] tracking-tight xl:text-[46px]">Your devices, clearly in view.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">A single workspace for device status, operations, and support across your organization.</p>
        <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/[.04] p-4"><div className="text-sm font-semibold">One workspace</div><p className="mt-1 text-xs leading-5 text-slate-400">Keep your team and device inventory together.</p></div>
          <div className="rounded-lg border border-white/10 bg-white/[.04] p-4"><div className="text-sm font-semibold">Clear status</div><p className="mt-1 text-xs leading-5 text-slate-400">See recorded device activity and alerts.</p></div>
        </div>
      </div>
      <p className="relative text-xs text-slate-500">DeepSee · Device operations workspace</p>
    </section>
    <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
      <div className="w-full max-w-[390px]">
        <div className="mb-10 flex items-center gap-3 lg:hidden"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#315fe8] text-sm font-bold text-white">D</span><span className="text-base font-semibold text-[#172033]">DeepSee</span></div>
        <div><p className="text-xs font-semibold uppercase tracking-[.13em] text-[#315fe8]">Welcome back</p><h2 className="mt-2 text-[28px] font-semibold tracking-tight text-[#172033]">Sign in to your workspace</h2><p className="mt-2 text-sm leading-6 text-[#758198]">Use your work email and password to continue.</p></div>
        {error && <div role="alert" className="mt-6 rounded-md border border-[#f0c9cb] bg-[#fff5f5] px-4 py-3 text-sm text-[#a43138]">{error}</div>}
        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div className="space-y-1.5"><label className="text-[13px] font-medium text-[#29344a]" htmlFor="email">Work email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="h-11 w-full rounded-md border border-[#d8e0ea] bg-white px-3.5 text-sm text-[#172033] placeholder:text-[#9aa4b4] shadow-sm transition focus:border-[#315fe8] focus:outline-none focus:ring-3 focus:ring-blue-100" /></div>
          <div className="space-y-1.5"><div className="flex items-center justify-between"><label className="text-[13px] font-medium text-[#29344a]" htmlFor="password">Password</label><button type="button" disabled={loading} onClick={requestPasswordReset} className="text-xs font-semibold text-[#315fe8] hover:text-[#254fc9] disabled:opacity-50">Forgot password?</button></div><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="h-11 w-full rounded-md border border-[#d8e0ea] bg-white px-3.5 text-sm text-[#172033] placeholder:text-[#9aa4b4] shadow-sm transition focus:border-[#315fe8] focus:outline-none focus:ring-2 focus:ring-blue-100" /></div>
          {recoveryMessage && <p role="status" className="text-sm text-[#526078]">{recoveryMessage}</p>}
          <button type="submit" disabled={loading} className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#315fe8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#254fc9] disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="mt-7 border-t border-[#edf0f4] pt-6 text-center text-sm text-[#758198]">New to DeepSee? <Link href="/register" className="font-semibold text-[#315fe8] hover:text-[#254fc9]">Create an organization</Link></p>
        <p className="mt-10 text-center text-xs text-[#9aa4b4]">Access is limited to authorized workspace members.</p>
      </div>
    </section>
  </main>;
}
