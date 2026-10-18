import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DeviceGroupsPanel from './DeviceGroupsPanel';

type Membership = { org_id: string; role: string };
type Organization = { id: string; name: string; slug: string; plan: string; created_at: string };

export default async function OrganizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rawMembership } = await supabase
    .from('memberships')
    .select('org_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  const membership = rawMembership as Membership | null;

  if (!membership) {
    return <section className="mx-auto max-w-3xl rounded-lg border border-[#e4e9f0] bg-white p-6">
      <h1 className="text-xl font-semibold text-[#172033]">Organization unavailable</h1>
      <p className="mt-2 text-sm text-[#526078]">This account is not connected to an organization workspace.</p>
      <Link href="/register" className="mt-4 inline-flex text-sm font-semibold text-[#315fe8]">Create an organization</Link>
    </section>;
  }

  const { data: rawOrganization, error } = await supabase
    .from('organizations')
    .select('id, name, slug, plan, created_at')
    .eq('id', membership.org_id)
    .maybeSingle();
  const organization = rawOrganization as Organization | null;

  if (error || !organization) {
    return <section role="alert" className="mx-auto max-w-3xl rounded-lg border border-[#f0c9cb] bg-white p-6">
      <h1 className="text-xl font-semibold text-[#172033]">Organization details unavailable</h1>
      <p className="mt-2 text-sm text-[#526078]">We could not load the organization associated with your session. Refresh the page or contact your workspace administrator.</p>
    </section>;
  }

  return <div className="mx-auto max-w-[1120px] space-y-6">
    <header>
      <p className="text-xs font-medium uppercase tracking-[.12em] text-[#758198]">Administration</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#172033]">Organization</h1>
      <p className="mt-1 text-sm text-[#758198]">Workspace identity, plan, and tenant-specific administration.</p>
    </header>

    <section aria-label="Organization overview" className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-[#e4e9f0] bg-white p-5 shadow-[0_1px_2px_rgba(20,32,55,.03)]">
        <p className="text-xs font-medium uppercase tracking-[.1em] text-[#758198]">Organization name</p>
        <p className="mt-2 text-lg font-semibold text-[#172033]">{organization.name}</p>
        <p className="mt-1 text-xs text-[#758198]">/{organization.slug}</p>
      </div>
      <div className="rounded-lg border border-[#e4e9f0] bg-white p-5 shadow-[0_1px_2px_rgba(20,32,55,.03)]">
        <p className="text-xs font-medium uppercase tracking-[.1em] text-[#758198]">Current plan</p>
        <p className="mt-2 text-lg font-semibold capitalize text-[#172033]">{organization.plan || 'Free'}</p>
        <p className="mt-1 text-xs text-[#758198]">Plan limits and billing controls are not available in this release.</p>
      </div>
      <div className="rounded-lg border border-[#e4e9f0] bg-white p-5 shadow-[0_1px_2px_rgba(20,32,55,.03)] sm:col-span-2">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[.1em] text-[#758198]">Organization ID</p><code className="mt-2 block break-all text-sm text-[#29344a]">{organization.id}</code></div>
          <div className="shrink-0"><p className="text-xs font-medium uppercase tracking-[.1em] text-[#758198]">Your role</p><p className="mt-2 text-sm font-semibold capitalize text-[#172033]">{membership.role.replace('_', ' ')}</p></div>
          <div className="shrink-0"><p className="text-xs font-medium uppercase tracking-[.1em] text-[#758198]">Created</p><p className="mt-2 text-sm text-[#29344a]">{new Date(organization.created_at).toLocaleDateString()}</p></div>
        </div>
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-[#e4e9f0] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#172033]">Workspace members</h2>
        <p className="mt-1 text-sm leading-6 text-[#758198]">Review access, role assignments, and membership changes for this organization.</p>
        <Link href="/users" className="mt-4 inline-flex h-9 items-center rounded-md bg-[#315fe8] px-3 text-sm font-semibold text-white no-underline hover:bg-[#254fc9]">Manage members</Link>
      </div>
      <div className="rounded-lg border border-[#e4e9f0] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#172033]">Member access scopes</h2>
        <p className="mt-1 text-sm leading-6 text-[#758198]">Assign members to departments and device groups from the workspace members page. Restricted scopes are enforced by database policies.</p>
        <Link href="/users" className="mt-4 inline-flex h-9 items-center rounded-md border border-[#d8e0ea] px-3 text-sm font-semibold text-[#29344a] no-underline hover:bg-[#f8fafc]">Configure member scopes</Link>
      </div>
      <DeviceGroupsPanel canManage={['owner', 'super_admin', 'admin'].includes(membership.role)} />
      <div className="rounded-lg border border-[#e4e9f0] bg-white p-5 lg:col-span-2">
        <h2 className="text-sm font-semibold text-[#172033]">MSP customer hierarchy</h2>
        <p className="mt-1 text-sm leading-6 text-[#758198]">This workspace currently operates as one organization. MSP customer switching and delegated tenant administration are not enabled.</p>
        <span className="mt-4 inline-flex rounded-full bg-[#f1f3f6] px-2.5 py-1 text-xs font-medium text-[#68758a]">Not configured</span>
      </div>
    </section>
  </div>;
}
