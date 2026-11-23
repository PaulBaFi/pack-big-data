import { defineMiddleware } from 'astro:middleware';
import { verifySessionToken, ensureSeedAdmin, type AdminUser } from './lib/auth';

let seedChecked = false;

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Asegurar usuario semilla en primera llamada
  if (!seedChecked) {
    seedChecked = true;
    ensureSeedAdmin().catch(console.error);
  }

  // Rutas públicas que no requieren autenticación
  const isPublicRoute =
    pathname === '/login' ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt';

  // Endpoint de cron protegido por CRON_SECRET o sesión
  const isCronRoute = pathname === '/api/etl/cron';

  const sessionCookie = context.cookies.get('admin_session')?.value;
  let user: AdminUser | null = null;

  if (sessionCookie) {
    user = await verifySessionToken(sessionCookie);
  }

  // Asignar usuario a locals para acceso en páginas SSR
  if (user) {
    context.locals.user = user;
  }

  // Permitir cron si tiene el header Bearer CRON_SECRET o si hay usuario
  if (isCronRoute) {
    const authHeader = context.request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'cron_bigdata_secret_2026';
    if (authHeader === `Bearer ${cronSecret}` || user) {
      return next();
    }
  }

  if (isPublicRoute) {
    // Si ya está logueado e intenta ir a /login, redirigir al dashboard
    if (pathname === '/login' && user) {
      return context.redirect('/');
    }
    return next();
  }

  // Si no está autenticado:
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'No autorizado. Debe iniciar sesión.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/login');
  }

  return next();
});
