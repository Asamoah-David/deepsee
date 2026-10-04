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

      // Check if user has any organizations
      const { data: { user } } = await supabase.auth.getUser();
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
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 p-8 bg-surface rounded-lg border border-border">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">DeepSee</h1>
          <p className="text-sm text-text-secondary mt-2">Command Center Login</p>
        </div>

        {error && (
          <div className="bg-status-critical/10 border border-status-critical text-status-critical p-3 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-surface-2 border border-border rounded focus:outline-none focus:border-accent text-text-primary transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-surface-2 border border-border rounded focus:outline-none focus:border-accent text-text-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full p-2 bg-accent hover:bg-accent-hover text-white rounded font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign in'}
          </button>
        </form>

        <div className="text-center text-sm text-text-secondary">
          Don&apos;t have an account? <Link href="/register" className="text-accent hover:underline">Register</Link>
        </div>
      </div>
    </div>
  );
}
