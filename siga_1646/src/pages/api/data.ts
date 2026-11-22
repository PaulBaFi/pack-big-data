import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const table = url.searchParams.get('table');

    if (!table) {
      return new Response(JSON.stringify({ error: 'Missing table parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return new Response(JSON.stringify({ error: 'Invalid table name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pool = getPool();
    const result = await pool.query(`SELECT * FROM "${table}" LIMIT 500`);

    return new Response(JSON.stringify({ ok: true, count: result.rows.length, data: result.rows }), {
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

    if (!table || !row) {
      return new Response(JSON.stringify({ error: 'Missing table or row' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return new Response(JSON.stringify({ error: 'Invalid table name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pool = getPool();
    const keys = Object.keys(row);
    if (keys.length === 0) {
      return new Response(JSON.stringify({ error: 'Row is empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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
