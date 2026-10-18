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
      console.log('Starting login...');
      const supabase = createClient();
      console.log('Supabase client created');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Sign in result:', { signInError });

      if (signInError) {
        console.error('Sign in error:', signInError);
        setError(signInError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log('Got user:', user);

      if (user) {
        console.log('Fetching memberships for user:', user.id);
        const { data: memberships } = await supabase
          .from('memberships')
          .select('org_id')
          .eq('user_id', user.id)
          .limit(1);

        console.log('Memberships:', memberships);

        if (memberships && memberships.length > 0) {
          console.log('User has organization, redirecting to dashboard');
          router.push('/');
          router.refresh();
        } else {
          console.error('No organization found for user');
          setError('No organization found. Please register to create one.');
        }
      }
    } catch (_err) {
      console.error('Unexpected error:', _err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-950 text-slate-100">
      {/* Left Column: Hero Brand Panel */}
      <div className="hidden lg:flex lg:col-span-7 bg-slate-900 border-r border-slate-800 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
            <h1 className="text-xl font-bold font-mono tracking-wider uppercase text-white">
              DEEPSEE
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Universal Windows Device Operations Platform
          </p>
        </div>

        <div className="space-y-6 relative z-10 max-w-lg">
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight font-sans">
            Centralized Command &amp; Real-Time Desktop Control for Windows Fleets
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed font-sans">
            Manage, monitor, troubleshoot, and automate thousands of Windows endpoints securely
            from a single multi-tenant Command Center.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 font-mono text-xs text-slate-400">
            <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <div className="text-blue-400 font-bold">SUB-30MS</div>
              <div className="text-[11px] mt-0.5">Stream Latency</div>
            </div>
            <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <div className="text-emerald-400 font-bold">ZERO-TRUST</div>
              <div className="text-[11px] mt-0.5">Device Keypairs</div>
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-500 relative z-10">
          Command Center v1.4.0 • Enterprise Edition
        </div>
      </div>

      {/* Right Column: Sleek Auth Form */}
      <div className="col-span-1 lg:col-span-5 flex items-center justify-center p-10 bg-slate-950">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Sign In</h2>
            <p className="text-sm text-slate-400 mt-2">
              Enter your administrator credentials to access your Command Center.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg text-sm font-mono">
              [ERROR] {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5 font-sans">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-slate-300" htmlFor="email">
                WORK EMAIL
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-medium text-slate-300" htmlFor="password">
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
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? 'AUTHENTICATING...' : 'SIGN IN TO COMMAND CENTER'}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-800 text-center text-xs font-mono text-slate-400">
            Don&apos;t have an organization account?{' '}
            <Link href="/register" className="text-blue-400 hover:underline font-bold">
              Register Organization
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
