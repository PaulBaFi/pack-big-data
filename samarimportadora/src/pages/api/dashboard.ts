import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const client = await getPool().connect();
    try {
      const summary = await client.query('SELECT (SELECT count(*) FROM "VENTAS")::int ventas, COALESCE((SELECT sum("TOTAL_DOCUMENTO") FROM "VENTAS"),0)::numeric total, (SELECT count(*) FROM "CLIENTES")::int clientes, (SELECT count(*) FROM "ARTICULOS")::int articulos');
      const monthly = await client.query("SELECT to_char(date_trunc('month', \"FECHA\"), 'YYYY-MM') periodo, sum(\"TOTAL_DOCUMENTO\")::numeric total FROM \"VENTAS\" WHERE \"FECHA\" >= date_trunc('year', CURRENT_DATE) GROUP BY 1 ORDER BY 1");
      const sellers = await client.query('SELECT v."ID_VENDEDOR", concat_ws(\' \', ve."Nombre",ve."Apellido") nombre, sum(v."TOTAL_DOCUMENTO")::numeric total FROM "VENTAS" v LEFT JOIN "VENDEDORES" ve ON ve."ID_VENDEDOR"=v."ID_VENDEDOR" GROUP BY 1,2 ORDER BY total DESC LIMIT 10');
      return new Response(JSON.stringify({ ok: true, data: { summary: summary.rows[0], monthly: monthly.rows, sellers: sellers.rows } }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error?.message ?? 'No se pudieron calcular indicadores' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
