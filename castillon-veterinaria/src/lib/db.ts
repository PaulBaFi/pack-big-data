import pg from 'pg';
const { Pool } = pg;

let pool: pg.Pool | null = null;

function sanitizeConnectionString(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    u.searchParams.delete('sslmode');
    return u.toString();
  } catch {
    return urlStr.replace(/[?&]sslmode=[^&]+/g, '').replace(/\?&/, '?').replace(/\?$/, '');
  }
}

export function getPool(): pg.Pool {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  if (!pool) {
    const connectionString = sanitizeConnectionString(raw);
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 1,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}
