import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete('castillon_session', { path: '/' });
  return new Response(JSON.stringify({ ok: true, message: 'Sesión cerrada correctamente' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('castillon_session', { path: '/' });
  return redirect('/login');
};
