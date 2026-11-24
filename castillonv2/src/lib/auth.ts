import { SignJWT, jwtVerify } from 'jose';
import { getPool } from './db';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'castillonv2_jwt_auth_secret_upsjb_bigdata_2026_gastronomico';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export interface CastillonUser {
  idUsuario: number;
  idEmpleado: number;
  logeo: string;
  nombre: string;
  correo: string;
  cargo: string;
  tipoUsuario: string;
  rolEfectivo: 'ADMINISTRADOR' | 'GERENTE' | 'CHEF' | 'COCINERO' | 'CAJERO' | 'MOZO' | 'OPERARIO' | 'BLOQUEADO';
  labelRol: string;
  vistasPermitidas: string[];
}

export interface AuthResult {
  success: boolean;
  user?: CastillonUser;
  error?: string;
  blocked?: boolean;
}

export function getRoleAndPermissions(cargo: string, tipoUsuario: string) {
  const normCargo = (cargo || '').trim().toLowerCase();
  const normTipo = (tipoUsuario || '').trim().toLowerCase();

  // 1. Personal bloqueado del sistema gastronómico
  if (normCargo.includes('limpieza')) {
    return {
      rolEfectivo: 'BLOQUEADO' as const,
      labelRol: 'Personal de limpieza',
      permitido: false,
      motivoBloqueo: 'Acceso restringido: El personal de limpieza no tiene autorización para interactuar con el sistema del restaurante.',
      vistas: [],
    };
  }

  if (normCargo.includes('delivery')) {
    return {
      rolEfectivo: 'BLOQUEADO' as const,
      labelRol: 'Delivery',
      permitido: false,
      motivoBloqueo: 'Acceso restringido: El personal de despacho/delivery no interactúa con los módulos internos del restaurante.',
      vistas: [],
    };
  }

  // 2. Administrador (Acceso total)
  if (normTipo.includes('admin') || normCargo.includes('admin')) {
    return {
      rolEfectivo: 'ADMINISTRADOR' as const,
      labelRol: 'Administrador del Sistema',
      permitido: true,
      vistas: ['dashboard', 'clientes', 'productos', 'operacion', 'ventas', 'comprobantes', 'finanzas', 'personal', 'ubicacion', 'reportes', 'configuracion'],
    };
  }

  // 3. Gerente
  if (normCargo.includes('gerente') || normTipo.includes('gerente')) {
    return {
      rolEfectivo: 'GERENTE' as const,
      labelRol: 'Gerencia General',
      permitido: true,
      vistas: ['dashboard', 'clientes', 'productos', 'ventas', 'comprobantes', 'finanzas', 'reportes'],
    };
  }

  // 4. Chef
  if (normCargo.includes('chef')) {
    return {
      rolEfectivo: 'CHEF' as const,
      labelRol: 'Chef Ejecutivo',
      permitido: true,
      vistas: ['dashboard', 'productos', 'operacion'],
    };
  }

  // 5. Cocineros
  if (normCargo.includes('cocin')) {
    return {
      rolEfectivo: 'COCINERO' as const,
      labelRol: 'Cocina & Preparación',
      permitido: true,
      vistas: ['dashboard', 'productos', 'operacion'],
    };
  }

  // 6. Cajero o Recepcionista
  if (normTipo.includes('cajer') || normCargo.includes('recepc')) {
    return {
      rolEfectivo: 'CAJERO' as const,
      labelRol: 'Caja & Recepción',
      permitido: true,
      vistas: ['dashboard', 'clientes', 'operacion', 'ventas', 'comprobantes'],
    };
  }

  // 7. Mozo
  if (normCargo.includes('mozo') || normTipo.includes('mozo')) {
    return {
      rolEfectivo: 'MOZO' as const,
      labelRol: 'Mozo / Atención de Salón',
      permitido: true,
      vistas: ['dashboard', 'operacion', 'productos'],
    };
  }

  // Fallback Operario
  return {
    rolEfectivo: 'OPERARIO' as const,
    labelRol: 'Operario',
    permitido: true,
    vistas: ['dashboard', 'operacion'],
  };
}

export async function createSessionToken(user: CastillonUser): Promise<string> {
  return new SignJWT({
    idUsuario: user.idUsuario,
    idEmpleado: user.idEmpleado,
    logeo: user.logeo,
    nombre: user.nombre,
    correo: user.correo,
    cargo: user.cargo,
    tipoUsuario: user.tipoUsuario,
    rolEfectivo: user.rolEfectivo,
    labelRol: user.labelRol,
    vistasPermitidas: user.vistasPermitidas,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<CastillonUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      idUsuario: payload.idUsuario as number,
      idEmpleado: payload.idEmpleado as number,
      logeo: payload.logeo as string,
      nombre: payload.nombre as string,
      correo: payload.correo as string,
      cargo: payload.cargo as string,
      tipoUsuario: payload.tipoUsuario as string,
      rolEfectivo: payload.rolEfectivo as CastillonUser['rolEfectivo'],
      labelRol: payload.labelRol as string,
      vistasPermitidas: (payload.vistasPermitidas as string[]) || [],
    };
  } catch (err) {
    return null;
  }
}

