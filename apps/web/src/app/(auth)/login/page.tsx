'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: memberships } = await supabase
          .from('memberships')
          .select('org_id')
          .eq('user_id', user.id)
          .limit(1);

        if (memberships && memberships.length > 0) {
          router.push('/');
          router.refresh();
        } else {
          setError('No organization found. Please contact your administrator.');
        }
      }
    } catch (_err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#0a0c10] text-[#f0f2f7]">
      {/* Left Column: Hero Brand Panel */}
      <div className="hidden lg:flex lg:col-span-7 bg-[#0f1219] border-r border-[#1e2330] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
            <h1 className="text-xl font-bold font-mono tracking-wider uppercase text-white">
              DEEPSEE
            </h1>
          </div>
          <p className="text-xs font-mono text-[#8b93b0] mt-1">
            Universal Windows Device Operations Platform
          </p>
        </div>

        <div className="space-y-6 relative z-10 max-w-lg">
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight font-sans">
            Centralized Command &amp; Real-Time Desktop Control for Windows Fleets
          </h2>
          <p className="text-sm text-[#8b93b0] leading-relaxed font-sans">
            Manage, monitor, troubleshoot, and automate thousands of Windows endpoints securely
            from a single multi-tenant Command Center.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1e2330] font-mono text-xs text-[#8b93b0]">
            <div className="bg-[#151923] p-3 rounded border border-[#222736]">
              <div className="text-indigo-400 font-bold">SUB-30MS</div>
              <div className="text-[11px] mt-0.5">Stream Latency</div>
            </div>
            <div className="bg-[#151923] p-3 rounded border border-[#222736]">
              <div className="text-emerald-400 font-bold">ZERO-TRUST</div>
              <div className="text-[11px] mt-0.5">Device Keypairs</div>
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-[#545c7a] relative z-10">
          Command Center v1.4.0 • Enterprise Edition
        </div>
      </div>

      {/* Right Column: Sleek Auth Form */}
      <div className="col-span-1 lg:col-span-5 flex items-center justify-center p-8 bg-[#0a0c10]">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Sign In</h2>
            <p className="text-xs font-mono text-[#8b93b0] mt-1">
              Enter your administrator credentials to access your Command Center.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded text-xs font-mono">
              [ERROR] {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5 font-sans">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-[#c0c6d8]" htmlFor="email">
                WORK EMAIL
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full px-3.5 py-2.5 bg-[#121620] border border-[#222736] rounded-md text-sm text-white placeholder-[#545c7a] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-medium text-[#c0c6d8]" htmlFor="password">
                  PASSWORD
                </label>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-[#121620] border border-[#222736] rounded-md text-sm text-white placeholder-[#545c7a] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-mono uppercase tracking-wider font-semibold transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {loading ? 'AUTHENTICATING...' : 'SIGN IN TO COMMAND CENTER'}
            </button>
          </form>

          <div className="pt-6 border-t border-[#1e2330] text-center text-xs font-mono text-[#8b93b0]">
            Don&apos;t have an organization account?{' '}
            <Link href="/register" className="text-indigo-400 hover:underline font-bold">
              Register Organization
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
