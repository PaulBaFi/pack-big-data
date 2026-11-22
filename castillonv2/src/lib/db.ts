import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}
