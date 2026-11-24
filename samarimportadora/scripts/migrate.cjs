const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const at = line.indexOf('=');
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] ||= value;
  }
}

const projectRoot = path.resolve(__dirname, '..');
loadEnv(path.join(projectRoot, '.env'));
loadEnv(path.join(projectRoot, '..', 'admin-olap', '.env'));

const rawUrl = process.env.DATABASE_URL || process.env.DB_SAMAR;
if (!rawUrl) throw new Error('Configura DATABASE_URL (o DB_SAMAR en desarrollo)');
const url = new URL(rawUrl);
url.searchParams.delete('sslmode');

const sequences = [
  'samar_cliente_seq', 'samar_articulo_seq', 'samar_vendedor_seq',
  'samar_region_seq', 'samar_provincia_seq', 'samar_comuna_seq',
  'samar_sucursal_seq', 'samar_cliente_buey_seq', 'samar_prospecto_seq',
  'samar_documento_venta_seq',
];

async function main() {
  const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false }, max: 1 });
  try {
    const before = await pool.query(
      'SELECT name, to_regclass(name) IS NOT NULL AS exists FROM unnest($1::text[]) AS name ORDER BY name',
      [sequences],
    );
    const missing = before.rows.filter((row) => !row.exists).map((row) => row.name);
    console.log(`Secuencias presentes: ${sequences.length - missing.length}/${sequences.length}`);
    if (missing.length) console.log(`Faltantes: ${missing.join(', ')}`);
    if (process.argv.includes('--check')) {
      if (missing.length) process.exitCode = 1;
      return;
    }
    const sql = fs.readFileSync(path.join(projectRoot, 'migrations', '001_samar_sequences.sql'), 'utf8');
    await pool.query(sql);
    const after = await pool.query(
      'SELECT count(*)::int AS count FROM unnest($1::text[]) AS name WHERE to_regclass(name) IS NOT NULL',
      [sequences],
    );
    if (after.rows[0].count !== sequences.length) throw new Error('La migración no creó todas las secuencias');
    console.log(`Migración aplicada: ${after.rows[0].count}/${sequences.length} secuencias verificadas.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
