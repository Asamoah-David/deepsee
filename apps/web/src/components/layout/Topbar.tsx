'use client';

import { createClient } from '@/lib/supabase/client';
import { usePathname, useRouter } from 'next/navigation';

interface TopbarProps { user: { email: string } }
const titles: Record<string, string> = {
  '/': 'Overview', '/devices': 'Devices', '/live-wall': 'Live wall', '/remote-sessions': 'Remote sessions',
  '/files': 'File transfers', '/applications': 'Applications', '/monitoring': 'Monitoring', '/diagnostics': 'Diagnostics',
  '/activity': 'Activity', '/incidents': 'Incidents', '/alerts': 'Alerts', '/support': 'Support', '/automation': 'Automation',
  '/deployments': 'Deployments', '/policies': 'Policies', '/reports': 'Reports', '/enrollment': 'Enrollment', '/users': 'Members',
  '/organization': 'Organization', '/audit': 'Audit log', '/security': 'Security', '/ai': 'AI operations', '/settings': 'Settings',
};

export function Topbar({ user }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const title = Object.entries(titles).find(([route]) => route === '/' ? pathname === '/' : pathname.startsWith(route))?.[1] ?? 'Device details';
  const email = user.email || 'Account';
  const initials = (email.split('@')[0] ?? 'U').split(/[._-]/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return <header className="sticky top-0 z-30 flex min-h-[64px] items-center justify-between gap-4 border-b border-[#e4e9f0] bg-white/95 px-4 backdrop-blur md:h-[72px] md:px-8">
    <div className="min-w-0">
      <div className="text-[11px] font-medium text-[#758198]">Command Center</div>
      <h1 className="truncate text-[17px] font-semibold tracking-tight text-[#172033]">{title}</h1>
    </div>
    <div className="flex items-center gap-3 md:gap-5">
      <div className="hidden min-w-[230px] items-center gap-2 rounded-md border border-[#e4e9f0] bg-[#f8fafc] px-3 py-2 text-xs text-[#758198] lg:flex" aria-label="Search is not available yet">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.7"><circle cx="8.7" cy="8.7" r="5.5"/><path d="m13 13 4 4"/></svg>
        <span>Search unavailable</span>
      </div>
      <div className="flex items-center gap-2 border-l border-[#e4e9f0] pl-3 md:pl-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf2ff] text-xs font-semibold text-[#315fe8]" aria-hidden="true">{initials}</div>
        <div className="hidden max-w-[190px] md:block">
          <div className="truncate text-xs font-medium text-[#29344a]">{email}</div>
          <button type="button" onClick={handleLogout} className="mt-0.5 text-[11px] text-[#758198] hover:text-[#315fe8]">Sign out</button>
        </div>
        <button type="button" onClick={handleLogout} className="rounded px-2 py-1 text-xs text-[#526078] hover:bg-[#f1f4f8] md:hidden" aria-label="Sign out">Exit</button>
      </div>
    </div>
  </header>;
}
