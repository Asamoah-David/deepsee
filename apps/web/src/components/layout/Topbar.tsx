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

  const email = user.email || 'user';
  const parts = email.split('@')[0].split('.');
  const initials = parts
    .map(n => (n && n.length > 0 ? n.charAt(0).toUpperCase() : 'U'))
    .join('')
    .substring(0, 2);

  return (
    <header className="h-[56px] bg-surface border-b border-border flex items-center justify-between px-4 sticky top-0 z-10 w-full flex-shrink-0">
      <div className="flex-1 max-w-md">
        <input
          type="text"
          placeholder="Search devices, incidents, users..."
          className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="text-text-secondary">
          <span className="text-text-primary font-medium">0</span> active sessions
        </div>
        <div className="text-text-secondary">
          <span className="text-status-warning font-medium">0</span> alerts
        </div>
        <div className="flex items-center gap-2 border-l border-border pl-4">
          <div className="w-8 h-8 rounded bg-surface-3 flex items-center justify-center text-text-primary font-medium">
            {initials}
          </div>
          <div className="hidden md:block text-xs">
            <div className="text-text-primary font-medium">{user.email}</div>
            <button
              onClick={handleLogout}
              className="text-text-muted hover:text-text-primary text-left"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