export async function authenticateUser(loginInput: string, passwordInput: string): Promise<AuthResult> {
  const cleanLogin = (loginInput || '').trim();
  const cleanPass = (passwordInput || '').trim();

  if (!cleanLogin || !cleanPass) {
    return { success: false, error: 'Debe ingresar su usuario/correo y contraseña.' };
  }

  // Soporte directo para SuperAdmin maestro
  if (
    (cleanLogin.toLowerCase() === 'admin@castillon.pe' || cleanLogin.toLowerCase() === 'admin') &&
    (cleanPass === 'Admin2026*' || cleanPass === '52142')
  ) {
    const perm = getRoleAndPermissions('Administrador General', 'Administrador');
    return {
      success: true,
      user: {
        idUsuario: 1,
        idEmpleado: 1,
        logeo: 'admin@castillon.pe',
        nombre: 'Administrador Maestro',
        correo: 'admin@castillon.pe',
        cargo: 'Administrador General',
        tipoUsuario: 'Administrador',
        rolEfectivo: perm.rolEfectivo,
        labelRol: perm.labelRol,
        vistasPermitidas: perm.vistas,
      },
    };
  }

  try {
    const pool = getPool();
    // Normalizar formato de correo (reemplazar comas por puntos en caso de typo en DB)
    const normalizedInput = cleanLogin.toLowerCase().replace(/,/g, '.');

    const query = `
      SELECT 
        u."IDUSUARIO", 
        u."LOGEO", 
        u."CLAVE",
        u."ESTADO" as "USER_ESTADO",
        e."IDEMPLEADO", 
        c."NOMCARGO", 
        p."NOMBRES", 
        p."APEPATERNO", 
        p."CORREO",
        tu."NOMUSUARIO" as "NOMTIPO"
      FROM "USUARIO" u
      JOIN "EMPLEADO" e ON u."IDEMPLEADO" = e."IDEMPLEADO"
      JOIN "CARGO" c ON e."IDCARGO" = c."IDCARGO"
      JOIN "PERSONA" p ON e."IDPERSONA" = p."IDPERSONA"
      JOIN "TIPO_USUARIO" tu ON u."IDTIPO_USUARIO" = tu."IDTIPO_USUARIO"
      WHERE LOWER(REPLACE(u."LOGEO", ',', '.')) = $1 
         OR LOWER(p."CORREO") = $1
         OR LOWER(u."LOGEO") = $2
      LIMIT 1;
    `;

    const res = await pool.query(query, [normalizedInput, cleanLogin.toLowerCase()]);

    if (res.rows.length === 0) {
      return { success: false, error: 'Usuario no encontrado en la base de datos de Castillón.' };
    }

    const row = res.rows[0];

    // Verificar si el usuario está activo
    if (row.USER_ESTADO === '0' || row.USER_ESTADO === 'I') {
      return { success: false, error: 'Usuario deshabilitado en el sistema.' };
    }

    // Verificar contraseña (coincidencia con CLAVE o con clave maestra de evaluación)
    const storedPass = String(row.CLAVE || '').trim();
    const isPassValid = storedPass === cleanPass || cleanPass === 'Admin2026*' || cleanPass === '52142';

    if (!isPassValid) {
      return { success: false, error: 'Contraseña incorrecta. Por favor intente nuevamente.' };
    }

    // Evaluar reglas de negocio y perfil de acceso
    const perm = getRoleAndPermissions(row.NOMCARGO, row.NOMTIPO);

    if (!perm.permitido) {
      return {
        success: false,
        blocked: true,
        error: perm.motivoBloqueo || `El cargo de '${row.NOMCARGO}' no tiene autorización de acceso.`,
      };
    }

    const nombreCompleto = `${row.NOMBRES || ''} ${row.APEPATERNO || ''}`.trim() || row.LOGEO;

    const user: CastillonUser = {
      idUsuario: row.IDUSUARIO,
      idEmpleado: row.IDEMPLEADO,
      logeo: row.LOGEO,
      nombre: nombreCompleto,
      correo: row.CORREO || row.LOGEO.replace(/,/g, '.'),
      cargo: row.NOMCARGO,
      tipoUsuario: row.NOMTIPO,
      rolEfectivo: perm.rolEfectivo,
      labelRol: perm.labelRol,
      vistasPermitidas: perm.vistas,
    };

    return { success: true, user };
  } catch (err: any) {
    console.error('[Castillon Auth Error]:', err.message);
    return { success: false, error: 'Error de conexión con la base de datos al autenticar.' };
  }
}
