import { groq } from '@ai-sdk/groq';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';

const requestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(4000),
  })).min(1).max(40),
});

export async function POST(req: Request) {
  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) return Response.json({ error: 'Invalid chat request' }, { status: 400 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });
    if (!serverEnv().GROQ_API_KEY) {
      return Response.json({ error: 'AI is not configured for this deployment' }, { status: 503 });
    }

    const result = await streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: `You are the DeepSee AI Operations Assistant for Windows Device Management.
You have read-only tools to inspect devices, query fleet health, and analyze alerts. Do not claim to execute actions. If a data tool fails, state that the information is unavailable.
Always provide concise, actionable, and explainable technical insights. Never guess data when tools are available.`,
      messages: parsed.data.messages,
      tools: {
        searchDevices: tool({
          description: 'Search for enrolled devices by device name',
          parameters: z.object({
            query: z.string().min(1).max(100).describe('Device name, hostname, or status'),
          }),
          execute: async ({ query }) => {
            const safeQuery = query.replace(/[\\%_]/g, '\\$&');
            const { data: devices } = await supabase
              .from('devices')
              .select('id, name, hostname, status, os_version, last_seen, metadata')
              .ilike('name', `%${safeQuery}%`)
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
            limit: z.number().int().min(1).max(20).optional().default(5),
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
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('AI Chat Error:', error);
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
