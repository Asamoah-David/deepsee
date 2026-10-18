'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function MfaChallengePage() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) { window.location.replace('/login?next=/'); return; }
        const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        const verified = data.totp.find((factor) => factor.status === 'verified');
        if (!verified) { window.location.replace('/'); return; }
        if (active) setFactorId(verified.id);
      } catch {
        if (active) setError('Your authenticator could not be checked. Refresh the page or sign in again.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!factorId || !/^\d{6,8}$/.test(code.trim())) { setError('Enter the current 6–8 digit code from your authenticator app.'); return; }
    setBusy(true); setError(null);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (verifyError) throw verifyError;
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      const destination = next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/';
      window.location.assign(destination);
    } catch {
      setError('That code was not accepted. Check your device time and try the current code again.');
    } finally { setBusy(false); }
  };

  const recover = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      const response = await fetch('/api/auth/mfa/recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The recovery code was not accepted.');
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign('/login?mfa=recovered');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The recovery code was not accepted.'); }
    finally { setBusy(false); }
  };

  return <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-5 py-10">
    <section className="w-full max-w-[420px] rounded-xl border border-[#e4e9f0] bg-white p-7 shadow-sm sm:p-9">
      <Link href="/login" className="flex w-fit items-center gap-3 text-[#172033] no-underline"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#315fe8] text-sm font-bold text-white">D</span><span className="text-base font-semibold">DeepSee</span></Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[.13em] text-[#315fe8]">Additional verification</p>
      <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-[#172033]">Check your authenticator</h1>
      <p className="mt-2 text-sm leading-6 text-[#758198]">{useRecovery ? 'Use one of your saved recovery codes to remove the lost authenticator and restore sign-in.' : 'Enter the current code from your authenticator app to continue to the workspace.'}</p>
      {error && <div role="alert" className="mt-5 rounded-md border border-[#f0c9cb] bg-[#fff5f5] px-4 py-3 text-sm text-[#a43138]">{error}</div>}
      <form onSubmit={useRecovery ? recover : verify} className="mt-6 space-y-4">
        <div><label htmlFor="mfa-code" className="text-[13px] font-medium text-[#29344a]">{useRecovery ? 'Recovery code' : 'Authenticator code'}</label><input id="mfa-code" inputMode={useRecovery ? 'text' : 'numeric'} autoComplete={useRecovery ? 'off' : 'one-time-code'} autoFocus maxLength={useRecovery ? 40 : 8} value={code} onChange={(event) => setCode(useRecovery ? event.target.value.toUpperCase().slice(0, 40) : event.target.value.replace(/\D/g, '').slice(0, 8))} className="mt-1.5 h-11 w-full rounded-md border border-[#d8e0ea] px-3.5 font-mono text-sm tracking-[.12em] text-[#172033] focus:border-[#315fe8] focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder={useRecovery ? 'XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX' : '000000'} /></div>
        <button type="submit" disabled={loading || busy || (!useRecovery && !factorId)} className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#315fe8] px-4 text-sm font-semibold text-white hover:bg-[#254fc9] disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Checking account…' : busy ? 'Verifying…' : useRecovery ? 'Use recovery code' : 'Verify and continue'}</button>
      </form>
      <button type="button" onClick={() => { setUseRecovery((current) => !current); setCode(''); setError(null); }} className="mt-4 w-full text-center text-xs font-semibold text-[#315fe8] hover:underline">{useRecovery ? 'Use authenticator instead' : 'Use a recovery code'}</button>
      <p className="mt-6 border-t border-[#edf0f4] pt-5 text-center text-xs leading-5 text-[#758198]">A recovery code is single-use and will remove your existing authenticator. You will sign in again and set up a new authenticator.</p>
    </section>
  </main>;
}
