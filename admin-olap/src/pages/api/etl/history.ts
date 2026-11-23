import type { APIRoute } from 'astro';
import { query } from '../../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const res = await query(
      `SELECT id_log, fecha_inicio, fecha_fin, duracion_segundos, estado,
              filas_castillonv2, filas_veterinaria, filas_samar, filas_siga,
              total_filas_cargadas, mensaje_error, ejecutado_por
       FROM etl_log_ejecucion
       ORDER BY id_log DESC
       LIMIT 25;`,
      [],
      'dw_olap'
    );

    return new Response(JSON.stringify(res.rows), {
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
