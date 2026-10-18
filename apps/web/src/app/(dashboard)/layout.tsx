import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface OrgMembership {
  org_id: string;
  role: string;
  organizations: {
    name: string;
    plan: string;
  } | null;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: rawMemberships, error } = await supabase
    .from('memberships')
    .select('org_id, role, organizations(name, plan)')
    .eq('user_id', user.id)
    .limit(1);

  const memberships = rawMemberships as unknown as OrgMembership[] | null;

  console.log('Dashboard layout - User:', user.id, 'Memberships:', memberships, 'Error:', error);

  if (error || !memberships || memberships.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="max-w-md space-y-6 p-8 bg-slate-900 rounded-xl border border-slate-800 text-center shadow-lg">
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">NO ORGANIZATION FOUND</h1>
          <p className="text-sm text-slate-400 font-sans">
            Your account is not associated with any active organization workspace.
          </p>
          <a
            href="/register"
            className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-mono text-sm font-semibold uppercase tracking-wider transition-colors no-underline"
          >
            Create Organization Workspace
          </a>
        </div>
      </div>
    );
  }

  const membership = memberships[0];
  const orgName = membership?.organizations?.name || 'Unknown Organization';
  const plan = membership?.organizations?.plan || 'free';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 min-h-screen antialiased">
      <Sidebar orgName={orgName} plan={plan} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar user={{ email: user.email || '' }} />
        <main className="flex-1 overflow-y-auto p-6 container mx-auto max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
