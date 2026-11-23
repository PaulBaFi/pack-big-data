import type { APIRoute } from 'astro';
import { query } from '../../../lib/db';
import { logAdminAction } from '../../../lib/auth';

export const GET: APIRoute = async () => {
  try {
    const res = await query('SELECT * FROM etl_configuracion LIMIT 1;', [], 'dw_olap');
    const config = res.rows[0] || {
      frecuencia_sugerida: 'DIARIO',
      intervalo_horas: 24,
      permitir_ejecucion_manual: true,
    };
    return new Response(JSON.stringify(config), {
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

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { frecuencia, intervaloHoras, permitirManual } = body;

    const res = await query(
      `UPDATE etl_configuracion
       SET frecuencia_sugerida = COALESCE($1, frecuencia_sugerida),
           intervalo_horas = COALESCE($2, intervalo_horas),
           permitir_ejecucion_manual = COALESCE($3, permitir_ejecucion_manual),
           ultima_actualizacion = NOW()
       WHERE id = 1
       RETURNING *;`,
      [frecuencia, intervaloHoras, permitirManual],
      'dw_olap'
    );

    const user = locals.user;
    if (user) {
      await logAdminAction(user.id, user.email, 'ETL_CONFIG_CHANGE', { frecuencia, intervaloHoras, permitirManual });
    }

    return new Response(JSON.stringify({ success: true, config: res.rows[0] }), {
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
