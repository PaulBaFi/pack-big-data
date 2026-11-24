import type { APIRoute } from 'astro';
import { getPool, closePool } from '@/lib/db';

export const prerender = false;
export const maxDuration = 30;

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
  } finally {
    await closePool();
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const pool = getPool();

    // Soporte para operaciones en lote (transacción o múltiples tablas)
    if (Array.isArray(body.operations)) {
      const inserted: any[] = [];
      for (const op of body.operations) {
        const { table, row } = op;
        if (!table || !row || !/^[a-zA-Z0-9_]+$/.test(table)) continue;
        const keys = Object.keys(row);
        if (keys.length === 0) continue;
        const colNames = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map((k) => row[k]);
        const query = `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) RETURNING *`;
        const res = await pool.query(query, values);
        inserted.push({ table, row: res.rows[0] || row });
      }
      return new Response(JSON.stringify({ ok: true, inserted }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { table, row, rows } = body;

    if (!table || !/^[a-zA-Z0-9_]+$/.test(table)) {
      return new Response(JSON.stringify({ error: 'Invalid table' }), { status: 400 });
    }

    // Soporte para múltiples filas de una misma tabla
    if (Array.isArray(rows) && rows.length > 0) {
      const insertedRows: any[] = [];
      for (const r of rows) {
        const keys = Object.keys(r);
        if (keys.length === 0) continue;
        const colNames = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map((k) => r[k]);
        const query = `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) RETURNING *`;
        const res = await pool.query(query, values);
        insertedRows.push(res.rows[0] || r);
      }
      return new Response(JSON.stringify({ ok: true, inserted: insertedRows }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fila individual
    if (!row) {
      return new Response(JSON.stringify({ error: 'Row is required' }), { status: 400 });
    }

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
  } finally {
    await closePool();
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { table, keyField, keyValue, updates } = body;

    if (!table || !keyField || keyValue === undefined || !updates || !/^[a-zA-Z0-9_]+$/.test(table) || !/^[a-zA-Z0-9_]+$/.test(keyField)) {
      return new Response(JSON.stringify({ error: 'Invalid update parameters' }), { status: 400 });
    }

    const pool = getPool();
    const updateKeys = Object.keys(updates);
    if (updateKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No update fields provided' }), { status: 400 });
    }

    const setClauses = updateKeys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = updateKeys.map((k) => updates[k]);
    values.push(keyValue);

    const query = `UPDATE "${table}" SET ${setClauses} WHERE "${keyField}" = $${values.length} RETURNING *`;
    const res = await pool.query(query, values);

    return new Response(JSON.stringify({ ok: true, updated: res.rows[0] || updates }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await closePool();
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { table, keyField, keyValue } = body;

    if (!table || !keyField || keyValue === undefined || !/^[a-zA-Z0-9_]+$/.test(table) || !/^[a-zA-Z0-9_]+$/.test(keyField)) {
      return new Response(JSON.stringify({ error: 'Invalid delete parameters' }), { status: 400 });
    }

    const pool = getPool();
    const query = `DELETE FROM "${table}" WHERE "${keyField}" = $1 RETURNING *`;
    const res = await pool.query(query, [keyValue]);

    return new Response(JSON.stringify({ ok: true, deleted: res.rows[0] || { [keyField]: keyValue } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await closePool();
  }
};
