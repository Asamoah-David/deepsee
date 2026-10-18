'use client';

import { useState, useEffect, useCallback } from 'react';

interface EnrollmentSession {
  id: string;
  code: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  devices: {
    name: string;
    hostname: string;
  } | null;
}

export default function EnrollmentPage() {
  const [sessions, setSessions] = useState<EnrollmentSession[]>([]);
  const [currentLink, setCurrentLink] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/enrollment/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Fetch sessions error:', err);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const generateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/enrollment/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_in_hours: 24 }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate link');
      }

      const data = await response.json();
      setCurrentLink(data.session.enrollment_link);
      await fetchSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate link';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!currentLink) return;
    try {
      await navigator.clipboard.writeText(currentLink);
      setCopyMessage('Enrollment link copied.');
    } catch (err) {
      console.error('Copy failed:', err);
      setCopyMessage('Could not copy the link. Select and copy it manually.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `In ${days} day${days > 1 ? 's' : ''}`;
    }

    if (hours > 0) {
      return `In ${hours} hour${hours > 1 ? 's' : ''}`;
    }

    return `In ${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <div><p className="text-xs font-medium uppercase tracking-[.12em] text-[#758198]">Connect</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#172033]">Device enrollment</h1><p className="mt-1 text-sm text-[#758198]">Create a time-limited link for enrolling a Windows device.</p></div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-[#f0c9cb] bg-[#fff5f5] px-4 py-3 text-sm text-[#a43138]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-[#e4e9f0] bg-white p-5 shadow-[0_1px_2px_rgba(20,32,55,.03)] sm:p-6">
          <h2 className="text-base font-semibold text-[#172033]">Create an enrollment link</h2>
          <p className="mb-5 mt-1 text-sm leading-6 text-[#758198]">The link expires after 24 hours and can be claimed once by a device.</p>

          <div className="space-y-4">
            {currentLink ? (
              <div className="break-all rounded-md border border-[#d8e0ea] bg-[#f8fafc] p-3 font-mono text-xs leading-5 text-[#29344a]">
                {currentLink}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-[#d8e0ea] bg-[#f8fafc] p-3 text-sm text-[#758198]">
                A new enrollment link will appear here.
              </div>
            )}
            <div className="flex gap-3">
              <button type="button"
                onClick={copyLink}
                disabled={!currentLink}
                className="h-10 flex-1 rounded-md bg-[#315fe8] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#254fc9] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Copy Link
              </button>
              <button type="button"
                onClick={generateLink}
                disabled={loading}
                className="h-10 flex-1 rounded-md border border-[#d8e0ea] bg-white px-4 text-sm font-medium text-[#29344a] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate New Link'}
              </button>
            </div>
          </div>
          {copyMessage && <p role="status" className="mt-3 text-xs text-[#526078]">{copyMessage}</p>}
        </div>

        <div className="rounded-lg border border-[#e4e9f0] bg-white p-5 shadow-[0_1px_2px_rgba(20,32,55,.03)] sm:p-6">
          <h2 className="text-base font-semibold text-[#172033]">Offline installer</h2>
          <p className="mb-5 mt-1 text-sm leading-6 text-[#758198]">USB and offline deployment packaging is not available yet.</p>

          <div className="flex min-h-[124px] items-center justify-center rounded-md border border-dashed border-[#d8e0ea] bg-[#f8fafc]">
            <span className="rounded-md border border-[#e4e9f0] bg-white px-3 py-2 text-xs font-medium text-[#758198]">Not available yet</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e4e9f0] bg-white shadow-[0_1px_2px_rgba(20,32,55,.03)]">
        <div className="border-b border-[#edf0f4] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#172033]">Enrollment sessions</h2><p className="mt-0.5 text-xs text-[#758198]">Links issued for this organization</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f8fafc] text-[10px] font-semibold uppercase tracking-[.1em] text-[#758198]">
              <tr>
                <th scope="col" className="px-5 py-3">Session</th>
                <th scope="col" className="px-4 py-3">Device</th>
                <th scope="col" className="px-4 py-3">Created</th>
                <th scope="col" className="px-4 py-3">Expires</th>
                <th scope="col" className="px-5 py-3 text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#758198]">
                    No enrollment sessions yet.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="border-b border-[#edf0f4] transition-colors last:border-0 hover:bg-[#fafbfd]">
                    <td className="px-5 py-3.5 font-mono text-xs font-medium text-[#29344a]">{session.code}</td>
                    <td className="px-4 py-3.5 text-sm text-[#526078]">
                      {session.devices ? session.devices.name || session.devices.hostname : 'Not enrolled'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#526078]">{formatDate(session.created_at)}</td>
                    <td className="px-4 py-3.5 text-xs text-[#526078]">{getTimeRemaining(session.expires_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${session.used_at ? 'bg-[#f1f4f8] text-[#526078]' : new Date(session.expires_at) <= new Date() ? 'bg-[#fff3e1] text-[#80520e]' : 'bg-[#eaf7f1] text-[#176b51]'}`}>{session.used_at ? 'Claimed' : new Date(session.expires_at) <= new Date() ? 'Expired' : 'Available'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
