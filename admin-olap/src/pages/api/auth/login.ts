import type { APIRoute } from 'astro';
import { query } from '../../../lib/db';
import { comparePassword, createSessionToken, logAdminAction } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email y contraseña requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Buscar usuario en admin_usuarios
    const res = await query(
      `SELECT id, email, nombre, password_hash, rol, activo, intentos_fallidos, bloqueado_hasta 
       FROM admin_usuarios 
       WHERE email = $1 LIMIT 1;`,
      [cleanEmail],
      'dw_olap'
    );

    if (res.rows.length === 0) {
      await logAdminAction(null, cleanEmail, 'LOGIN_FAILED', { reason: 'Usuario no encontrado' });
      return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = res.rows[0];

    if (!user.activo) {
      return new Response(JSON.stringify({ error: 'Cuenta deshabilitada. Contacte al administrador.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar si está bloqueado temporalmente por intentos fallidos
    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
      return new Response(JSON.stringify({ error: 'Cuenta bloqueada temporalmente por exceso de intentos.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      const intentos = (user.intentos_fallidos || 0) + 1;
      let bloqueo: string | null = null;
      if (intentos >= 5) {
        bloqueo = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      await query(
        `UPDATE admin_usuarios 
         SET intentos_fallidos = $1, bloqueado_hasta = $2 
         WHERE id = $3;`,
        [intentos, bloqueo, user.id],
        'dw_olap'
      );
      await logAdminAction(user.id, cleanEmail, 'LOGIN_FAILED', { reason: 'Password incorrecto', intentos });
      return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Login Exitoso: Resetear intentos y actualizar ultimo_login
    await query(
      `UPDATE admin_usuarios 
       SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_login = NOW() 
       WHERE id = $1;`,
      [user.id],
      'dw_olap'
    );

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      activo: user.activo,
    });

    // Guardar cookie HttpOnly segura
    cookies.set('admin_session', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 horas
    });

    await logAdminAction(user.id, cleanEmail, 'LOGIN_SUCCESS', { rol: user.rol });

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Login API Error]:', err.message);
    return new Response(JSON.stringify({ error: 'Error interno de autenticación' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
