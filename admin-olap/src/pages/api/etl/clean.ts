import type { APIRoute } from 'astro';
import { cleanOlapDatabase } from '../../../lib/etl-engine';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    const userEmail = user?.email || 'admin@bigdata.upsjb.edu.pe';

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body opcional
    }

    const resetLogs = Boolean(body.resetLogs);
    const result = await cleanOlapDatabase({ resetLogs, userEmail });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
