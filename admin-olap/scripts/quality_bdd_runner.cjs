const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', '..');
const evidenceDir = path.join(root, 'evidencias', 'pruebas');
const envFile = path.join(__dirname, '..', '.env');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const at = line.indexOf('=');
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(envFile);

function connectionUrl(value) {
  if (!value) return value;
  const url = new URL(value);
  url.searchParams.delete('sslmode');
  return url.toString();
}
const SOURCE_URL = connectionUrl(process.env.DB_CASTILLONV2);
const DW_URL = connectionUrl(process.env.DB_DW_OLAP);
const runId = `qa_bdd_${Date.now()}_${process.pid}`;
const results = [];
let source;
let dw;

function now() { return new Date().toISOString(); }
function record(id, component, description, status, obtained, evidence = '') {
  results.push({ id, component, description, status, obtained, evidence, executedAt: now() });
}

async function scenario(meta, fn) {
  const started = Date.now();
  try {
    await fn();
    record(meta.id, meta.component, meta.description, 'APROBADO', `Comportamiento verificado en ${Date.now() - started} ms.`);
  } catch (error) {
    record(meta.id, meta.component, meta.description, 'FALLIDO', error.message);
  }
}

async function setup() {
  assert.ok(SOURCE_URL, 'Falta DB_CASTILLONV2 en admin-olap/.env');
  assert.ok(DW_URL, 'Falta DB_DW_OLAP en admin-olap/.env');
  source = new Pool({ connectionString: SOURCE_URL, max: 2, ssl: { rejectUnauthorized: false } });
  dw = new Pool({ connectionString: DW_URL, max: 2, ssl: { rejectUnauthorized: false } });
  await source.query(`CREATE SCHEMA ${runId}`);
  await dw.query(`CREATE SCHEMA ${runId}`);
  await source.query(`
    CREATE TABLE ${runId}.clientes (id integer PRIMARY KEY, nombre text NOT NULL);
    CREATE TABLE ${runId}.ventas (
      id integer PRIMARY KEY,
      cliente_id integer NOT NULL REFERENCES ${runId}.clientes(id),
      documento text NOT NULL UNIQUE,
      fecha date NOT NULL,
      subtotal numeric(12,2), impuesto numeric(12,2), total numeric(12,2),
      categoria text, version integer NOT NULL DEFAULT 0
    );
    INSERT INTO ${runId}.clientes VALUES (1, 'Cliente QA');
  `);
  await dw.query(`
    CREATE TABLE ${runId}.dim_tiempo (id_tiempo integer PRIMARY KEY, fecha date UNIQUE NOT NULL, anio integer, mes integer);
    CREATE TABLE ${runId}.dim_cliente (id_cliente integer PRIMARY KEY, nombre text NOT NULL);
    CREATE TABLE ${runId}.fact_ventas (
      id_hecho bigserial PRIMARY KEY,
      id_origen integer UNIQUE NOT NULL,
      id_tiempo integer NOT NULL REFERENCES ${runId}.dim_tiempo(id_tiempo),
      id_cliente integer NOT NULL REFERENCES ${runId}.dim_cliente(id_cliente),
      documento text NOT NULL,
      categoria text NOT NULL,
      monto_total numeric(12,2) NOT NULL CHECK (monto_total >= 0)
    );
  `);
}

async function clean() {
  if (source) {
    try { await source.query(`DROP SCHEMA IF EXISTS ${runId} CASCADE`); } finally { await source.end(); }
  }
  if (dw) {
    try { await dw.query(`DROP SCHEMA IF EXISTS ${runId} CASCADE`); } finally { await dw.end(); }
  }
}

async function seedEtlSource() {
  await source.query(`DELETE FROM ${runId}.ventas`);
  await source.query(`INSERT INTO ${runId}.ventas
    (id, cliente_id, documento, fecha, subtotal, impuesto, total, categoria) VALUES
    (101,1,' QA-001 ','2026-11-24',100,18,118,' retail '),
    (102,1,'QA-002','2026-11-24',50,NULL,NULL,NULL)`);
}

function transform(row) {
  const subtotal = Number(row.subtotal || 0);
  const impuesto = Number(row.impuesto || 0);
  const fecha = row.fecha instanceof Date ? row.fecha.toISOString().slice(0, 10) : String(row.fecha).slice(0, 10);
  return {
    ...row,
    documento: String(row.documento).trim().toUpperCase(),
    categoria: String(row.categoria || 'SIN_CATEGORIA').trim().toUpperCase(),
    total: row.total == null ? subtotal + impuesto : Number(row.total),
    fecha,
    idTiempo: Number(fecha.replaceAll('-', '')),
  };
}

