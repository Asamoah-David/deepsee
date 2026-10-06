'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!user) {
        setError('Failed to create user account');
        return;
      }

      const { error: orgError } = await fetch('/api/auth/create-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName,
          userId: user.id,
        }),
      }).then((res) => res.json());

      if (orgError) {
        setError(orgError);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Account created but failed to sign in. Please try logging in.');
        return;
      }

      router.push('/');
      router.refresh();
    } catch (_err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#0a0c10] text-[#f0f2f7]">
      {/* Left Column: Brand Overview */}
      <div className="hidden lg:flex lg:col-span-7 bg-[#0f1219] border-r border-[#1e2330] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
            <h1 className="text-xl font-bold font-mono tracking-wider uppercase text-white">
              DEEPSEE
            </h1>
          </div>
          <p className="text-xs font-mono text-[#8b93b0] mt-1">
            Enterprise Device Operations Platform
          </p>
        </div>

        <div className="space-y-6 relative z-10 max-w-lg">
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight font-sans">
            Register Your Organization Command Center
          </h2>
          <p className="text-sm text-[#8b93b0] leading-relaxed font-sans">
            Provision isolated multi-tenant organization workspaces, invite IT technicians, establish
            security policies, and connect your Windows computers in under 60 seconds.
          </p>

          <div className="space-y-3 font-mono text-xs text-[#8b93b0] border-t border-[#1e2330] pt-4">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Full Multi-Tenant Data Isolation (RLS)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Cryptographic Endpoint Verification</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Zero SaaS Third-Party Hard Dependencies</span>
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-[#545c7a] relative z-10">
          Command Center Registration • Immediate Deployment
        </div>
      </div>

      {/* Right Column: Register Form */}
      <div className="col-span-1 lg:col-span-5 flex items-center justify-center p-8 bg-[#0a0c10]">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Create Organization</h2>
            <p className="text-xs font-mono text-[#8b93b0] mt-1">
              Setup your primary administrator account and company domain workspace.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded text-xs font-mono">
              [ERROR] {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5 font-sans">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-[#c0c6d8]" htmlFor="orgName">
                ORGANIZATION NAME
              </label>
              <input
                id="orgName"
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Corporation"
                className="w-full px-3.5 py-2.5 bg-[#121620] border border-[#222736] rounded-md text-sm text-white placeholder-[#545c7a] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-[#c0c6d8]" htmlFor="email">
                ADMINISTRATOR WORK EMAIL
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
              <label className="text-xs font-mono font-medium text-[#c0c6d8]" htmlFor="password">
                PASSWORD (MIN 6 CHARACTERS)
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
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
              {loading ? 'PROVISIONING...' : 'REGISTER & START ENROLLMENT'}
            </button>
          </form>

          <div className="pt-6 border-t border-[#1e2330] text-center text-xs font-mono text-[#8b93b0]">
            Already have an organization?{' '}
            <Link href="/login" className="text-indigo-400 hover:underline font-bold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
