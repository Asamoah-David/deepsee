import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has any organization memberships
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('org_id, role, organizations(name, plan)')
    .eq('user_id', user.id)
    .limit(1) as any;

  if (error || !memberships || memberships.length === 0) {
    // User has no organization - show a setup state
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="max-w-md space-y-4 p-8 bg-surface rounded-lg border border-border text-center">
          <h1 className="text-2xl font-bold">No Organization Found</h1>
          <p className="text-text-secondary">
            Your account is not associated with any organization. Please contact your administrator
            or create a new organization.
          </p>
          <Link
            href="/register"
            className="block w-full p-2 bg-accent hover:bg-accent-hover text-white rounded font-medium transition-colors text-center"
          >
            Create Organization
          </Link>
        </div>
      </div>
    );
  }

  const membership = memberships && memberships.length > 0 ? memberships[0] : null;
  const orgName = (membership as any)?.organizations?.name || 'Unknown Organization';
  const plan = (membership as any)?.organizations?.plan || 'free';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar orgName={orgName} plan={plan} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar user={{ email: user.email || '' }} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
