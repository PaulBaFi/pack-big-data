import type { APIRoute } from 'astro';
import { getSourcePreview } from '../../../lib/sources-monitor';

export const GET: APIRoute = async ({ url }) => {
  try {
    const source = url.searchParams.get('source') || 'castillonv2';
    const preview = await getSourcePreview(source);
    return new Response(JSON.stringify(preview), {
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
