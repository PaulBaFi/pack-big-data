import type { APIRoute } from 'astro';
import { runEtlPipeline } from '../../../lib/etl-engine';

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
