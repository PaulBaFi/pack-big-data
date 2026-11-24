import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
import { ENTITIES, isEntityName, type EntityDefinition } from '@/lib/entities';
export const prerender = false;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
const relations: Record<string, Record<string, [string, string]>> = {
  provincias: { REGION_ID: ['REGION', 'REGION_ID'] },
  comunas: { PROVINCIA_ID: ['PROVINCIA', 'PROVINCIA_ID'] },
  sucursales: { COMUNA_ID: ['COMUNA', 'COMUNA_ID'] },
};
async function validateRelations(queryable: { query: (text: string, values?: any[]) => Promise<any> }, entity: string, row: Record<string, unknown>) {
  for (const [field, [table, key]] of Object.entries(relations[entity] ?? {})) {
    if (row[field] === null || row[field] === undefined) continue;
    const result = await queryable.query(`SELECT 1 FROM ${quote(table)} WHERE ${quote(key)} = $1`, [row[field]]);
    if (!result.rowCount) throw new Error(`${field} no corresponde a un registro existente`);
  }
}

function cleanRow(def: EntityDefinition, input: unknown, editing = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('El registro no es válido');
  const source = input as Record<string, unknown>, row: Record<string, string | number | null> = {};
  for (const [name, type] of Object.entries(def.fields)) {
    if (!editing && name === def.primaryKey && def.generatedKey) continue;
    if (!(name in source)) continue;
    const raw = source[name];
    if (raw === '' || raw === null || raw === undefined) { row[name] = null; continue; }
    if (type === 'string') row[name] = String(raw).trim();
    else { const value = Number(raw); if (!Number.isFinite(value) || (type === 'integer' && !Number.isInteger(value))) throw new Error(`${name} debe ser numérico`); row[name] = value; }
  }
  for (const name of def.required) if (row[name] === null || row[name] === undefined || row[name] === '') throw new Error(`${name} es obligatorio`);
  return row;
}
async function generatedId(client: import('pg').PoolClient, def: EntityDefinition) {
  const config = def.generatedKey!;
  const result = await client.query('SELECT nextval($1::regclass)::bigint AS value', [config.sequence]);
  const value = String(result.rows[0].value);
  return config.prefix ? `${config.prefix}${value.padStart(config.width ?? 0, '0')}` : Number(value);
}
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url), table = url.searchParams.get('table');
    if (!table || table === 'all') {
      const client = await getPool().connect();
      try {
        const clientes = (await client.query('SELECT * FROM "CLIENTES" ORDER BY "ID_CLIENTE" LIMIT 100')).rows;
        const articulos = (await client.query('SELECT * FROM "ARTICULOS" ORDER BY "CODIGO_PRODUCTO" LIMIT 100')).rows;
        const vendedores = (await client.query('SELECT * FROM "VENDEDORES" ORDER BY "ID_VENDEDOR" LIMIT 100')).rows;
        const sucursales = (await client.query('SELECT * FROM "SUCURSAL" ORDER BY "SUCURSAL_ID" LIMIT 100')).rows;
        const regiones = (await client.query('SELECT * FROM "REGION" ORDER BY "REGION_ID" LIMIT 100')).rows;
        const provincias = (await client.query('SELECT * FROM "PROVINCIA" ORDER BY "PROVINCIA_ID" LIMIT 100')).rows;
        const comunas = (await client.query('SELECT * FROM "COMUNA" ORDER BY "COMUNA_ID" LIMIT 100')).rows;
        const clientesBuey = (await client.query('SELECT * FROM "ClientesBuey" ORDER BY "ID_CLIENTE" LIMIT 100')).rows;
        const prospectos = (await client.query('SELECT * FROM "ProspectosClientesBuey" ORDER BY "NRO_CLIENTE" LIMIT 100')).rows;
        const ventas = (await client.query(`SELECT v.*, concat_ws(' ', c."NOMBRE", c."APELLIDO") "CLIENTE_NOMBRE", concat_ws(' ', ve."Nombre", ve."Apellido") "VENDEDOR_NOMBRE", s."NOMBRE_SUCURSAL" FROM "VENTAS" v LEFT JOIN "CLIENTES" c ON c."ID_CLIENTE"=v."ID_CLIENTE" LEFT JOIN "VENDEDORES" ve ON ve."ID_VENDEDOR"=v."ID_VENDEDOR" LEFT JOIN "SUCURSAL" s ON s."SUCURSAL_ID"=v."SUCURSAL_ID" ORDER BY v."FECHA" DESC, v."DOCUMENTO" DESC LIMIT 100`)).rows;
        const docs = ventas.map((v: any) => v.DOCUMENTO);
        const detalleVentas = docs.length ? (await client.query('SELECT * FROM "DETALLE_VENTA" WHERE "DOCUMENTO" = ANY($1::text[])', [docs])).rows : [];

        return json({
          ok: true,
          all: true,
          data: {
            clientes,
            articulos,
            vendedores,
            sucursales,
            regiones,
            provincias,
            comunas,
            clientesBuey,
            prospectos,
            ventas,
            detalleVentas,
          }
        });
      } finally {
        client.release();
      }
    }
    if (!isEntityName(table)) return json({ ok: false, error: 'Entidad no permitida' }, 400);
    const def = ENTITIES[table], page = Math.max(1, Number(url.searchParams.get('page')) || 1), pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 25)), search = (url.searchParams.get('search') ?? '').trim();
    const values: unknown[] = [];
    let where = '';
    if (search) { values.push(`%${search}%`); where = ` WHERE (${def.searchable.map((c) => `${quote(c)}::text ILIKE $1`).join(' OR ')})`; }
    const count = await getPool().query(`SELECT count(*)::int AS total FROM ${quote(def.table)}${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const rows = await getPool().query(`SELECT * FROM ${quote(def.table)}${where} ORDER BY ${quote(def.primaryKey)} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return json({ ok: true, data: rows.rows, pagination: { page, pageSize, total: count.rows[0].total, totalPages: Math.max(1, Math.ceil(count.rows[0].total / pageSize)) } });
  } catch (error) { console.error(error); return json({ ok: false, error: error instanceof Error ? error.message : 'Error de base de datos' }, 500); }
};
export const POST: APIRoute = async ({ request }) => {
  const client = await getPool().connect();
  try {
    const body = await request.json(), table: unknown = body.table;
    if (!isEntityName(table)) return json({ ok: false, error: 'Entidad no permitida' }, 400);
    const def = ENTITIES[table], row = cleanRow(def, body.row);
    await client.query('BEGIN');
    await validateRelations(client, table, row);
    if (def.generatedKey) row[def.primaryKey] = await generatedId(client, def);
    const keys = Object.keys(row);
    const result = await client.query(`INSERT INTO ${quote(def.table)} (${keys.map(quote).join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, keys.map((key) => row[key]));
    await client.query('COMMIT');
    return json({ ok: true, data: result.rows[0] }, 201);
  } catch (error: any) { await client.query('ROLLBACK').catch(() => undefined); return json({ ok: false, error: error?.code === '23505' ? 'El registro ya existe' : error?.message ?? 'No se pudo guardar' }, error?.code === '23505' ? 409 : 400); }
  finally { client.release(); }
};
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const body = await request.json(), table: unknown = body.table;
    if (!isEntityName(table)) return json({ ok: false, error: 'Entidad no permitida' }, 400);
    const def = ENTITIES[table], id = body.id;
    if (id === undefined || id === null || id === '') return json({ ok: false, error: 'Identificador requerido' }, 400);
    const row = cleanRow(def, body.row, true); delete row[def.primaryKey];
    await validateRelations(getPool(), table, row);
    const keys = Object.keys(row); if (!keys.length) return json({ ok: false, error: 'No hay campos para actualizar' }, 400);
    const values: any[] = keys.map((key) => row[key]); values.push(id);
    const result = await getPool().query(`UPDATE ${quote(def.table)} SET ${keys.map((key, i) => `${quote(key)} = $${i + 1}`).join(', ')} WHERE ${quote(def.primaryKey)} = $${values.length} RETURNING *`, values);
    if (!result.rowCount) return json({ ok: false, error: 'Registro no encontrado' }, 404);
    return json({ ok: true, data: result.rows[0] });
  } catch (error: any) { return json({ ok: false, error: error?.code === '23505' ? 'El registro ya existe' : error?.message ?? 'No se pudo actualizar' }, error?.code === '23505' ? 409 : 400); }
};
