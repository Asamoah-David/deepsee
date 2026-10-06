'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  orgName: string;
  plan: string;
}

function NavSectionHeader({ title }: { title: string }) {
  return (
    <div className="px-3 pt-3 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
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
      className={`block px-3 py-2 text-xs font-mono rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}

export function Sidebar({ orgName, plan }: SidebarProps) {
  return (
    <aside className="w-[230px] bg-slate-900 border-r border-slate-800 h-screen flex flex-col flex-shrink-0 sticky top-0 overflow-y-auto select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
          <h1 className="text-base font-bold tracking-wider text-white font-mono uppercase">
            DEEPSEE
          </h1>
        </div>
        <div className="mt-2 flex items-center justify-between font-mono">
          <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
            {orgName}
          </span>
          <span className="text-[9px] bg-blue-500/10 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold">
            {plan}
          </span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="p-2 flex-grow space-y-1">
        <div>
          <NavSectionHeader title="Core Operations" />
          <NavLink href="/">Dashboard</NavLink>
          <NavLink href="/devices">Device Directory</NavLink>
          <NavLink href="/live-wall">Fleet Live Wall</NavLink>
        </div>

        <div className="border-t border-slate-800/80 pt-1">
          <NavSectionHeader title="Remote Operations" />
          <NavLink href="/remote-sessions">Active Sessions</NavLink>
          <NavLink href="/files">File Transfers</NavLink>
          <NavLink href="/applications">Software Inventory</NavLink>
          <NavLink href="/monitoring">Performance Telemetry</NavLink>
          <NavLink href="/diagnostics">System Diagnostics</NavLink>
        </div>

        <div className="border-t border-slate-800/80 pt-1">
          <NavSectionHeader title="Fleet Management" />
          <NavLink href="/activity">Activity Timeline</NavLink>
          <NavLink href="/incidents">Incident Center</NavLink>
          <NavLink href="/alerts">System Alerts</NavLink>
          <NavLink href="/support">IT Support Tickets</NavLink>
        </div>

        <div className="border-t border-slate-800/80 pt-1">
          <NavSectionHeader title="Automation & Control" />
          <NavLink href="/automation">Workflow Engine</NavLink>
          <NavLink href="/deployments">Software Deployments</NavLink>
          <NavLink href="/policies">Fleet Policies</NavLink>
          <NavLink href="/reports">Reports & Exports</NavLink>
        </div>

        <div className="border-t border-slate-800/80 pt-1">
          <NavSectionHeader title="Governance & Access" />
          <NavLink href="/enrollment">Device Enrollment</NavLink>
          <NavLink href="/users">Users & Roles</NavLink>
          <NavLink href="/organization">Organization Settings</NavLink>
          <NavLink href="/audit">Audit Center</NavLink>
          <NavLink href="/security">Security Dashboard</NavLink>
        </div>

        <div className="border-t border-slate-800/80 pt-1">
          <NavSectionHeader title="Intelligence" />
          <NavLink href="/ai">AI Assistant</NavLink>
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-800 bg-slate-900/50 mt-auto">
        <NavLink href="/settings">Settings</NavLink>
      </div>
    </aside>
  );
}
