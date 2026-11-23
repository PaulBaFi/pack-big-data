import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';

export const prerender = false;

const TABLE_MAP: Record<string, string> = {
  articulos: 'ARTICULOS',
  clientes: 'CLIENTES',
  comunas: 'COMUNA',
  clientesBuey: 'ClientesBuey',
  detalleVentas: 'DETALLE_VENTA',
  provincias: 'PROVINCIA',
  prospectos: 'ProspectosClientesBuey',
  regiones: 'REGION',
  sucursales: 'SUCURSAL',
  vendedores: 'VENDEDORES',
  ventas: 'VENTAS',
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const tableParam = url.searchParams.get('table');
    const pool = getPool();

    if (tableParam) {
      const realTable = TABLE_MAP[tableParam] || tableParam;
      if (!/^[a-zA-Z0-9_]+$/.test(realTable)) {
        return new Response(JSON.stringify({ error: 'Invalid table' }), { status: 400 });
      }
      const res = await pool.query(`SELECT * FROM "${realTable}" LIMIT 1000`);
      return new Response(JSON.stringify({ ok: true, data: res.rows }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load main store entities sequentially to conserve connection slots
    const store: Record<string, any[]> = {};
    for (const [key, tbl] of Object.entries(TABLE_MAP)) {
      try {
        const limit = tbl === 'VENTAS' || tbl === 'DETALLE_VENTA' ? 200 : 1000;
        const r = await pool.query(`SELECT * FROM "${tbl}" LIMIT ${limit}`);
        store[key] = r.rows;
      } catch (e: any) {
        console.error(`Error querying table ${tbl}:`, e?.message);
        store[key] = [];
      }
    }

    return new Response(JSON.stringify({ ok: true, data: store }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { table, row } = body;

    const realTable = TABLE_MAP[table] || table;
    if (!realTable || !row || !/^[a-zA-Z0-9_]+$/.test(realTable)) {
      return new Response(JSON.stringify({ error: 'Invalid table or record' }), { status: 400 });
    }

    const pool = getPool();
    const keys = Object.keys(row);
    if (keys.length === 0) {
      return new Response(JSON.stringify({ error: 'Row is empty' }), { status: 400 });
    }

    const colNames = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((k) => row[k]);

    const query = `INSERT INTO "${realTable}" (${colNames}) VALUES (${placeholders}) RETURNING *`;
    const res = await pool.query(query, values);

    return new Response(JSON.stringify({ ok: true, inserted: res.rows[0] || row }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
