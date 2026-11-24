import type { APIRoute } from 'astro';
import { runEtlPipeline } from '../../../lib/etl-engine';

export const prerender = false;
export const maxDuration = 60; // 60 segundos permitidos en Vercel para ejecucion completa de ETL

export const POST: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user;
    const userEmail = user?.email || 'admin@bigdata.upsjb.edu.pe';

    const result = await runEtlPipeline('BOTON_MANUAL', userEmail);

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
