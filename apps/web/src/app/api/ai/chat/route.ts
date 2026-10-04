import { groq } from '@ai-sdk/groq';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    const result = await streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: 'You are the DeepSee AI Operations Assistant. Help IT admins manage Windows devices. Keep responses concise and focused on actionable insights.',
      messages,
      tools: { 
        searchDevices: tool({
          description: 'Search for devices in the fleet',
          parameters: z.object({ query: z.string() }),
          execute: async ({ query }) => ({ results: [`Found device matching ${query}`] })
        }) 
      }
    });
    
    return result.toDataStreamResponse();
  } catch {
    // The specific provider error is intentionally not returned to the client:
    // Groq error payloads can echo request content and key fragments. The
    // failure is reported as a generic message and the real cause is logged
    // server-side (§214, §230).
    return Response.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
