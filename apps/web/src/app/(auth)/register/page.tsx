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
      console.log('Starting registration...');
      const supabase = createClient();
      console.log('Supabase client created');

      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
      });

      console.log('Sign up result:', { user, signUpError });

      if (signUpError) {
        console.error('Sign up error:', signUpError);
        setError(signUpError.message);
        return;
      }

      if (!user) {
        console.error('No user returned from sign up');
        setError('Failed to create user account');
        return;
      }

      console.log('Creating organization for user:', user.id);
      const orgResponse = await fetch('/api/auth/create-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName,
        }),
      });

      console.log('Organization API response status:', orgResponse.status);
      const orgData = await orgResponse.json();
      console.log('Organization API result:', orgData);

      if (orgData.error) {
        console.error('Organization creation error:', orgData.error);
        setError(`Organization creation failed: ${orgData.error}`);
        return;
      }

      console.log('Signing in...');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Sign in result:', { signInError });

      if (signInError) {
        console.error('Sign in error:', signInError);
        setError('Account created but failed to sign in. Please try logging in.');
        return;
      }

      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Redirecting to dashboard...');
      router.push('/');
      router.refresh();
    } catch (_err) {
      console.error('Unexpected error:', _err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-950 text-slate-100">
      {/* Left Column: Brand Overview */}
      <div className="hidden lg:flex lg:col-span-7 bg-slate-900 border-r border-slate-800 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
            <h1 className="text-xl font-bold font-mono tracking-wider uppercase text-white">
              DEEPSEE
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Enterprise Device Operations Platform
          </p>
        </div>

        <div className="space-y-6 relative z-10 max-w-lg">
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight font-sans">
            Register Your Organization Command Center
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed font-sans">
            Provision isolated multi-tenant organization workspaces, invite IT technicians, establish
            security policies, and connect your Windows computers in under 60 seconds.
          </p>

          <div className="space-y-3 font-mono text-xs text-slate-400 border-t border-slate-800 pt-4">
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

        <div className="text-xs font-mono text-slate-500 relative z-10">
          Command Center Registration • Immediate Deployment
        </div>
      </div>

      {/* Right Column: Register Form */}
      <div className="col-span-1 lg:col-span-5 flex items-center justify-center p-10 bg-slate-950">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Create Organization</h2>
            <p className="text-sm text-slate-400 mt-2">
              Setup your primary administrator account and company domain workspace.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg text-sm font-mono">
              [ERROR] {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5 font-sans">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-slate-300" htmlFor="orgName">
                ORGANIZATION NAME
              </label>
              <input
                id="orgName"
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Corporation"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-slate-300" htmlFor="email">
                ADMINISTRATOR WORK EMAIL
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
              <label className="text-xs font-mono font-medium text-slate-300" htmlFor="password">
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
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? 'PROVISIONING...' : 'REGISTER & START ENROLLMENT'}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-800 text-center text-xs font-mono text-slate-400">
            Already have an organization?{' '}
            <Link href="/login" className="text-blue-400 hover:underline font-bold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
