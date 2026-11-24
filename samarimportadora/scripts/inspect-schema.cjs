const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

function load(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const at = line.indexOf('=');
    let value = line.slice(at + 1).trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    process.env[line.slice(0, at).trim()] ||= value;
  }
}
const root = path.resolve(__dirname, '..');
load(path.join(root, '.env'));
load(path.join(root, '..', 'admin-olap', '.env'));
const raw = process.env.DATABASE_URL || process.env.DB_SAMAR;
if (!raw) throw new Error('Configura DATABASE_URL o DB_SAMAR');
const url = new URL(raw); url.searchParams.delete('sslmode');
const pool = new Pool({ connectionString:url.toString(), ssl:{rejectUnauthorized:false}, max:1 });
pool.query(`
  SELECT table_name,column_name,data_type,numeric_precision,numeric_scale
  FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name IN ('VENTAS','DETALLE_VENTA','ARTICULOS')
    AND column_name IN ('TOTAL_NETO','IMPUESTO','TOTAL_DOCUMENTO','PRECIO_UNITARIO','CANTIDAD','TOTAL')
  ORDER BY table_name,ordinal_position
`).then(result => console.table(result.rows)).finally(() => pool.end());
