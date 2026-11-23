import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';

export const prerender = false;

const TABLES = [
  'PERSONA', 'CLIENTE', 'EMPRESA', 'CATEGORIA', 'PRODUCTO',
  'MESAS', 'PEDIDOS', 'DETALLE_PEDIDO', 'AREA', 'VENTAS',
  'METODO_PAGO', 'BOLETA', 'FACTURA', 'DEUDA_GENERADA', 'INGRESO',
  'BANCO', 'EGRESO', 'EMPLEADO', 'CARGO', 'CONTRATO',
  'USUARIO', 'TIPO_USUARIO', 'DEPARTAMENTO', 'PROVINCIA', 'DISTRITO'
];

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const table = url.searchParams.get('table');
    const pool = getPool();

    if (table) {
      if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        return new Response(JSON.stringify({ error: 'Invalid table' }), { status: 400 });
      }
      const res = await pool.query(`SELECT * FROM "${table}"`);
      return new Response(JSON.stringify({ ok: true, data: res.rows }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load all tables sequentially to conserve connection slots
    const fullDb: Record<string, any[]> = {};
    for (const tbl of TABLES) {
      try {
        const r = await pool.query(`SELECT * FROM "${tbl}"`);
        fullDb[tbl] = r.rows;
      } catch (e: any) {
        console.error(`Error querying table ${tbl}:`, e?.message);
        fullDb[tbl] = [];
      }
    }

    return new Response(JSON.stringify({ ok: true, data: fullDb }), {
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

    if (!table || !row || !/^[a-zA-Z0-9_]+$/.test(table)) {
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

    const query = `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) RETURNING *`;
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