async function loadDw(rows) {
  for (const raw of rows) {
    const r = transform(raw);
    await dw.query(`INSERT INTO ${runId}.dim_tiempo VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [r.idTiempo, r.fecha, Number(String(r.fecha).slice(0, 4)), Number(String(r.fecha).slice(5, 7))]);
    await dw.query(`INSERT INTO ${runId}.dim_cliente VALUES ($1,$2) ON CONFLICT DO NOTHING`, [r.cliente_id, 'CLIENTE QA']);
    await dw.query(`INSERT INTO ${runId}.fact_ventas
      (id_origen,id_tiempo,id_cliente,documento,categoria,monto_total) VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (id_origen) DO UPDATE SET documento=EXCLUDED.documento,categoria=EXCLUDED.categoria,monto_total=EXCLUDED.monto_total`,
      [r.id, r.idTiempo, r.cliente_id, r.documento, r.categoria, r.total]);
  }
}

async function run() {
  await setup();

  await scenario({ id:'OLTP-001', component:'OLTP', description:'Inserción de una venta válida' }, async () => {
    await source.query(`INSERT INTO ${runId}.ventas VALUES (1,1,'V-1','2026-11-24',10,1.8,11.8,'A',0)`);
    assert.equal(Number((await source.query(`SELECT count(*) c FROM ${runId}.ventas WHERE id=1`)).rows[0].c), 1);
  });
  await scenario({ id:'OLTP-002', component:'OLTP', description:'Actualización persistente de una venta' }, async () => {
    await source.query(`UPDATE ${runId}.ventas SET total=20, version=version+1 WHERE id=1`);
    assert.equal(Number((await source.query(`SELECT total FROM ${runId}.ventas WHERE id=1`)).rows[0].total), 20);
  });
  await scenario({ id:'OLTP-003', component:'OLTP', description:'Eliminación de una venta' }, async () => {
    await source.query(`DELETE FROM ${runId}.ventas WHERE id=1`);
    assert.equal(Number((await source.query(`SELECT count(*) c FROM ${runId}.ventas WHERE id=1`)).rows[0].c), 0);
  });
  await scenario({ id:'OLTP-004', component:'OLTP', description:'Rollback de una transacción fallida' }, async () => {
    const c = await source.connect();
    try { await c.query('BEGIN'); await c.query(`INSERT INTO ${runId}.ventas VALUES (2,1,'V-2','2026-11-24',10,1.8,11.8,'A',0)`); await c.query('ROLLBACK'); }
    finally { c.release(); }
    assert.equal(Number((await source.query(`SELECT count(*) c FROM ${runId}.ventas WHERE id=2`)).rows[0].c), 0);
  });
  await scenario({ id:'OLTP-005', component:'OLTP', description:'Rechazo de una clave foránea inexistente' }, async () => {
    await assert.rejects(source.query(`INSERT INTO ${runId}.ventas VALUES (3,999,'V-3','2026-11-24',10,1.8,11.8,'A',0)`), /foreign key/i);
  });
  await scenario({ id:'OLTP-006', component:'OLTP', description:'Serialización de actualizaciones concurrentes' }, async () => {
    await source.query(`INSERT INTO ${runId}.ventas VALUES (4,1,'V-4','2026-11-24',10,1.8,11.8,'A',0)`);
    await Promise.all(Array.from({length:10}, () => source.query(`UPDATE ${runId}.ventas SET version=version+1 WHERE id=4`)));
    assert.equal(Number((await source.query(`SELECT version FROM ${runId}.ventas WHERE id=4`)).rows[0].version), 10);
  });

  await seedEtlSource();
  await scenario({ id:'ETL-001', component:'ETL', description:'Extracción de registros de la fuente' }, async () => {
    assert.equal((await source.query(`SELECT * FROM ${runId}.ventas ORDER BY id`)).rowCount, 2);
  });
  await scenario({ id:'ETL-002', component:'ETL', description:'Limpieza de espacios y normalización de texto' }, async () => {
    const r = transform((await source.query(`SELECT * FROM ${runId}.ventas WHERE id=101`)).rows[0]); assert.equal(r.documento, 'QA-001');
  });
  await scenario({ id:'ETL-003', component:'ETL', description:'Carga idempotente sin duplicados' }, async () => {
    const rows=(await source.query(`SELECT * FROM ${runId}.ventas`)).rows; await loadDw(rows); await loadDw(rows);
    assert.equal(Number((await dw.query(`SELECT count(*) c FROM ${runId}.fact_ventas`)).rows[0].c), 2);
  });
  await scenario({ id:'ETL-004', component:'ETL', description:'Tratamiento de valores nulos' }, async () => {
    const r=transform((await source.query(`SELECT * FROM ${runId}.ventas WHERE id=102`)).rows[0]); assert.equal(r.categoria,'SIN_CATEGORIA'); assert.equal(r.total,50);
  });
  await scenario({ id:'ETL-005', component:'ETL', description:'Transformación de fecha a clave dimensional' }, async () => {
    const r=transform((await source.query(`SELECT * FROM ${runId}.ventas WHERE id=101`)).rows[0]); assert.equal(r.idTiempo,20261124);
  });
  await scenario({ id:'ETL-006', component:'ETL', description:'Carga de dimensiones y hechos' }, async () => {
    assert.equal(Number((await dw.query(`SELECT count(*) c FROM ${runId}.dim_tiempo`)).rows[0].c),1); assert.equal(Number((await dw.query(`SELECT count(*) c FROM ${runId}.fact_ventas`)).rows[0].c),2);
  });

  await scenario({ id:'DW-001', component:'Data Warehouse', description:'Conteo de registros cargados' }, async()=>assert.equal(Number((await dw.query(`SELECT count(*) c FROM ${runId}.fact_ventas`)).rows[0].c),2));
  await scenario({ id:'DW-002', component:'Data Warehouse', description:'Integridad referencial del esquema estrella' }, async()=>assert.equal(Number((await dw.query(`SELECT count(*) c FROM ${runId}.fact_ventas f LEFT JOIN ${runId}.dim_tiempo t USING(id_tiempo) LEFT JOIN ${runId}.dim_cliente c USING(id_cliente) WHERE t.id_tiempo IS NULL OR c.id_cliente IS NULL`)).rows[0].c),0));
  await scenario({ id:'DW-003', component:'Data Warehouse', description:'Atributos válidos en dimensiones' }, async()=>assert.equal(Number((await dw.query(`SELECT count(*) c FROM ${runId}.dim_tiempo WHERE anio<>2026 OR mes<>11`)).rows[0].c),0));
  await scenario({ id:'DW-004', component:'Data Warehouse', description:'Medidas válidas en tabla de hechos' }, async()=>assert.equal(Number((await dw.query(`SELECT count(*) c FROM ${runId}.fact_ventas WHERE monto_total<0 OR monto_total IS NULL`)).rows[0].c),0));
  await scenario({ id:'DW-005', component:'Data Warehouse', description:'Consistencia entre detalle y total almacenado' }, async()=>assert.equal(Number((await dw.query(`SELECT sum(monto_total) total FROM ${runId}.fact_ventas`)).rows[0].total),168));

  await scenario({ id:'OLAP-001', component:'OLAP', description:'Agregación SUM de ventas' }, async()=>assert.equal(Number((await dw.query(`SELECT sum(monto_total) total FROM ${runId}.fact_ventas`)).rows[0].total),168));
  await scenario({ id:'OLAP-002', component:'OLAP', description:'Filtro por categoría normalizada' }, async()=>assert.equal(Number((await dw.query(`SELECT count(*) c FROM ${runId}.fact_ventas WHERE categoria='RETAIL'`)).rows[0].c),1));
  await scenario({ id:'OLAP-003', component:'OLAP', description:'Consulta multidimensional por tiempo y categoría' }, async()=>assert.equal((await dw.query(`SELECT t.anio,t.mes,f.categoria,sum(f.monto_total) FROM ${runId}.fact_ventas f JOIN ${runId}.dim_tiempo t USING(id_tiempo) GROUP BY t.anio,t.mes,f.categoria`)).rowCount,2));
  await scenario({ id:'OLAP-004', component:'OLAP', description:'Drill-down anual a mensual' }, async()=>assert.equal((await dw.query(`SELECT t.mes,sum(f.monto_total) FROM ${runId}.fact_ventas f JOIN ${runId}.dim_tiempo t USING(id_tiempo) WHERE t.anio=2026 GROUP BY t.mes`)).rows[0].mes,11));
  await scenario({ id:'OLAP-005', component:'OLAP', description:'Conciliación de conteos y montos' }, async()=>{
    const s=(await source.query(`SELECT count(*) c,sum(COALESCE(total,subtotal+COALESCE(impuesto,0))) total FROM ${runId}.ventas`)).rows[0]; const d=(await dw.query(`SELECT count(*) c,sum(monto_total) total FROM ${runId}.fact_ventas`)).rows[0]; assert.equal(Number(s.c),Number(d.c)); assert.equal(Number(s.total),Number(d.total));
  });
}

async function main() {
  fs.mkdirSync(evidenceDir, { recursive: true });
  let fatal;
  try { await run(); } catch (e) { fatal = e; } finally { try { await clean(); } catch (e) { fatal ||= e; } }
  const artifact = { runId, startedWithControlledSchemas: true, generatedAt: now(), fatalError: fatal?.message || null, results };
  const out = path.join(evidenceDir, 'resultados_automatizados.json');
  fs.writeFileSync(out, JSON.stringify(artifact, null, 2));
  for (const r of results) console.log(`${r.status === 'APROBADO' ? 'PASS' : 'FAIL'} ${r.id} ${r.description}: ${r.obtained}`);
  console.log(`Evidencia: ${path.relative(root, out)}`);
  if (fatal || results.some(r => r.status === 'FALLIDO')) process.exitCode = 1;
}

main();
