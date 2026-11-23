import type { APIRoute } from 'astro';
import { getSourcesStatus } from '../../../lib/sources-monitor';

export const GET: APIRoute = async () => {
  try {
    const data = await getSourcesStatus();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
