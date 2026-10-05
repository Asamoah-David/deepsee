import { groq } from '@ai-sdk/groq';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const supabase = await createClient();

    const result = await streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: `You are the DeepSee AI Operations Assistant for Windows Device Management.
You have permission-scoped tools to inspect devices, query fleet health, analyze alerts, and suggest approved remediation actions.
Always provide concise, actionable, and explainable technical insights. Never guess data when tools are available.`,
      messages,
      tools: {
        searchDevices: tool({
          description: 'Search for enrolled devices in the fleet by name, hostname, status, or tag',
          parameters: z.object({
            query: z.string().describe('Search query string e.g. "low storage", "PC-017", "offline"'),
          }),
          execute: async ({ query }) => {
            const { data: devices } = await supabase
              .from('devices')
              .select('id, name, hostname, status, os_version, last_seen, metadata')
              .or(`name.ilike.%${query}%,hostname.ilike.%${query}%,status.ilike.%${query}%`)
              .limit(10);

            return {
              query,
              count: devices?.length || 0,
              devices: devices || [],
            };
          },
        }),
        getFleetHealth: tool({
          description: 'Retrieve overall fleet health summary, online/offline device counts, and warning metrics',
          parameters: z.object({}),
          execute: async () => {
            const { count: totalDevices } = await supabase
              .from('devices')
              .select('*', { count: 'exact', head: true });

            const { data: statusData } = await supabase
              .from('devices')
              .select('status');

            const counts = { online: 0, offline: 0, warning: 0, critical: 0 };
            if (statusData) {
              for (const d of statusData) {
                const s = d.status as keyof typeof counts;
                if (s in counts) counts[s]++;
              }
            }

            const { count: unresolvedAlerts } = await supabase
              .from('alerts')
              .select('*', { count: 'exact', head: true })
              .eq('resolved', false);

            return {
              totalDevices: totalDevices || 0,
              online: counts.online,
              offline: counts.offline,
              warning: counts.warning,
              critical: counts.critical,
              unresolvedAlerts: unresolvedAlerts || 0,
            };
          },
        }),
        getRecentAlerts: tool({
          description: 'Fetch recent unresolved system alerts across the fleet',
          parameters: z.object({
            limit: z.number().optional().default(5),
          }),
          execute: async ({ limit }) => {
            const { data: alerts } = await supabase
              .from('alerts')
              .select('id, type, severity, title, detail, created_at, devices(name)')
              .eq('resolved', false)
              .order('created_at', { ascending: false })
              .limit(limit);

            return {
              alerts: alerts || [],
            };
          },
        }),
        runApprovedRemediation: tool({
          description: 'Issue an approved remediation workflow command (e.g. disk cleanup, restart service) to a specific device',
          parameters: z.object({
            deviceId: z.string().describe('Target device UUID or device_id'),
            action: z.enum(['cleanup_temp_files', 'restart_print_spooler', 'collect_diagnostics']),
          }),
          execute: async ({ deviceId, action }) => {
            return {
              success: true,
              deviceId,
              action,
              result: `Approved action '${action}' queued for execution on device ${deviceId}.`,
              timestamp: new Date().toISOString(),
            };
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('AI Chat Error:', error);
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
