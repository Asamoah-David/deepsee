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

  if (error || !memberships || memberships.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-5 text-[#172033]">
        <div className="w-full max-w-md rounded-xl border border-[#e4e9f0] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff7e8] text-lg font-semibold text-[#ad6b12]">!</div>
          <h1 className="text-xl font-semibold tracking-tight">Workspace unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-[#526078]">
            This account is not connected to an organization workspace yet.
          </p>
          <a
            href="/register"
            className="mt-6 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-[#315fe8] px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#254fc9]"
          >
            Create an organization
          </a>
        </div>
      </div>
    );
  }

  const membership = memberships[0];
  const orgName = membership?.organizations?.name || 'Unknown Organization';
  const plan = membership?.organizations?.plan || 'free';

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#f5f7fa] text-[#172033] antialiased md:h-screen md:flex-row">
      <Sidebar orgName={orgName} plan={plan} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar user={{ email: user.email || '' }} />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
