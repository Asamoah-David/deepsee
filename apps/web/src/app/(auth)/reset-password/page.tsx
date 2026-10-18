'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user) { setError('This reset link is invalid or expired. Request a new one from the sign-in page.'); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError(updateError.message); return; }
      router.replace('/');
      router.refresh();
    } catch {
      setError('The authentication service is not reachable. Try again when it is available.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-5 py-10">
    <section className="w-full max-w-[420px] rounded-xl border border-[#e4e9f0] bg-white p-6 shadow-sm sm:p-8">
      <Link href="/login" className="flex w-fit items-center gap-3 text-[#172033] no-underline"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#315fe8] text-sm font-bold text-white">D</span><span className="text-base font-semibold">DeepSee</span></Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[.13em] text-[#315fe8]">Account recovery</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172033]">Set a new password</h1>
      <p className="mt-2 text-sm leading-6 text-[#758198]">Choose a new password for your account.</p>
      {error && <div role="alert" className="mt-5 rounded-md border border-[#f0c9cb] bg-[#fff5f5] px-4 py-3 text-sm text-[#a43138]">{error}</div>}
      <form onSubmit={updatePassword} className="mt-6 space-y-4">
        <div className="space-y-1.5"><label htmlFor="new-password" className="text-[13px] font-medium text-[#29344a]">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-md border border-[#d8e0ea] px-3.5 text-sm text-[#172033] focus:border-[#315fe8] focus:outline-none focus:ring-2 focus:ring-blue-100" /><p className="text-xs text-[#758198]">Use at least 8 characters.</p></div>
        <div className="space-y-1.5"><label htmlFor="confirm-password" className="text-[13px] font-medium text-[#29344a]">Confirm password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-11 w-full rounded-md border border-[#d8e0ea] px-3.5 text-sm text-[#172033] focus:border-[#315fe8] focus:outline-none focus:ring-2 focus:ring-blue-100" /></div>
        <button type="submit" disabled={loading} className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#315fe8] px-4 text-sm font-semibold text-white hover:bg-[#254fc9] disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Updating password…' : 'Update password'}</button>
      </form>
    </section>
  </main>;
}
