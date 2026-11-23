import type { APIRoute } from 'astro';
import { runEtlPipeline } from '../../../lib/etl-engine';

export const GET: APIRoute = async () => {
  try {
    console.log('[Vercel Cron] Iniciando ejecución programada del pipeline ETL...');
    const result = await runEtlPipeline('CRON_VERCEL', 'system_cron@vercel');

    return new Response(
      JSON.stringify({
        message: 'Ejecución programada de ETL finalizada',
        result,
      }),
      { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = GET;
