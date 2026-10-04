import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';

interface PageProps {
  params: {
    code: string;
  };
}

export default async function EnrollmentLandingPage({ params }: PageProps) {
  const supabase = await createAdminClient();

  // Validate enrollment code
  const { data: session, error } = await supabase
    .from('enrollment_sessions')
    .select('organizations(name), created_at, expires_at')
    .eq('code', params.code)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !session) {
    notFound();
  }

  const orgName = (session as any).organizations?.name || 'Unknown Organization';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl space-y-8 p-8 bg-surface rounded-lg border border-border">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">DeepSee</h1>
          <p className="text-sm text-text-secondary mt-2">Device Enrollment</p>
        </div>

        <div className="bg-surface-2 p-6 rounded-lg border border-border">
          <h2 className="text-lg font-semibold mb-2">Enroll this PC into {orgName}</h2>
          <p className="text-sm text-text-secondary mb-4">
            Download and run the DeepSee Agent to securely connect this Windows computer
            to your organization's Command Center.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <span className="dot dot-online" />
              <span>Secure connection with organization</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <span className="dot dot-online" />
              <span>Remote access and management</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <span className="dot dot-online" />
              <span>Real-time monitoring and alerts</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button
            className="w-full p-4 bg-accent hover:bg-accent-hover text-white rounded font-medium transition-colors text-lg"
            onClick={() => {
              // TODO: Download agent installer
              alert('Agent download will be implemented when agent build is ready');
            }}
          >
            Download DeepSee Agent
          </button>

          <p className="text-xs text-text-muted text-center">
            By downloading and running the agent, you agree to connect this device to {orgName}.
            The organization will be able to remotely manage this computer according to their policies.
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium mb-2">Manual Installation</h3>
          <div className="bg-surface-2 p-3 rounded font-mono text-sm border border-border">
            Enrollment Code: {params.code}
          </div>
          <p className="text-xs text-text-secondary mt-2">
            If automatic download doesn't work, save this code and enter it when prompted during manual installation.
          </p>
        </div>
      </div>
    </div>
  );
}
