'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

type TotpFactor = { id: string; friendly_name?: string; status: 'verified' | 'unverified'; created_at: string };
type Enrollment = { id: string; totp: { qr_code: string; secret: string; uri: string } };

export default function SecurityPage() {
  const [factor, setFactor] = useState<TotpFactor | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [requireMfa, setRequireMfa] = useState(false);
  const [policyRole, setPolicyRole] = useState<string | null>(null);
  const [policyBusy, setPolicyBusy] = useState(false);

  const refreshFactors = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const supabase = createClient();
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const verified = data.totp.find((item) => item.status === 'verified');
      setFactor(verified ?? null);
      setPendingFactorId(data.all.find((item) => item.factor_type === 'totp' && item.status === 'unverified')?.id ?? null);
      if (!verified) setEnrollment(null);
    } catch {
      setError('Authenticator status could not be loaded. Check your connection and refresh.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void refreshFactors();
    void fetch('/api/organization/security-policy', { cache: 'no-store' }).then(async (response) => {
      const result = await response.json();
      if (response.ok && result.policy) { setRequireMfa(result.policy.require_mfa); setPolicyRole(result.policy.actor_role); }
    }).catch(() => {});
    if (new URLSearchParams(window.location.search).get('required') === '1') setNotice('Your organization requires MFA. Connect and verify an authenticator to continue using workspace features.');
  }, [refreshFactors]);

  const generateRecoveryCodes = async () => {
    if (!window.confirm('Generate a new recovery-code set? Any codes from a previous set will stop working.')) return;
    setRecoveryBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch('/api/auth/mfa/recovery-codes', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Recovery codes could not be generated.');
      setRecoveryCodes(result.codes);
      setNotice('Save these codes now. They are shown once and cannot be retrieved later.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Recovery codes could not be generated.'); }
    finally { setRecoveryBusy(false); }
  };

  const updatePolicy = async (next: boolean) => {
    setPolicyBusy(true); setError(null); setNotice(null);
    try {
      const response = await fetch('/api/organization/security-policy', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requireMfa: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Organization MFA policy could not be changed.');
      setRequireMfa(next); setNotice(next ? 'MFA is now required for this organization.' : 'Organization MFA requirement removed.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Organization MFA policy could not be changed.'); }
    finally { setPolicyBusy(false); }
  };

  const copyRecoveryCodes = async () => {
    if (!recoveryCodes) return;
    try { await navigator.clipboard.writeText(recoveryCodes.join('\n')); setNotice('Recovery codes copied. Store them in a secure location.'); }
    catch { setError('Clipboard access is unavailable. Select and copy the codes manually.'); }
  };

  const beginEnrollment = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const supabase = createClient();
      const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const pending = existing.all.find((item) => item.factor_type === 'totp' && item.status === 'unverified');
      if (pending) {
        const { error: cancelError } = await supabase.auth.mfa.unenroll({ factorId: pending.id });
        if (cancelError) throw cancelError;
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'DeepSee authenticator',
        issuer: 'DeepSee',
      });
      if (enrollError) throw enrollError;
      setEnrollment({ id: data.id, totp: data.totp });
      setPendingFactorId(data.id);
      setCode('');
    } catch {
      setError('Could not start authenticator setup. Confirm your session is current and try again.');
    } finally { setBusy(false); }
  };

  const verifyEnrollment = async () => {
    if (!enrollment || !/^\d{6,8}$/.test(code.trim())) {
      setError('Enter the current 6–8 digit code from your authenticator app.'); return;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.id, code: code.trim() });
      if (verifyError) throw verifyError;
      setEnrollment(null); setPendingFactorId(null); setCode('');
      setNotice('Authenticator enabled for your account. Protected workspace pages and APIs will require a current code.');
      await refreshFactors();
    } catch {
      setError('That code could not be verified. Check the time on your device and enter a fresh code.');
    } finally { setBusy(false); }
  };

  const disableAuthenticator = async () => {
    if (!factor || !/^\d{6,8}$/.test(code.trim())) {
      setError('Enter a current authenticator code to confirm removal.'); return;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      const supabase = createClient();
      const { error: challengeError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
      if (challengeError) throw challengeError;
      const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (removeError) throw removeError;
      setConfirmDisable(false); setCode('');
      setNotice('Authenticator removed from your account.');
      await refreshFactors();
    } catch {
      setError('The code could not be verified or the authenticator could not be removed. No change was made.');
    } finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-[900px] space-y-6">
    <header>
      <p className="text-xs font-medium uppercase tracking-[.12em] text-[#758198]">Administration</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#172033]">Account security</h1>
      <p className="mt-1 text-sm text-[#758198]">Manage the authenticator linked to your DeepSee sign-in.</p>
    </header>

    {error && <div role="alert" className="rounded-md border border-[#f0c9cb] bg-[#fff5f5] px-4 py-3 text-sm text-[#a43138]">{error}</div>}
    {notice && <div role="status" className="rounded-md border border-[#bfe5d4] bg-[#f1fbf6] px-4 py-3 text-sm text-[#176947]">{notice}</div>}

    <section className="rounded-lg border border-[#e4e9f0] bg-white shadow-[0_1px_2px_rgba(20,32,55,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4"><h2 className="text-sm font-semibold text-[#172033]">Authenticator app</h2><p className="mt-1 text-xs leading-5 text-[#758198]">Use a TOTP app such as Microsoft Authenticator, Google Authenticator, or 1Password.</p></div>
      <div className="p-5">
        {loading ? <p role="status" className="text-sm text-[#758198]">Checking authenticator status…</p> : factor ? <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><div className="flex items-center gap-2"><span className="dot dot-online" aria-hidden="true"/><p className="text-sm font-semibold text-[#172033]">Authenticator enabled</p></div><p className="mt-1 text-xs text-[#758198]">{factor.friendly_name || 'TOTP authenticator'} · linked {new Date(factor.created_at).toLocaleDateString()}</p></div>
          {!confirmDisable && <button type="button" onClick={() => { setConfirmDisable(true); setCode(''); setError(null); }} className="h-9 rounded-md border border-[#e8c4c6] px-3 text-sm font-medium text-[#a43138] hover:bg-[#fff5f5]">Remove authenticator</button>}
        </div> : enrollment ? <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="flex min-h-[220px] items-center justify-center rounded-md border border-[#edf0f4] bg-white p-3"><Image alt="Authenticator setup QR code" className="h-48 w-48" src={`data:image/svg+xml;utf-8,${enrollment.totp.qr_code}`} width={192} height={192} unoptimized /></div>
          <div className="space-y-4">
            <div><h3 className="text-sm font-semibold text-[#172033]">Scan this code</h3><p className="mt-1 text-sm leading-6 text-[#758198]">In your authenticator app, add an account and scan the QR code. If you cannot scan it, enter the setup key manually.</p></div>
            <div><label htmlFor="totp-secret" className="text-xs font-medium text-[#526078]">Manual setup key</label><input id="totp-secret" readOnly value={enrollment.totp.secret} onFocus={(event) => event.currentTarget.select()} className="mt-1 h-10 w-full rounded-md border border-[#d8e0ea] bg-[#f8fafc] px-3 font-mono text-sm text-[#29344a]" /></div>
            <div><label htmlFor="totp-verify" className="text-xs font-medium text-[#526078]">6-digit verification code</label><input id="totp-verify" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} className="mt-1 h-10 w-full rounded-md border border-[#d8e0ea] px-3 font-mono text-sm tracking-[.2em] text-[#172033]" placeholder="000000" /></div>
            <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void verifyEnrollment()} className="h-9 rounded-md bg-[#315fe8] px-3 text-sm font-semibold text-white hover:bg-[#254fc9] disabled:opacity-60">{busy ? 'Verifying…' : 'Verify and enable'}</button><button type="button" disabled={busy} onClick={() => { setEnrollment(null); setCode(''); setError(null); }} className="h-9 rounded-md border border-[#d8e0ea] px-3 text-sm font-medium text-[#526078]">Cancel</button></div>
          </div>
        </div> : <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><p className="text-sm font-semibold text-[#172033]">{pendingFactorId ? 'Authenticator setup is incomplete' : 'No authenticator is connected'}</p><p className="mt-1 text-xs leading-5 text-[#758198]">Add an authenticator to require a time-based code when accessing the dashboard.{pendingFactorId ? ' Restarting will discard the unfinished setup.' : ''}</p></div>
          <button type="button" disabled={busy} onClick={() => void beginEnrollment()} className="h-9 shrink-0 rounded-md bg-[#315fe8] px-3 text-sm font-semibold text-white hover:bg-[#254fc9] disabled:opacity-60">{busy ? 'Preparing…' : pendingFactorId ? 'Restart setup' : 'Set up authenticator'}</button>
        </div>}
        {factor && confirmDisable && <div className="mt-5 max-w-md space-y-3 rounded-md border border-[#f0c9cb] bg-[#fffafa] p-4"><p className="text-sm font-medium text-[#29344a]">Confirm with your current authenticator code before removing it.</p><label htmlFor="totp-disable" className="text-xs font-medium text-[#526078]">Verification code</label><input id="totp-disable" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} className="h-10 w-full rounded-md border border-[#d8e0ea] px-3 font-mono text-sm tracking-[.2em] text-[#172033]" placeholder="000000" /><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void disableAuthenticator()} className="h-9 rounded-md bg-[#a43138] px-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Confirming…' : 'Verify and remove'}</button><button type="button" disabled={busy} onClick={() => { setConfirmDisable(false); setCode(''); setError(null); }} className="h-9 rounded-md border border-[#d8e0ea] px-3 text-sm font-medium text-[#526078]">Cancel</button></div></div>}
      </div>
    </section>

    {factor && <section className="rounded-lg border border-[#e4e9f0] bg-white shadow-[0_1px_2px_rgba(20,32,55,.03)]"><div className="border-b border-[#edf0f4] px-5 py-4"><h2 className="text-sm font-semibold text-[#172033]">Recovery codes</h2><p className="mt-1 text-xs leading-5 text-[#758198]">Each code works once if you lose access to your authenticator. Generating a new set invalidates the previous one.</p></div><div className="p-5"><button type="button" disabled={recoveryBusy} onClick={() => void generateRecoveryCodes()} className="h-9 rounded-md border border-[#d8e0ea] px-3 text-sm font-semibold text-[#29344a] disabled:opacity-60">{recoveryBusy ? 'Generating…' : recoveryCodes ? 'Replace recovery codes' : 'Generate recovery codes'}</button>{recoveryCodes && <div className="mt-4 rounded-md border border-[#d8e0ea] bg-[#f8fafc] p-4"><p className="text-xs font-semibold text-[#29344a]">Save this set now</p><pre className="mt-3 grid grid-cols-1 gap-1 whitespace-pre-wrap font-mono text-sm text-[#172033] sm:grid-cols-2">{recoveryCodes.join('\n')}</pre><button type="button" onClick={() => void copyRecoveryCodes()} className="mt-3 h-8 rounded-md border border-[#d8e0ea] bg-white px-3 text-xs font-semibold text-[#29344a]">Copy codes</button></div>}</div></section>}
    {policyRole && <section className="rounded-lg border border-[#e4e9f0] bg-white shadow-[0_1px_2px_rgba(20,32,55,.03)]"><div className="border-b border-[#edf0f4] px-5 py-4"><h2 className="text-sm font-semibold text-[#172033]">Organization policy</h2><p className="mt-1 text-xs leading-5 text-[#758198]">Require each workspace member to enroll an authenticator. Changes require an owner or super admin with a verified MFA challenge.</p></div><label className="flex items-start gap-3 p-5"><input type="checkbox" checked={requireMfa} disabled={policyBusy || !['owner', 'super_admin'].includes(policyRole)} onChange={(event) => void updatePolicy(event.target.checked)} className="mt-1"/><span><span className="text-sm font-semibold text-[#29344a]">Require MFA for all workspace members</span><span className="mt-1 block text-xs text-[#758198]">{policyBusy ? 'Updating policy…' : requireMfa ? 'Enabled' : 'Disabled'}{!['owner', 'super_admin'].includes(policyRole) ? ' · only owners and super admins can change this policy' : ''}</span></span></label></section>}
    <p className="text-xs leading-5 text-[#758198]">Authenticator recovery and organization policy are enforced by server and database checks. Store recovery codes securely; DeepSee does not display a saved set again.</p>
  </div>;
}
