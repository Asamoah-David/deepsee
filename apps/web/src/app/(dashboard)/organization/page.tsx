'use client';

import { useState } from 'react';

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'msp'>('overview');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization & Departments</h1>
          <p className="text-sm text-text-secondary mt-1">
            Tenant isolation settings, department hierarchy, device group scoping, and MSP multi-customer context.
          </p>
        </div>
      </div>

      <div className="flex border-b border-border">
        {(['overview', 'departments', 'msp'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${
              activeTab === tab ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'overview' ? 'Organization Overview' : tab === 'departments' ? 'Department Structure' : 'MSP Customer Hierarchy'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-text-secondary block mb-1">
                Organization Name
              </label>
              <input
                type="text"
                readOnly
                value="ABC Company"
                className="w-full bg-surface-2 border border-border rounded p-2 text-sm font-mono text-text-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-text-secondary block mb-1">
                Subscription Plan
              </label>
              <input
                type="text"
                readOnly
                value="BUSINESS (500 Devices)"
                className="w-full bg-surface-2 border border-border rounded p-2 text-sm font-mono text-accent font-bold"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-text-secondary mb-2">Tenant Isolation Details</h3>
            <p className="text-xs text-text-secondary mb-3">
              Server-side isolation enforced on all database queries and control plane socket connections.
            </p>
            <div className="bg-surface-2 p-3 rounded font-mono text-xs text-text-muted border border-border">
              Tenant ID: 8f4e9120-a241-4c12-881a-09d2a3f412ef
            </div>
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Departments</h2>
            <button className="bg-accent text-white px-3 py-1.5 rounded text-xs font-medium">Add Department</button>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Computer Lab A', devices: 24, admins: 2 },
              { name: 'Administration', devices: 12, admins: 4 },
              { name: 'IT Support', devices: 8, admins: 6 },
            ].map((d, i) => (
              <div key={i} className="bg-surface-2 p-4 rounded border border-border flex justify-between items-center text-sm">
                <div>
                  <div className="font-medium text-text-primary">{d.name}</div>
                  <div className="text-xs text-text-muted font-mono mt-0.5">{d.devices} Devices • {d.admins} Administrators</div>
                </div>
                <button className="text-xs text-accent hover:underline">Manage Scope</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'msp' && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">MSP Multi-Customer Switching</h2>
          <p className="text-xs text-text-secondary">
            Switch administrator context between independent customer tenants without cross-tenant leakage.
          </p>
          <div className="bg-surface-2 p-4 rounded border border-border font-mono text-xs text-text-secondary">
            Active Tenant: ABC Company (Current)
          </div>
        </div>
      )}
    </div>
  );
}
