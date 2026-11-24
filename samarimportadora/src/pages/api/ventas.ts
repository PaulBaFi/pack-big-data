import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
export const prerender = false;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const GET: APIRoute = async ({ request }) => {
  const client = await getPool().connect();
  try {
    const url = new URL(request.url), page = Math.max(1, Number(url.searchParams.get('page')) || 1), pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 25)), search = (url.searchParams.get('search') ?? '').trim();
    const values: unknown[] = [], where = search ? ' WHERE v."DOCUMENTO" ILIKE $1' : '';
    if (search) values.push(`%${search}%`);
    const count = await client.query(`SELECT count(*)::int total FROM "VENTAS" v${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const result = await client.query(`SELECT v.*, concat_ws(' ', c."NOMBRE", c."APELLIDO") "CLIENTE_NOMBRE", concat_ws(' ', ve."Nombre", ve."Apellido") "VENDEDOR_NOMBRE", s."NOMBRE_SUCURSAL" FROM "VENTAS" v LEFT JOIN "CLIENTES" c ON c."ID_CLIENTE"=v."ID_CLIENTE" LEFT JOIN "VENDEDORES" ve ON ve."ID_VENDEDOR"=v."ID_VENDEDOR" LEFT JOIN "SUCURSAL" s ON s."SUCURSAL_ID"=v."SUCURSAL_ID"${where} ORDER BY v."FECHA" DESC, v."DOCUMENTO" DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const documents = result.rows.map((row) => row.DOCUMENTO);
    const details = documents.length ? await client.query('SELECT * FROM "DETALLE_VENTA" WHERE "DOCUMENTO" = ANY($1::text[])', [documents]) : { rows: [] };
    return json({ ok: true, data: result.rows, details: details.rows, pagination: { page, pageSize, total: count.rows[0].total, totalPages: Math.max(1, Math.ceil(count.rows[0].total / pageSize)) } });
  } catch (error: any) { return json({ ok: false, error: error?.message ?? 'No se pudieron consultar las ventas' }, 500); }
  finally { client.release(); }
};

export const POST: APIRoute = async ({ request }) => {
  const client = await getPool().connect();
  try {
    const body = await request.json(), lines = body.lines;
    if (!body.ID_CLIENTE || !body.ID_VENDEDOR || !body.SUCURSAL_ID || !['Factura', 'Boleta'].includes(body.TIPO_DOCUMENTO) || !Array.isArray(lines) || !lines.length) return json({ ok: false, error: 'Cliente, vendedor, sucursal, tipo y detalle son obligatorios' }, 400);
    if (lines.some((line: any) => !line.CODIGO_PRODUCTO || !Number.isInteger(Number(line.CANTIDAD)) || Number(line.CANTIDAD) <= 0)) return json({ ok: false, error: 'El detalle contiene cantidades o artículos inválidos' }, 400);
    await client.query('BEGIN');
    const related = await Promise.all([
      client.query('SELECT 1 FROM "CLIENTES" WHERE "ID_CLIENTE"=$1', [body.ID_CLIENTE]),
      client.query('SELECT 1 FROM "VENDEDORES" WHERE "ID_VENDEDOR"=$1', [Number(body.ID_VENDEDOR)]),
      client.query('SELECT 1 FROM "SUCURSAL" WHERE "SUCURSAL_ID"=$1', [Number(body.SUCURSAL_ID)]),
    ]);
    if (related.some((result) => !result.rowCount)) throw new Error('Una entidad relacionada no existe');
    const codes = lines.map((line: any) => String(line.CODIGO_PRODUCTO));
    const products = await client.query('SELECT "CODIGO_PRODUCTO", "PRECIO_UNITARIO" FROM "ARTICULOS" WHERE "CODIGO_PRODUCTO" = ANY($1::text[]) FOR SHARE', [codes]);
    const prices = new Map(products.rows.map((row) => [row.CODIGO_PRODUCTO, Number(row.PRECIO_UNITARIO)]));
    if (prices.size !== new Set(codes).size) throw new Error('Uno o más artículos no existen');
    const details = lines.map((line: any) => { const price = prices.get(String(line.CODIGO_PRODUCTO))!; const quantity = Number(line.CANTIDAD); return { code: String(line.CODIGO_PRODUCTO), quantity, price, total: money(price * quantity) }; });
    const net = money(details.reduce((sum, line) => sum + line.total, 0)), tax = money(net * 0.18), total = money(net + tax);
    const sequence = await client.query("SELECT nextval('samar_documento_venta_seq')::bigint value");
    const document = `VTA-${String(sequence.rows[0].value).padStart(4, '0')}`;
    const sale = await client.query('INSERT INTO "VENTAS" ("DOCUMENTO","FECHA","ID_CLIENTE","TIPO_DOCUMENTO","ID_VENDEDOR","TOTAL_NETO","IMPUESTO","TOTAL_DOCUMENTO","SUCURSAL_ID") VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [document, body.ID_CLIENTE, body.TIPO_DOCUMENTO, Number(body.ID_VENDEDOR), net, tax, total, Number(body.SUCURSAL_ID)]);
    for (const line of details) await client.query('INSERT INTO "DETALLE_VENTA" ("DOCUMENTO","CODIGO_PRODUCTO","PRECIO_UNITARIO","CANTIDAD","TOTAL") VALUES ($1,$2,$3,$4,$5)', [document, line.code, line.price, line.quantity, line.total]);
    await client.query('COMMIT');
    return json({ ok: true, data: { ...sale.rows[0], detalles: details } }, 201);
  } catch (error: any) { await client.query('ROLLBACK').catch(() => undefined); return json({ ok: false, error: error?.code === '23505' ? 'Conflicto de numeración; reintente' : error?.message ?? 'No se pudo registrar la venta' }, error?.code === '23505' ? 409 : 400); }
  finally { client.release(); }
};
