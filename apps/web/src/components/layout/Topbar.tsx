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
    <header className="h-[52px] bg-surface border-b border-border flex items-center justify-between px-4 sticky top-0 z-10 w-full flex-shrink-0 select-none">
      <div className="flex-1 max-w-md">
        <input
          type="text"
          placeholder="Universal Search (e.g. PC-017, 'low storage', john.doe)..."
          className="w-full bg-surface-2 border border-border rounded px-3 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="flex items-center gap-5 text-xs font-mono">
        <div className="flex items-center gap-2 bg-surface-2/60 px-2.5 py-1 rounded border border-border">
          <span className="dot dot-online" />
          <span className="text-text-muted">Control Plane:</span>
          <span className="text-status-online font-bold">ONLINE</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-text-muted">Active Sessions:</span>
          <span className="text-text-primary font-bold">0</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-text-muted">Unresolved Alerts:</span>
          <span className="text-status-warning font-bold">0</span>
        </div>

        <div className="flex items-center gap-3 border-l border-border pl-4">
          <div className="w-7 h-7 rounded bg-surface-3 border border-border flex items-center justify-center text-text-primary font-bold text-xs font-mono">
            {initials}
          </div>
          <div className="hidden md:block text-[11px]">
            <div className="text-text-primary font-medium">{email}</div>
            <button
              onClick={handleLogout}
              className="text-text-muted hover:text-status-critical font-mono text-[10px] uppercase tracking-wider"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
