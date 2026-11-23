import pg from 'pg';
const { Pool } = pg;

const DEFAULT_HOST = process.env.AIVEN_HOST || 'pg-3b6cbf3d-cupejoaquin1-a24d.e.aivencloud.com';
const DEFAULT_PORT = process.env.AIVEN_PORT || '16290';
const DEFAULT_USER = process.env.AIVEN_USER || 'avnadmin';
const DEFAULT_PASS = process.env.AIVEN_PASSWORD || '';

export const CONNECTION_STRINGS = {
  castillonv2: process.env.DB_CASTILLONV2 || `postgres://${DEFAULT_USER}:${DEFAULT_PASS}@${DEFAULT_HOST}:${DEFAULT_PORT}/castillonv2`,
  veterinaria: process.env.DB_VETERINARIA || `postgres://${DEFAULT_USER}:${DEFAULT_PASS}@${DEFAULT_HOST}:${DEFAULT_PORT}/castillon_veterinaria`,
  samar: process.env.DB_SAMAR || `postgres://${DEFAULT_USER}:${DEFAULT_PASS}@${DEFAULT_HOST}:${DEFAULT_PORT}/samar_importadora`,
  siga: process.env.DB_SIGA || `postgres://${DEFAULT_USER}:${DEFAULT_PASS}@${DEFAULT_HOST}:${DEFAULT_PORT}/siga_1646`,
  dw_olap: process.env.DB_DW_OLAP || `postgres://${DEFAULT_USER}:${DEFAULT_PASS}@${DEFAULT_HOST}:${DEFAULT_PORT}/dw_empresas_olap`,
};

const pools: Record<string, pg.Pool> = {};

export function getPool(dbKey: keyof typeof CONNECTION_STRINGS = 'dw_olap'): pg.Pool {
  if (!pools[dbKey]) {
    const rawString = CONNECTION_STRINGS[dbKey];
    // Quitar cualquier parametro sslmode en la URL para evitar que sobreescriba rejectUnauthorized: false
    const cleanConnectionString = rawString.replace(/\?.*$/, '');

    pools[dbKey] = new Pool({
      connectionString: cleanConnectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 6,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pools[dbKey].on('error', (err) => {
      console.error(`[PG Pool Error - ${dbKey}]:`, err.message);
    });
  }
  return pools[dbKey];
}

export async function query<T = any>(
  text: string,
  params?: any[],
  dbKey: keyof typeof CONNECTION_STRINGS = 'dw_olap'
): Promise<pg.QueryResult<T>> {
  const pool = getPool(dbKey);
  return pool.query<T>(text, params);
}
