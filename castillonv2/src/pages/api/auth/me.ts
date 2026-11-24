import type { APIRoute } from 'astro';
import { verifySessionToken } from '@/lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const sessionCookie = cookies.get('castillon_session')?.value;
  if (!sessionCookie) {
    return new Response(JSON.stringify({ ok: false, user: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = await verifySessionToken(sessionCookie);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, user: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
