import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { query } from './db';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'super_secret_jwt_key_bigdata_upsjb_2026_olap_admin_secure';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export interface AdminUser {
  id: number;
  email: string;
  nombre: string;
  rol: 'SUPERADMIN' | 'AUDITOR_ETL';
  activo: boolean;
  ultimo_login?: string;
  intentos_fallidos?: number;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export async function createSessionToken(user: AdminUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AdminUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as number,
      email: payload.email as string,
      nombre: payload.nombre as string,
      rol: payload.rol as 'SUPERADMIN' | 'AUDITOR_ETL',
      activo: true,
    };
  } catch (err) {
    return null;
  }
}

export async function ensureSeedAdmin(): Promise<void> {
  try {
    const check = await query('SELECT id FROM admin_usuarios WHERE email = $1 LIMIT 1', ['admin@bigdata.upsjb.edu.pe']);
    if (check.rows.length === 0) {
      const defaultHash = await hashPassword('Admin2026*');
      await query(
        `INSERT INTO admin_usuarios (email, nombre, password_hash, rol, activo)
         VALUES ($1, $2, $3, 'SUPERADMIN', TRUE)
         ON CONFLICT (email) DO NOTHING;`,
        ['admin@bigdata.upsjb.edu.pe', 'Administrador Big Data UPSJB', defaultHash]
      );
      console.log('[Auth] Usuario semilla creado exitosamente: admin@bigdata.upsjb.edu.pe / Admin2026*');
    }
  } catch (err: any) {
    console.error('[Auth] Error asegurando usuario semilla:', err.message);
  }
}

export async function logAdminAction(
  userId: number | null,
  email: string,
  accion: string,
  detalles: any = {},
  ip: string = '127.0.0.1'
): Promise<void> {
  try {
    await query(
      `INSERT INTO admin_audit_logs (id_usuario, email, accion, detalles, ip_address)
       VALUES ($1, $2, $3, $4, $5);`,
      [userId, email, accion, JSON.stringify(detalles), ip]
    );
  } catch (err: any) {
    console.error('[Audit Log Error]:', err.message);
  }
}
