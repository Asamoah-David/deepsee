'use client';

import { useState } from 'react';

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'apikeys' | 'webhooks'>('overview');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Center</h1>
          <p className="text-sm text-text-secondary mt-1">
            Zero-Trust device authentication, Multi-Factor Authentication (MFA), API access tokens, and webhook events.
          </p>
        </div>
      </div>

      <div className="flex border-b border-border">
        {(['overview', 'apikeys', 'webhooks'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${
              activeTab === tab ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'overview' ? 'Security Overview' : tab === 'apikeys' ? 'API Key Credentials' : 'Webhook Integration'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-surface border border-border p-5 rounded-lg">
            <div className="text-2xl font-mono font-bold text-status-online">100%</div>
            <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Encrypted Device Identity</div>
            <p className="text-xs text-text-muted mt-3">All 142 enrolled endpoints hold unique private RSA/ECDSA credentials.</p>
          </div>

          <div className="bg-surface border border-border p-5 rounded-lg">
            <div className="text-2xl font-mono font-bold text-status-online">MFA ENFORCED</div>
            <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Multi-Factor Authentication</div>
            <p className="text-xs text-text-muted mt-3">TOTP / Hardware Passkeys required for all organization administrators.</p>
          </div>

          <div className="bg-surface border border-border p-5 rounded-lg">
            <div className="text-2xl font-mono font-bold text-status-online">0</div>
            <div className="text-xs text-text-secondary uppercase tracking-wider mt-1">Failed Auth Attempts</div>
            <p className="text-xs text-text-muted mt-3">No suspicious authentication spikes detected in the past 24 hours.</p>
          </div>
        </div>
      )}

      {activeTab === 'apikeys' && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <div>
              <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Scoped API Keys</h2>
              <p className="text-xs text-text-muted">API credentials for ticket system and SIEM integrations.</p>
            </div>
            <button className="bg-accent text-white px-3 py-1.5 rounded text-xs font-medium">Create Scoped Key</button>
          </div>
          <div className="bg-surface-2 p-4 rounded border border-border flex justify-between items-center text-sm font-mono">
            <div>
              <div className="font-bold text-text-primary">SIEM_Integration_Key</div>
              <div className="text-xs text-text-muted mt-1">Scopes: [read:devices, read:metrics, read:audit]</div>
            </div>
            <button className="text-xs text-status-critical hover:underline">Revoke</button>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <div>
              <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Webhook Subscriptions</h2>
              <p className="text-xs text-text-muted">Receive HTTP POST notifications for fleet events.</p>
            </div>
            <button className="bg-accent text-white px-3 py-1.5 rounded text-xs font-medium">Add Webhook</button>
          </div>
          <div className="bg-surface-2 p-4 rounded border border-border flex justify-between items-center text-sm font-mono">
            <div>
              <div className="font-bold text-text-primary">https://hooks.company.com/deepsee-events</div>
              <div className="text-xs text-text-muted mt-1">Events: [device.offline, alert.created, incident.created]</div>
            </div>
            <span className="text-xs text-status-online bg-status-online/10 px-2 py-1 rounded">ACTIVE</span>
          </div>
        </div>
      )}
    </div>
  );
}
