'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  orgName: string;
  plan: string;
}

function NavSectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-3 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted">
      {title}
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`block px-4 py-1.5 text-xs font-mono transition-colors ${
        isActive
          ? 'bg-surface-2 border-l-2 border-accent text-text-primary font-bold'
          : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary border-l-2 border-transparent'
      }`}
    >
      {children}
    </Link>
  );
}

export function Sidebar({ orgName, plan }: SidebarProps) {
  return (
    <aside className="w-[220px] bg-surface border-r border-border h-screen flex flex-col flex-shrink-0 sticky top-0 overflow-y-auto select-none">
      <div className="p-4 border-b border-border bg-surface-2/40">
        <h1 className="text-lg font-bold tracking-tight text-text-primary font-mono uppercase">
          DEEPSEE
        </h1>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] font-mono text-text-secondary truncate max-w-[120px]">
            {orgName}
          </span>
          <span className="text-[9px] font-mono bg-accent/10 border border-accent/30 text-accent px-1.5 py-0.5 rounded uppercase font-bold">
            {plan}
          </span>
        </div>
      </div>

      <div className="py-2 flex-grow space-y-1">
        <div>
          <NavSectionHeader title="Core Command" />
          <NavLink href="/">Dashboard</NavLink>
          <NavLink href="/devices">Device Directory</NavLink>
          <NavLink href="/live-wall">Fleet Live Wall</NavLink>
        </div>

        <div className="border-t border-border/60 pt-1">
          <NavSectionHeader title="Remote Operations" />
          <NavLink href="/remote-sessions">Active Sessions</NavLink>
          <NavLink href="/files">File Transfers</NavLink>
          <NavLink href="/applications">Software Inventory</NavLink>
          <NavLink href="/monitoring">Performance Telemetry</NavLink>
          <NavLink href="/diagnostics">System Diagnostics</NavLink>
        </div>

        <div className="border-t border-border/60 pt-1">
          <NavSectionHeader title="Fleet Management" />
          <NavLink href="/activity">Activity Timeline</NavLink>
          <NavLink href="/incidents">Incident Center</NavLink>
          <NavLink href="/alerts">System Alerts</NavLink>
          <NavLink href="/support">IT Support Tickets</NavLink>
        </div>

        <div className="border-t border-border/60 pt-1">
          <NavSectionHeader title="Automation & Control" />
          <NavLink href="/automation">Workflow Engine</NavLink>
          <NavLink href="/deployments">Software Deployments</NavLink>
          <NavLink href="/policies">Fleet Policies</NavLink>
          <NavLink href="/reports">Reports & Exports</NavLink>
        </div>

        <div className="border-t border-border/60 pt-1">
          <NavSectionHeader title="Governance & Access" />
          <NavLink href="/enrollment">Device Enrollment</NavLink>
          <NavLink href="/users">Users & Roles</NavLink>
          <NavLink href="/organization">Organization Settings</NavLink>
          <NavLink href="/audit">Audit Center</NavLink>
          <NavLink href="/security">Security Dashboard</NavLink>
        </div>

        <div className="border-t border-border/60 pt-1">
          <NavSectionHeader title="Intelligence" />
          <NavLink href="/ai">AI Assistant</NavLink>
        </div>
      </div>

      <div className="p-2 border-t border-border bg-surface-2/30 mt-auto">
        <NavLink href="/settings">Settings</NavLink>
      </div>
    </aside>
  );
}
