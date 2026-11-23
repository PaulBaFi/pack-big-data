const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.AIVEN_HOST || 'pg-3b6cbf3d-cupejoaquin1-a24d.e.aivencloud.com',
  port: parseInt(process.env.AIVEN_PORT || '16290', 10),
  user: process.env.AIVEN_USER || 'avnadmin',
  password: process.env.AIVEN_PASSWORD || '',
  database: 'dw_empresas_olap',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const hash = await bcrypt.hash('Admin2026*', 10);
  await pool.query(
    `INSERT INTO admin_usuarios (email, nombre, password_hash, rol, activo)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET password_hash = $3;`,
    ['admin@bigdata.upsjb.edu.pe', 'Administrador Big Data UPSJB', hash, 'SUPERADMIN', true]
  );
  const res = await pool.query('SELECT id, email, nombre, rol, activo FROM admin_usuarios;');
  console.log('Usuario Semilla Creado:', res.rows);
  await pool.end();
}

main().catch(console.error);
