const { Pool } = require('pg');

const DEFAULT_HOST = process.env.AIVEN_HOST || 'pg-3b6cbf3d-cupejoaquin1-a24d.e.aivencloud.com';
const DEFAULT_PORT = parseInt(process.env.AIVEN_PORT || '16290', 10);
const DEFAULT_USER = process.env.AIVEN_USER || 'avnadmin';
const DEFAULT_PASS = process.env.AIVEN_PASSWORD || '';

const dbs = ['castillonv2', 'castillon_veterinaria', 'samar_importadora', 'siga_1646', 'dw_empresas_olap'];

async function testConnections() {
  console.log('--- Probando Conexiones a las 5 Bases de Datos en Aiven Cloud ---');
  for (const db of dbs) {
    const pool = new Pool({
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      user: DEFAULT_USER,
      password: DEFAULT_PASS,
      database: db,
      ssl: { rejectUnauthorized: false }
    });
    try {
      const t0 = Date.now();
      const res = await pool.query('SELECT 1 as ping, current_database() as db;');
      const elapsed = Date.now() - t0;
      console.log(`[OK] Base de Datos '${res.rows[0].db}' conectada en ${elapsed}ms.`);
    } catch (e) {
      console.error(`[ERROR] Base de Datos '${db}':`, e.message);
    } finally {
      await pool.end();
    }
  }

  // Verificar estado del Data Warehouse
  console.log('\n--- Verificando Hechos en DW_Empresas_OLAP ---');
  const dwPool = new Pool({
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    user: DEFAULT_USER,
    password: DEFAULT_PASS,
    database: 'dw_empresas_olap',
    ssl: { rejectUnauthorized: false }
  });

  const priv = await dwPool.query('SELECT count(*) as cnt, sum(monto_total) as tot FROM fact_ventas_privadas;');
  const pub = await dwPool.query('SELECT count(*) as cnt, sum(monto_adjudicado) as tot FROM fact_compras_estatales;');
  const users = await dwPool.query('SELECT email, nombre, rol FROM admin_usuarios;');

  console.log(`Ventas Privadas (Micro + Mediana + Grande): ${priv.rows[0].cnt} hechos, S/ ${priv.rows[0].tot}`);
  console.log(`Compras Estatales (SIGA MEF): ${pub.rows[0].cnt} hechos, S/ ${pub.rows[0].tot}`);
  console.log('Usuarios Administradores Registrados:', users.rows);

  await dwPool.end();
}

testConnections().catch(console.error);
