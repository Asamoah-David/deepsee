'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface TopbarProps {
  user: {
    email: string;
  };
}

export function Topbar({ user }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const email = user.email || 'user@company.com';
  const userPart = email.split('@')[0] ?? 'user';
  const parts = userPart.split('.');
  const initials = parts
    .map((n) => (n && n.length > 0 ? n.charAt(0).toUpperCase() : 'U'))
    .join('')
    .substring(0, 2);

  return (
    <header className="h-[56px] bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30 w-full flex-shrink-0 select-none">
      <div className="flex-1 max-w-md">
        <input
          type="text"
          placeholder="Universal Search (e.g. PC-017, 'low storage', john.doe)..."
          className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3.5 py-1.5 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-500"
        />
      </div>

      <div className="flex items-center gap-5 text-xs font-mono">
        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800">
          <span className="dot dot-online" />
          <span className="text-slate-400">Control Plane:</span>
          <span className="text-emerald-400 font-bold">ONLINE</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Active Sessions:</span>
          <span className="text-slate-100 font-bold">0</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Unresolved Alerts:</span>
          <span className="text-amber-400 font-bold">0</span>
        </div>

        <div className="flex items-center gap-3 border-l border-slate-800 pl-5">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-100 font-bold text-xs font-mono">
            {initials}
          </div>
          <div className="hidden md:block text-[11px]">
            <div className="text-slate-100 font-medium">{email}</div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 font-mono text-[10px] uppercase tracking-wider transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
