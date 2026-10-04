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
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const revokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this enrollment session?')) return;

    try {
      const response = await fetch(`/api/enrollment/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to revoke session');
      await fetchSessions();
    } catch (err) {
      console.error('Revoke session error:', err);
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
        <h1 className="text-2xl font-bold tracking-tight">Device Enrollment</h1>
      </div>

      {error && (
        <div className="bg-status-critical/10 border border-status-critical text-status-critical p-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Enrollment Link</h2>
          <p className="text-sm text-text-secondary mb-6">Generate a secure link to enroll a new Windows device into your organization.</p>

          <div className="space-y-4">
            {currentLink ? (
              <div className="bg-surface-2 p-3 rounded font-mono text-sm border border-border break-all">
                {currentLink}
              </div>
            ) : (
              <div className="bg-surface-2 p-3 rounded font-mono text-sm border border-border text-text-muted">
                No link generated yet
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={copyLink}
                disabled={!currentLink}
                className="flex-1 bg-accent hover:bg-accent-hover text-white py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                Copy Link
              </button>
              <button
                onClick={generateLink}
                disabled={loading}
                className="flex-1 bg-surface-3 hover:bg-border text-text-primary py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate New Link'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Offline Package</h2>
          <p className="text-sm text-text-secondary mb-6">Download a pre-configured installer package for USB deployment in isolated environments.</p>

          <div className="flex h-[132px] items-center justify-center border-2 border-dashed border-border rounded">
            <button
              onClick={generateLink}
              disabled={loading}
              className="bg-surface-3 hover:bg-border text-text-primary px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              Download Installer (.msi)
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Active Enrollment Sessions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-2 text-text-muted text-xs uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Session Code</th>
                <th className="px-6 py-3 font-medium">Device</th>
                <th className="px-6 py-3 font-medium">Created At</th>
                <th className="px-6 py-3 font-medium">Expires</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">
                    No active enrollment sessions
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium">{session.code}</td>
                    <td className="px-6 py-4 text-text-secondary">
                      {session.devices ? session.devices.name || session.devices.hostname : 'Not enrolled'}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">{formatDate(session.created_at)}</td>
                    <td className="px-6 py-4 text-status-warning">{getTimeRemaining(session.expires_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => revokeSession(session.id)}
                        className="text-status-critical hover:underline text-xs uppercase tracking-wider font-medium"
                      >
                        Revoke
                      </button>
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
