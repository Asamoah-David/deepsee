'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SidebarProps { orgName: string; plan: string; }
const groups = [
  { title: 'Workspace', links: [['/', 'Overview'], ['/devices', 'Devices'], ['/live-wall', 'Live wall']] },
  { title: 'Operations', links: [['/remote-sessions', 'Remote sessions'], ['/files', 'File transfers'], ['/applications', 'Applications'], ['/monitoring', 'Monitoring'], ['/diagnostics', 'Diagnostics']] },
  { title: 'Response', links: [['/activity', 'Activity'], ['/incidents', 'Incidents'], ['/alerts', 'Alerts'], ['/support', 'Support']] },
  { title: 'Management', links: [['/automation', 'Automation'], ['/deployments', 'Deployments'], ['/policies', 'Policies'], ['/reports', 'Reports']] },
  { title: 'Administration', links: [['/enrollment', 'Enrollment'], ['/users', 'Members'], ['/organization', 'Organization'], ['/audit', 'Audit log'], ['/security', 'Security'], ['/ai', 'AI operations'], ['/settings', 'Settings']] },
] as const;

function Brand() {
  return <Link href="/" className="flex items-center gap-3 no-underline" aria-label="DeepSee overview">
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white text-sm font-bold">D</span>
    <span className="text-[15px] font-semibold tracking-tight text-white">DeepSee</span>
  </Link>;
}

export function Sidebar({ orgName, plan }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <aside className="z-40 flex w-full flex-col border-b border-slate-700 bg-[#111b2e] text-white md:h-screen md:w-[248px] md:flex-shrink-0 md:border-b-0 md:border-r md:border-slate-700">
    <div className="flex min-h-[64px] items-center justify-between px-5 md:h-[72px] md:border-b md:border-slate-700/80">
      <Brand />
      <button type="button" aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 md:hidden">
        {open ? 'Close menu' : 'Menu'}
      </button>
    </div>
    <div className="hidden border-b border-slate-700/80 px-5 py-4 md:block">
      <div className="text-[11px] font-medium uppercase tracking-[.12em] text-slate-400">Workspace</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-slate-100">{orgName}</span>
        <span className="rounded border border-slate-600 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">{plan}</span>
      </div>
    </div>
    <nav id="primary-navigation" aria-label="Primary navigation" className={`${open ? 'block' : 'hidden'} max-h-[70vh] overflow-y-auto px-3 py-3 md:block md:max-h-none md:flex-1 md:py-4`}>
      {groups.map((group) => <div key={group.title} className="mb-4">
        <h2 className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[.15em] text-slate-500">{group.title}</h2>
        <div className="space-y-0.5">
          {group.links.map(([href, label]) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
              className={`flex h-9 items-center rounded-md px-3 text-[13px] transition-colors ${active ? 'bg-blue-500/15 font-semibold text-blue-200 ring-1 ring-inset ring-blue-400/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <span className={`mr-3 h-1.5 w-1.5 rounded-full ${active ? 'bg-blue-400' : 'bg-slate-600'}`} aria-hidden="true" />{label}
            </Link>;
          })}
        </div>
      </div>)}
    </nav>
    <div className="hidden border-t border-slate-700/80 px-5 py-3 text-[11px] text-slate-500 md:block">Secure device operations</div>
  </aside>;
}
