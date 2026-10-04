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

      // Step 1: Create user account
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
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

      // Step 2: Create organization using admin client (service role)
      // We need to call an API route for this since we can't use service role from client
      const { error: orgError } = await fetch('/api/auth/create-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName,
          userId: user.id,
        }),
      }).then(res => res.json());

      if (orgError) {
        setError(orgError);
        return;
      }

      // Step 3: Sign in the user
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
          <p className="text-sm text-text-secondary mt-2">Create Organization Account</p>
        </div>

        {error && (
          <div className="bg-status-critical/10 border border-status-critical text-status-critical p-3 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary" htmlFor="orgName">Organization Name</label>
            <input
              id="orgName"
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full p-2 bg-surface-2 border border-border rounded focus:outline-none focus:border-accent text-text-primary transition-colors"
            />
          </div>
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
              minLength={6}
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
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div className="text-center text-sm text-text-secondary">
          Already have an account? <Link href="/login" className="text-accent hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
}
