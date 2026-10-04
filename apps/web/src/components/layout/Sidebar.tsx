'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  orgName: string;
  plan: string;
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`block px-4 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-surface-2 border-l-2 border-accent text-text-primary font-medium'
          : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary border-l-2 border-transparent'
      }`}
    >
      {children}
    </Link>
  );
}

export function Sidebar({ orgName, plan }: SidebarProps) {
  return (
    <aside className="w-[240px] bg-surface border-r border-border h-screen flex flex-col flex-shrink-0 sticky top-0 overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">DeepSee</h1>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-text-muted uppercase tracking-wider truncate max-w-[120px]">{orgName}</span>
          <span className="text-[10px] bg-surface-3 px-1.5 py-0.5 rounded text-accent shrink-0">{plan.toUpperCase()}</span>
        </div>
      </div>
      
      <div className="py-2 flex-grow">
        <div className="mb-4">
          <NavLink href="/">Dashboard</NavLink>
          <NavLink href="/devices">Devices</NavLink>
          <NavLink href="/live-wall">Live Wall</NavLink>
        </div>
        
        <div className="mb-4 border-t border-border pt-2">
          <NavLink href="/remote-sessions">Remote Sessions</NavLink>
          <NavLink href="/files">Files</NavLink>
          <NavLink href="/applications">Applications</NavLink>
          <NavLink href="/monitoring">Monitoring</NavLink>
          <NavLink href="/diagnostics">Diagnostics</NavLink>
        </div>
        
        <div className="mb-4 border-t border-border pt-2">
          <NavLink href="/activity">Activity</NavLink>
          <NavLink href="/incidents">Incidents</NavLink>
          <NavLink href="/alerts">Alerts</NavLink>
          <NavLink href="/support">Support</NavLink>
        </div>
        
        <div className="mb-4 border-t border-border pt-2">
          <NavLink href="/automation">Automation</NavLink>
          <NavLink href="/deployments">Deployments</NavLink>
          <NavLink href="/policies">Policies</NavLink>
          <NavLink href="/reports">Reports</NavLink>
        </div>
        
        <div className="mb-4 border-t border-border pt-2">
          <NavLink href="/enrollment">Enrollment</NavLink>
          <NavLink href="/users">Users & Roles</NavLink>
          <NavLink href="/organization">Organization</NavLink>
        </div>
        
        <div className="border-t border-border pt-2">
          <NavLink href="/audit">Audit Logs</NavLink>
          <NavLink href="/security">Security</NavLink>
          <NavLink href="/ai">AI Assistant</NavLink>
        </div>
      </div>
      
      <div className="p-2 border-t border-border mt-auto">
        <NavLink href="/settings">Settings</NavLink>
      </div>
    </aside>
  );
}
