import pg from 'pg';
const { Pool } = pg;

// Cargar archivo .env en desarrollo local si no estan seteadas en process.env
if (!process.env.DB_DW_OLAP) {
  try {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile();
    }
  } catch (e) {
    // Ignorar en entornos de produccion (Vercel) donde las variables vienen inyectadas
  }
}

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

    // Optimizacion serverless estricta para clúster con 12 conexiones maximas disponibles
    pools[dbKey] = new Pool({
      connectionString: cleanConnectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 1, // Maximo 1 conexion por pool en serverless
      idleTimeoutMillis: 1000, // Cerrar conexion inactiva inmediatamente tras 1 segundo
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

export async function closePool(dbKey: keyof typeof CONNECTION_STRINGS): Promise<void> {
  if (pools[dbKey]) {
    try {
      await pools[dbKey].end();
    } catch (e) {
      // Ignorar error al cerrar
    }
    delete pools[dbKey];
  }
}

export async function closeAllPools(): Promise<void> {
  const keys = Object.keys(pools) as (keyof typeof CONNECTION_STRINGS)[];
  for (const k of keys) {
    await closePool(k);
  }
}
