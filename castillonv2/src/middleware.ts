import { defineMiddleware } from 'astro:middleware';
import { verifySessionToken, type CastillonUser } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Rutas públicas que no requieren autenticación
  const isPublicRoute =
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt';

  const sessionCookie = context.cookies.get('castillon_session')?.value;
  let user: CastillonUser | null = null;

  if (sessionCookie) {
    user = await verifySessionToken(sessionCookie);
  }

  // Inyectar usuario en locals para SSR
  if (user) {
    context.locals.user = user;
  }

  if (isPublicRoute) {
    // Si ya tiene sesión activa e intenta entrar a /login, redirigir al sistema
    if (pathname === '/login' && user) {
      return context.redirect('/');
    }
    return next();
  }

  // Si no está autenticado:
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ ok: false, error: 'No autorizado. Debe iniciar sesión.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/login');
  }

  return next();
});
