import type { APIRoute } from 'astro';
import { logAdminAction } from '../../../lib/auth';

export const POST: APIRoute = async ({ cookies, locals }) => {
  const user = locals.user;
  if (user) {
    await logAdminAction(user.id, user.email, 'LOGOUT');
  }

  cookies.delete('admin_session', { path: '/' });

  return new Response(JSON.stringify({ success: true, message: 'Sesión cerrada correctamente' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
